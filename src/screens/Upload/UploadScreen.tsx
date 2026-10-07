// by Cleyvin

import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../../store/AppContext';
import { describeError, getPlatforms, startScan, uploadRom, UploadSource } from '../../api';
import { queryKeys } from '../../api/queryClient';
import { SCOPES } from '../../constants';
import { Platform } from '../../types';
import { formatFileSize, platformName } from '../../utils';
import { spacing, borderRadius, fontSize } from '../../theme';
import ScreenHeader from '../../components/common/ScreenHeader';
import SearchBar from '../../components/common/SearchBar';
import ErrorState from '../../components/common/ErrorState';
import LoadingScreen from '../../components/common/LoadingScreen';

type UploadState = { status: 'pending' | 'uploading' | 'done' | 'failed'; progress: number; error?: string };

const UploadScreen = () => {
  const { colors, can } = useApp();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const platformsQuery = useQuery({ queryKey: queryKeys.platforms, queryFn: getPlatforms });

  const [platformSearch, setPlatformSearch] = useState('');
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [files, setFiles] = useState<UploadSource[]>([]);
  const [states, setStates] = useState<Record<string, UploadState>>({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const platforms = useMemo(() => {
    const term = platformSearch.trim().toLowerCase();
    return [...(platformsQuery.data ?? [])]
      .filter((item) => !term || platformName(item).toLowerCase().includes(term) || item.fs_slug.includes(term))
      .sort((a, b) => platformName(a).localeCompare(platformName(b)));
  }, [platformsQuery.data, platformSearch]);

  const pickFiles = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', multiple: true, copyToCacheDirectory: true });
      if (result.canceled) return;
      const picked = result.assets.map((asset) => ({ uri: asset.uri, name: asset.name, size: asset.size ?? 0 }));
      setFiles((current) => [...current.filter((file) => !picked.some((p) => p.name === file.name)), ...picked]);
      setNotice(null);
    } catch (err) {
      setNotice({ ok: false, text: describeError(err, 'Could not open the file picker') });
    }
  };

  const removeFile = (name: string) => {
    setFiles((current) => current.filter((file) => file.name !== name));
    setStates(({ [name]: _removed, ...rest }) => rest);
  };

  const handleUpload = async () => {
    if (!platform || files.length === 0) return;
    setBusy(true);
    setNotice(null);

    const queue = files.filter((file) => states[file.name]?.status !== 'done');
    let uploaded = 0;
    for (const file of queue) {
      setStates((current) => ({ ...current, [file.name]: { status: 'uploading', progress: 0 } }));
      try {
        await uploadRom(platform.id, file, (progress) =>
          setStates((current) => ({ ...current, [file.name]: { status: 'uploading', progress } })),
        );
        uploaded++;
        setStates((current) => ({ ...current, [file.name]: { status: 'done', progress: 1 } }));
      } catch (err) {
        setStates((current) => ({
          ...current,
          [file.name]: { status: 'failed', progress: 0, error: describeError(err, 'Upload failed') },
        }));
      }
    }

    if (uploaded > 0) {
      // Uploaded files only become ROMs once the platform is scanned.
      let scanNote = 'Ask an admin to scan the library so they show up.';
      if (can(SCOPES.TASKS_RUN)) {
        try {
          await startScan([platform.id]);
          scanNote = `${platformName(platform)} is being scanned; they will show up shortly.`;
        } catch {
          scanNote = 'Scan the library from the home screen so they show up.';
        }
      }
      queryClient.invalidateQueries();
      const failed = queue.length - uploaded;
      setNotice({
        ok: failed === 0,
        text: `${uploaded} file${uploaded === 1 ? '' : 's'} uploaded${failed ? `, ${failed} failed` : ''}. ${scanNote}`,
      });
    } else {
      setNotice({ ok: false, text: 'Nothing was uploaded. Check the errors below and try again.' });
    }
    setBusy(false);
  };

  const allDone = files.length > 0 && files.every((file) => states[file.name]?.status === 'done');
  const canUpload = !!platform && files.length > 0 && !busy && !allDone;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Upload ROMs" onBack={() => navigation.goBack()} />

      {platformsQuery.isPending ? (
        <LoadingScreen />
      ) : !platformsQuery.data ? (
        <ErrorState error={platformsQuery.error} onRetry={() => platformsQuery.refetch()} />
      ) : (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={[styles.label, { color: colors.textSecondary }]}>1 · Platform</Text>
          {platform ? (
            <TouchableOpacity
              style={[styles.selected, { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}
              onPress={() => !busy && setPlatform(null)}
              accessibilityLabel={`Platform ${platformName(platform)}, tap to change`}
            >
              <MaterialCommunityIcons name="check-circle" size={18} color={colors.primary} />
              <Text style={[styles.selectedText, { color: colors.text }]} numberOfLines={1}>
                {platformName(platform)}
              </Text>
              <Text style={[styles.change, { color: colors.primary }]}>Change</Text>
            </TouchableOpacity>
          ) : (
            <>
              <View style={styles.searchWrap}>
                <SearchBar value={platformSearch} onChangeText={setPlatformSearch} placeholder="Find a platform" />
              </View>
              <View style={styles.chips}>
                {platforms.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => setPlatform(item)}
                    style={[styles.chip, { backgroundColor: colors.topLayer, borderColor: colors.border }]}
                  >
                    <Text style={[styles.chipText, { color: colors.text }]}>{platformName(item)}</Text>
                  </TouchableOpacity>
                ))}
                {platforms.length === 0 && (
                  <Text style={[styles.hint, { color: colors.textSecondary }]}>
                    No platform matches. Platforms are created on the server when their folder exists.
                  </Text>
                )}
              </View>
            </>
          )}

          <Text style={[styles.label, { color: colors.textSecondary, marginTop: spacing.lg }]}>2 · Files</Text>
          {files.map((file) => {
            const state = states[file.name];
            return (
              <View key={file.name} style={[styles.fileRow, { backgroundColor: colors.topLayer, borderColor: colors.border }]}>
                <View style={styles.fileHead}>
                  <MaterialCommunityIcons
                    name={state?.status === 'done' ? 'check-circle' : state?.status === 'failed' ? 'alert-circle' : 'file'}
                    size={20}
                    color={state?.status === 'done' ? colors.success : state?.status === 'failed' ? colors.error : colors.textSecondary}
                  />
                  <View style={styles.fileBody}>
                    <Text style={[styles.fileName, { color: colors.text }]} numberOfLines={1}>
                      {file.name}
                    </Text>
                    <Text style={[styles.fileMeta, { color: state?.status === 'failed' ? colors.error : colors.textSecondary }]} numberOfLines={2}>
                      {state?.status === 'failed'
                        ? state.error
                        : state?.status === 'uploading'
                          ? `${Math.round(state.progress * 100)}% of ${formatFileSize(file.size)}`
                          : formatFileSize(file.size)}
                    </Text>
                  </View>
                  {!busy && state?.status !== 'done' && (
                    <TouchableOpacity onPress={() => removeFile(file.name)} hitSlop={10} accessibilityLabel={`Remove ${file.name}`}>
                      <MaterialCommunityIcons name="close" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                  )}
                </View>
                {state?.status === 'uploading' && (
                  <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
                    <View style={[styles.progressFill, { backgroundColor: colors.primary, width: `${state.progress * 100}%` }]} />
                  </View>
                )}
              </View>
            );
          })}
          <TouchableOpacity
            style={[styles.picker, { borderColor: colors.border }]}
            onPress={pickFiles}
            disabled={busy}
          >
            <MaterialCommunityIcons name="file-plus" size={26} color={colors.primary} />
            <Text style={[styles.pickerText, { color: colors.text }]}>
              {files.length ? 'Add more files' : 'Choose ROM files'}
            </Text>
          </TouchableOpacity>

          {notice && (
            <View style={[styles.notice, { backgroundColor: (notice.ok ? colors.success : colors.error) + '18' }]}>
              <MaterialCommunityIcons
                name={notice.ok ? 'check-circle' : 'alert-circle'}
                size={18}
                color={notice.ok ? colors.success : colors.error}
              />
              <Text style={[styles.noticeText, { color: colors.text }]}>{notice.text}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.uploadButton, { backgroundColor: canUpload ? colors.primary : colors.gray }]}
            onPress={allDone ? () => navigation.goBack() : handleUpload}
            disabled={!canUpload && !allDone}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <MaterialCommunityIcons name={allDone ? 'check' : 'upload'} size={22} color="#fff" />
                <Text style={styles.uploadText}>{allDone ? 'Done' : 'Upload'}</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: 40 },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  selected: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  selectedText: { flex: 1, fontSize: fontSize.lg, fontWeight: '600' },
  change: { fontSize: fontSize.md, fontWeight: '600' },
  searchWrap: { marginHorizontal: -spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: borderRadius.lg, borderWidth: 1 },
  chipText: { fontSize: fontSize.md, fontWeight: '600' },
  hint: { fontSize: fontSize.md, lineHeight: 20 },
  fileRow: { padding: 12, borderRadius: borderRadius.lg, borderWidth: 1, marginBottom: spacing.sm },
  fileHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  fileBody: { flex: 1 },
  fileName: { fontSize: fontSize.md, fontWeight: '600' },
  fileMeta: { fontSize: fontSize.sm, marginTop: 2 },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden', marginTop: 10 },
  progressFill: { height: '100%', borderRadius: 3 },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  pickerText: { fontSize: fontSize.lg, fontWeight: '600' },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  noticeText: { flex: 1, fontSize: fontSize.md, lineHeight: 20 },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: borderRadius.lg,
    marginTop: spacing.lg,
  },
  uploadText: { color: '#fff', fontSize: fontSize.lg, fontWeight: '700' },
});

export default UploadScreen;

// by Cleyvin

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useApp } from '../../store/AppContext';
import {
  describeError,
  getFreshBearer,
  getRom,
  getServerUrl,
  romContentPath,
  updateRomUser,
  RomUserUpdate,
} from '../../api';
import { queryKeys } from '../../api/queryClient';
import { getEmulationSupport } from '../../config/emulation';
import { SCOPES } from '../../constants';
import { Rom, RomStatus, RootStackParamList } from '../../types';
import { downloadToUserFolder, DownloadProgress } from '../../utils/download';
import { formatDate, formatFileSize, resourceUrl, romCoverUrl, romDownloadName, romTitle } from '../../utils';
import { spacing, borderRadius, fontSize, IconName, ThemeColors } from '../../theme';
import ScreenHeader from '../../components/common/ScreenHeader';
import LoadingScreen from '../../components/common/LoadingScreen';
import ErrorState from '../../components/common/ErrorState';
import RemoteImage from '../../components/common/RemoteImage';

const STATUS_OPTIONS: { value: RomStatus; label: string; icon: IconName }[] = [
  { value: 'incomplete', label: 'Playing', icon: 'gamepad-variant' },
  { value: 'finished', label: 'Finished', icon: 'flag-checkered' },
  { value: 'completed_100', label: '100%', icon: 'trophy' },
  { value: 'retired', label: 'Retired', icon: 'archive' },
  { value: 'never_playing', label: 'Skipped', icon: 'cancel' },
];

// Sidecar files that are never the thing to boot.
const NON_GAME_FILE = /\.(txt|nfo|md|jpg|jpeg|png|pdf|sfv)$/i;

const RomDetailScreen = () => {
  const { colors, serverUrl, can } = useApp();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { romId } = useRoute<RouteProp<RootStackParamList, 'RomDetail'>>().params;
  const queryClient = useQueryClient();
  const { width } = useWindowDimensions();

  const [selectedFileId, setSelectedFileId] = useState<number | undefined>(undefined);
  const [download, setDownload] = useState<DownloadProgress | null>(null);
  const [summaryExpanded, setSummaryExpanded] = useState(false);

  const query = useQuery({ queryKey: queryKeys.rom(romId), queryFn: () => getRom(romId) });
  const rom = query.data;

  const userProps = useMutation({
    mutationFn: (changes: RomUserUpdate) => updateRomUser(romId, changes),
    // Show the change immediately and roll back if the server refuses it.
    onMutate: async (changes) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.rom(romId) });
      const previous = queryClient.getQueryData<Rom>(queryKeys.rom(romId));
      if (previous?.rom_user) {
        queryClient.setQueryData<Rom>(queryKeys.rom(romId), {
          ...previous,
          rom_user: { ...previous.rom_user, ...changes },
        });
      }
      return { previous };
    },
    onError: (err, _changes, context) => {
      if (context?.previous) queryClient.setQueryData(queryKeys.rom(romId), context.previous);
      Alert.alert('Could not save', describeError(err));
    },
    onSuccess: (romUser) => {
      const current = queryClient.getQueryData<Rom>(queryKeys.rom(romId));
      if (current) queryClient.setQueryData<Rom>(queryKeys.rom(romId), { ...current, rom_user: romUser });
    },
  });

  if (query.isPending) return <LoadingScreen message="Loading…" />;
  if (!rom) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScreenHeader title="ROM" onBack={() => navigation.goBack()} />
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      </View>
    );
  }

  const title = romTitle(rom);
  const emulation = getEmulationSupport(rom.platform_slug);
  const canEditProgress = can(SCOPES.ROMS_USER_WRITE);
  const gameFiles = (rom.files ?? []).filter((file) => !NON_GAME_FILE.test(file.file_name));
  const isMultiFile = gameFiles.length > 1;
  const screenshots = rom.merged_screenshots ?? [];
  const genres = rom.metadatum?.genres ?? [];
  const releaseYear = rom.metadatum?.first_release_date
    ? new Date(rom.metadatum.first_release_date).getUTCFullYear()
    : null;
  const coverWidth = Math.min(width * 0.5, 240);
  const romUser = rom.rom_user;
  const saveCount = (rom.user_saves?.length ?? 0) + (rom.user_states?.length ?? 0);

  const handlePlay = () => navigation.navigate('Play', { romId: rom.id, fileId: selectedFileId });

  const handleDownload = async () => {
    setDownload({ receivedBytes: 0, totalBytes: rom.fs_size_bytes || null });
    try {
      const saved = await downloadToUserFolder({
        url: `${getServerUrl()}${romContentPath(rom)}`,
        fileName: romDownloadName(rom),
        bearer: await getFreshBearer(),
        onProgress: setDownload,
      });
      if (saved) Alert.alert('Download complete', `${romDownloadName(rom)} was saved to the folder you chose.`);
    } catch (err) {
      Alert.alert('Download failed', describeError(err, 'The file could not be saved'));
    } finally {
      setDownload(null);
    }
  };

  const downloadLabel = () => {
    if (!download) return 'Download';
    if (download.totalBytes) return `${Math.min(99, Math.round((download.receivedBytes / download.totalBytes) * 100))}%`;
    return formatFileSize(download.receivedBytes);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title={title} onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.coverSection}>
          <RemoteImage
            sources={[romCoverUrl(serverUrl, rom, 'large'), rom.url_cover]}
            style={[styles.cover, { width: coverWidth, height: coverWidth / (3 / 4), backgroundColor: colors.topLayer }]}
            contentFit="contain"
            accessibilityLabel={`${title} cover`}
            fallback={
              <View style={styles.noCover}>
                <MaterialCommunityIcons name="image-off-outline" size={56} color={colors.gray} />
              </View>
            }
          />
        </View>

        <View style={styles.body}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>

          <View style={styles.chipRow}>
            <Chip colors={colors} icon="gamepad-variant" text={rom.platform_custom_name || rom.platform_display_name || rom.platform_slug} tint={colors.primary} />
            <Chip colors={colors} icon="harddisk" text={formatFileSize(rom.fs_size_bytes)} />
            {releaseYear && <Chip colors={colors} icon="calendar" text={String(releaseYear)} />}
            {saveCount > 0 && <Chip colors={colors} icon="cloud-check" text={`${saveCount} cloud save${saveCount === 1 ? '' : 's'}`} tint={colors.success} />}
          </View>

          {(!!rom.regions?.length || !!rom.languages?.length || genres.length > 0) && (
            <View style={styles.chipRow}>
              {rom.regions?.map((region) => <Tag key={`r-${region}`} text={region} tint={colors.info} />)}
              {rom.languages?.map((language) => <Tag key={`l-${language}`} text={language} tint={colors.accent} />)}
              {genres.map((genre) => <Tag key={`g-${genre}`} text={genre} tint={colors.secondary} />)}
            </View>
          )}

          {rom.missing_from_fs && (
            <Notice colors={colors} icon="alert" tint={colors.warning} text="The server can no longer find this file on disk." />
          )}

          {isMultiFile && emulation.core && (
            <View style={[styles.card, { backgroundColor: colors.topLayer, borderColor: colors.border }]}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>What to load</Text>
              <FileOption
                colors={colors}
                label="All files"
                detail="Recommended for multi-disc and cue/bin games"
                selected={selectedFileId === undefined}
                onPress={() => setSelectedFileId(undefined)}
              />
              {gameFiles.map((file) => (
                <FileOption
                  key={file.id}
                  colors={colors}
                  label={file.file_name}
                  detail={formatFileSize(file.file_size_bytes)}
                  selected={selectedFileId === file.id}
                  onPress={() => setSelectedFileId(file.id)}
                />
              ))}
            </View>
          )}

          <View style={styles.actionRow}>
            {emulation.core && (
              <TouchableOpacity
                style={[styles.actionButton, styles.playButton, { backgroundColor: colors.success }]}
                onPress={handlePlay}
                disabled={rom.missing_from_fs}
                accessibilityRole="button"
              >
                <MaterialCommunityIcons name="play" size={24} color="#fff" />
                <Text style={styles.actionText}>Play</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={handleDownload}
              disabled={!!download || rom.missing_from_fs}
              accessibilityRole="button"
            >
              {download ? <ActivityIndicator color="#fff" size="small" /> : <MaterialCommunityIcons name="download" size={22} color="#fff" />}
              <Text style={styles.actionText}>{downloadLabel()}</Text>
            </TouchableOpacity>
          </View>
          {!emulation.core && (
            <Notice
              colors={colors}
              icon="information-outline"
              tint={colors.textSecondary}
              text="This platform has no in-app emulator. You can still download the file."
            />
          )}

          {romUser && (
            <View style={[styles.card, { backgroundColor: colors.topLayer, borderColor: colors.border }]}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Your progress</Text>
              <Text style={[styles.progressLine, { color: colors.text }]}>
                {romUser.last_played ? `Last played ${formatDate(romUser.last_played)}` : 'Not played yet'}
              </Text>

              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Rating</Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((star) => {
                  // RoMM stores ratings on a 0-10 scale.
                  const value = star * 2;
                  const filled = romUser.rating >= value;
                  return (
                    <TouchableOpacity
                      key={star}
                      disabled={!canEditProgress}
                      onPress={() => userProps.mutate({ rating: romUser.rating === value ? 0 : value })}
                      accessibilityLabel={`Rate ${star} of 5`}
                      hitSlop={4}
                    >
                      <MaterialCommunityIcons name={filled ? 'star' : 'star-outline'} size={30} color={colors.warning} />
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Status</Text>
              <View style={styles.statusRow}>
                {STATUS_OPTIONS.map((option) => {
                  const active = romUser.status === option.value;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      disabled={!canEditProgress}
                      onPress={() => userProps.mutate({ status: active ? null : option.value })}
                      style={[
                        styles.statusChip,
                        {
                          backgroundColor: active ? colors.primary + '30' : colors.surface,
                          borderColor: active ? colors.primary : colors.border,
                        },
                      ]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                    >
                      <MaterialCommunityIcons name={option.icon} size={14} color={active ? colors.primary : colors.textSecondary} />
                      <Text style={[styles.statusChipText, { color: active ? colors.primary : colors.textSecondary }]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity
                  disabled={!canEditProgress}
                  onPress={() => userProps.mutate({ backlogged: !romUser.backlogged })}
                  style={[
                    styles.statusChip,
                    {
                      backgroundColor: romUser.backlogged ? colors.accent + '30' : colors.surface,
                      borderColor: romUser.backlogged ? colors.accent : colors.border,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: romUser.backlogged }}
                >
                  <MaterialCommunityIcons
                    name="bookmark"
                    size={14}
                    color={romUser.backlogged ? colors.accent : colors.textSecondary}
                  />
                  <Text style={[styles.statusChipText, { color: romUser.backlogged ? colors.accent : colors.textSecondary }]}>
                    Backlog
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {!!rom.summary && (
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Description</Text>
              <Text style={[styles.summary, { color: colors.text }]} numberOfLines={summaryExpanded ? undefined : 6}>
                {rom.summary}
              </Text>
              {rom.summary.length > 280 && (
                <TouchableOpacity onPress={() => setSummaryExpanded((expanded) => !expanded)} hitSlop={8}>
                  <Text style={[styles.more, { color: colors.primary }]}>{summaryExpanded ? 'Show less' : 'Read more'}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {screenshots.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Screenshots</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.screenshots}>
                {screenshots.map((path) => (
                  <RemoteImage
                    key={path}
                    sources={[resourceUrl(serverUrl, path)]}
                    style={[styles.screenshot, { backgroundColor: colors.topLayer }]}
                    fallback={null}
                  />
                ))}
              </ScrollView>
            </View>
          )}

          <View style={[styles.card, { backgroundColor: colors.topLayer, borderColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>File</Text>
            <InfoRow colors={colors} label="Name" value={rom.fs_name} />
            <InfoRow colors={colors} label="Size" value={formatFileSize(rom.fs_size_bytes)} />
            {gameFiles.length > 1 && <InfoRow colors={colors} label="Files" value={String(gameFiles.length)} />}
            {!!rom.revision && <InfoRow colors={colors} label="Revision" value={rom.revision} />}
            {emulation.core && <InfoRow colors={colors} label="Emulator core" value={emulation.core} />}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const Chip = ({ colors, icon, text, tint }: { colors: ThemeColors; icon: IconName; text: string; tint?: string }) => (
  <View style={[styles.chip, { backgroundColor: tint ? tint + '20' : colors.topLayer }]}>
    <MaterialCommunityIcons name={icon} size={13} color={tint ?? colors.textSecondary} />
    <Text style={[styles.chipText, { color: tint ?? colors.textSecondary }]}>{text}</Text>
  </View>
);

const Tag = ({ text, tint }: { text: string; tint: string }) => (
  <View style={[styles.tag, { backgroundColor: tint + '20' }]}>
    <Text style={[styles.tagText, { color: tint }]}>{text}</Text>
  </View>
);

const Notice = ({ colors, icon, tint, text }: { colors: ThemeColors; icon: IconName; tint: string; text: string }) => (
  <View style={[styles.notice, { backgroundColor: colors.topLayer }]}>
    <MaterialCommunityIcons name={icon} size={18} color={tint} />
    <Text style={[styles.noticeText, { color: colors.text }]}>{text}</Text>
  </View>
);

const FileOption = ({
  colors,
  label,
  detail,
  selected,
  onPress,
}: {
  colors: ThemeColors;
  label: string;
  detail: string;
  selected: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity
    onPress={onPress}
    style={[
      styles.fileOption,
      { backgroundColor: selected ? colors.primary + '25' : 'transparent', borderColor: selected ? colors.primary : colors.border },
    ]}
    accessibilityRole="radio"
    accessibilityState={{ selected }}
  >
    <MaterialCommunityIcons
      name={selected ? 'radiobox-marked' : 'radiobox-blank'}
      size={18}
      color={selected ? colors.primary : colors.textSecondary}
    />
    <View style={styles.fileOptionBody}>
      <Text style={[styles.fileName, { color: colors.text }]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.fileDetail, { color: colors.textSecondary }]} numberOfLines={1}>
        {detail}
      </Text>
    </View>
  </TouchableOpacity>
);

const InfoRow = ({ colors, label, value }: { colors: ThemeColors; label: string; value: string }) => (
  <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{label}</Text>
    <Text style={[styles.infoValue, { color: colors.text }]} numberOfLines={2}>
      {value}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  coverSection: { alignItems: 'center', paddingVertical: spacing.lg },
  cover: { borderRadius: borderRadius.lg },
  noCover: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  body: { paddingHorizontal: spacing.md },
  title: { fontSize: fontSize.xxl, fontWeight: '700', textAlign: 'center', marginBottom: spacing.sm },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginBottom: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.round,
  },
  chipText: { fontSize: fontSize.sm, fontWeight: '600' },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: borderRadius.sm },
  tagText: { fontSize: fontSize.sm, fontWeight: '500' },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
  },
  noticeText: { flex: 1, fontSize: fontSize.md, lineHeight: 19 },
  card: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginTop: spacing.md,
  },
  section: { marginTop: spacing.lg },
  sectionLabel: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  fileOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginTop: spacing.xs,
  },
  fileOptionBody: { flex: 1 },
  fileName: { fontSize: fontSize.md, fontWeight: '500' },
  fileDetail: { fontSize: fontSize.sm, marginTop: 1 },
  actionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: borderRadius.lg,
  },
  playButton: { flex: 1.4 },
  actionText: { color: '#fff', fontSize: fontSize.lg, fontWeight: '700' },
  progressLine: { fontSize: fontSize.md },
  fieldLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginTop: spacing.md,
    marginBottom: 6,
  },
  starsRow: { flexDirection: 'row', gap: 4 },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: borderRadius.round,
    borderWidth: 1,
  },
  statusChipText: { fontSize: fontSize.sm, fontWeight: '600' },
  summary: { fontSize: fontSize.md, lineHeight: 22 },
  more: { fontSize: fontSize.md, fontWeight: '600', marginTop: 6 },
  screenshots: { gap: spacing.sm },
  screenshot: { width: 220, height: 124, borderRadius: borderRadius.md },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  infoLabel: { fontSize: fontSize.md },
  infoValue: { fontSize: fontSize.md, fontWeight: '500', flex: 1, textAlign: 'right' },
});

export default RomDetailScreen;

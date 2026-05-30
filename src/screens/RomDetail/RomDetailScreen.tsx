// by Cleyvin

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
// Lazy import to avoid crash if native module not linked
let FileSystem: any = null;
try {
  FileSystem = require('expo-file-system');
} catch {}
import { useApp } from '../../store/AppContext';
import { getRom, getBaseUrl, getApiClient } from '../../api';
import { getCurrentAuthToken, useImageAuthHeaders } from '../../hooks/useAuthHeaders';
import { STORAGE_KEYS } from '../../constants';
import { Rom, RomUser, RootStackParamList } from '../../types';
import { getCoverUrl, getRomCoverUrl, isServerAssetUrl, formatFileSize } from '../../utils';
import { spacing, borderRadius, fontSize } from '../../theme';
import ScreenHeader from '../../components/common/ScreenHeader';
import LoadingScreen from '../../components/common/LoadingScreen';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const RomDetailScreen = () => {
  const { colors, serverConfig } = useApp();
  const authHeaders = useImageAuthHeaders();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'RomDetail'>>();
  const { romId } = route.params;

  const [rom, setRom] = useState<Rom | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRom = async () => {
      try {
        const data = await getRom(romId);
        setRom(data);
      } catch (err) {
        console.error('Failed to fetch ROM:', err);
        Alert.alert('Error', 'Failed to load ROM details', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } finally {
        setLoading(false);
      }
    };
    fetchRom();
  }, [romId]);

  const [downloading, setDownloading] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState<number | null>(null);

  // Auto-select .cue file or first track for multi-file ROMs
  useEffect(() => {
    if (rom?.files && rom.files.length > 1 && !selectedFileId) {
      const cueFile = rom.files.find((f: any) => f.file_name.toLowerCase().endsWith('.cue'));
      const firstBin = rom.files.find((f: any) =>
        f.file_name.toLowerCase().endsWith('.bin') || f.file_name.toLowerCase().endsWith('.iso')
      );
      setSelectedFileId(cueFile?.id || firstBin?.id || rom.files[0].id);
    }
  }, [rom?.files]);

  const handlePlay = () => {
    if (!rom) return;
    // For multi-file ROMs, always pass a file_id to avoid huge ZIP download
    const fileIds = selectedFileId ? [selectedFileId] : undefined;
    navigation.navigate('Play', {
      romId: rom.id,
      romName: rom.name,
      romFsName: rom.fs_name,
      platformSlug: rom.platform_slug || '',
      fileIds,
    });
  };

  const handleDownload = async () => {
    if (!rom || !serverConfig) return;
    if (!FileSystem) {
      Alert.alert('Not Available', 'Download is not available in this build. Use Expo Go.');
      return;
    }
    setDownloading(true);
    try {
      const authToken = await getCurrentAuthToken();
      const baseUrl = getBaseUrl(serverConfig);
      const url = `${baseUrl}/api/roms/${rom.id}/content/${encodeURIComponent(rom.fs_name)}`;

      // Download to cache first
      const cacheUri = FileSystem.cacheDirectory + rom.fs_name;
      const download = await FileSystem.downloadAsync(url, cacheUri, {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      });

      if (download.status === 200) {
        // Move to Downloads using SAF (Storage Access Framework)
        const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (permissions.granted) {
          const fileContent = await FileSystem.readAsStringAsync(download.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          const newFile = await FileSystem.StorageAccessFramework.createFileAsync(
            permissions.directoryUri,
            rom.fs_name,
            'application/octet-stream'
          );
          await FileSystem.writeAsStringAsync(newFile, fileContent, {
            encoding: FileSystem.EncodingType.Base64,
          });
          Alert.alert('Downloaded', `${rom.fs_name} saved successfully`);
        } else {
          Alert.alert('Permission Denied', 'Storage permission is required to save files');
        }
        // Clean cache
        await FileSystem.deleteAsync(download.uri, { idempotent: true });
      } else {
        Alert.alert('Error', `Download failed (${download.status})`);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Download failed');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return <LoadingScreen message="Loading ROM details..." />;
  if (!rom) return null;

  // Capture as a const so TS narrowing survives inside the onPress closures below.
  const romUser = rom.rom_user;
  // Build a complete RomUser when patching rating/status (no non-null assertions).
  const patchRomUser = (patch: Partial<RomUser>): RomUser => ({
    backlogged: false,
    now_playing: false,
    hidden: false,
    ...romUser,
    ...patch,
  });
  const coverUrl = getRomCoverUrl(serverConfig, rom);
  const screenshots = rom.url_screenshots || [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title={rom.name} onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Cover Image */}
        <View style={styles.coverSection}>
          {coverUrl ? (
            <Image
              source={{ uri: coverUrl, headers: isServerAssetUrl(serverConfig, coverUrl) ? authHeaders : undefined }}
              style={styles.coverImage}
              resizeMode="contain"
            />
          ) : (
            <View style={[styles.noCover, { backgroundColor: colors.topLayer }]}>
              <MaterialCommunityIcons name="image-off-outline" size={64} color={colors.gray} />
            </View>
          )}
        </View>

        {/* Title and Meta */}
        <View style={styles.infoSection}>
          <Text style={[styles.romTitle, { color: colors.text }]}>{rom.name}</Text>

          <View style={styles.metaRow}>
            {rom.platform_name && (
              <View style={[styles.metaChip, { backgroundColor: colors.primary + '20' }]}>
                <MaterialCommunityIcons name="gamepad-variant" size={12} color={colors.primary} />
                <Text style={[styles.metaChipText, { color: colors.primary }]}>
                  {rom.platform_name}
                </Text>
              </View>
            )}
            <View style={[styles.metaChip, { backgroundColor: colors.topLayer }]}>
              <MaterialCommunityIcons name="harddisk" size={12} color={colors.textSecondary} />
              <Text style={[styles.metaChipText, { color: colors.textSecondary }]}>
                {formatFileSize(rom.fs_size_bytes)}
              </Text>
            </View>
          </View>

          {/* Regions & Languages */}
          {(rom.regions?.length || rom.languages?.length) ? (
            <View style={styles.tagsRow}>
              {rom.regions?.map((r) => (
                <View key={r} style={[styles.tag, { backgroundColor: colors.info + '20' }]}>
                  <Text style={[styles.tagText, { color: colors.info }]}>{r}</Text>
                </View>
              ))}
              {rom.languages?.map((l) => (
                <View key={l} style={[styles.tag, { backgroundColor: colors.accent + '20' }]}>
                  <Text style={[styles.tagText, { color: colors.accent }]}>{l}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* Genres */}
          {rom.genres && rom.genres.length > 0 && (
            <View style={styles.tagsRow}>
              {rom.genres.map((g) => (
                <View key={g} style={[styles.tag, { backgroundColor: colors.secondary + '20' }]}>
                  <Text style={[styles.tagText, { color: colors.secondary }]}>{g}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Summary */}
          {rom.summary && (
            <View style={styles.summaryContainer}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Description</Text>
              <Text style={[styles.summary, { color: colors.text }]}>{rom.summary}</Text>
            </View>
          )}

          {/* Your Progress - Interactive */}
          {romUser && (
            <View style={[styles.userStatusCard, { backgroundColor: colors.topLayer, borderColor: colors.border }]}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Your Progress</Text>

              {/* Last Played & Now Playing */}
              {romUser.last_played && (
                <View style={styles.statusItem}>
                  <MaterialCommunityIcons name="clock-outline" size={16} color={colors.info} />
                  <Text style={[styles.statusText, { color: colors.text }]}>
                    Last played: {new Date(romUser.last_played).toLocaleDateString()}
                  </Text>
                </View>
              )}
              {romUser.now_playing && (
                <View style={styles.statusItem}>
                  <MaterialCommunityIcons name="play-circle" size={16} color={colors.success} />
                  <Text style={[styles.statusText, { color: colors.success }]}>Now Playing</Text>
                </View>
              )}

              {/* Interactive Rating (1-5 stars) */}
              <Text style={[styles.ratingLabel, { color: colors.textSecondary }]}>Rating</Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={async () => {
                      const newRating = star * 2; // RoMM uses 0-10 scale
                      try {
                        const client = getApiClient();
                        await client.put(`/api/roms/${rom.id}/props`, { rating: newRating });
                        setRom({ ...rom, rom_user: patchRomUser({ rating: newRating }) });
                      } catch {}
                    }}
                  >
                    <MaterialCommunityIcons
                      name={(romUser.rating || 0) >= star * 2 ? 'star' : 'star-outline'}
                      size={28}
                      color={colors.warning}
                    />
                  </TouchableOpacity>
                ))}
                <Text style={[styles.ratingText, { color: colors.textSecondary }]}>
                  {romUser.rating ? `${romUser.rating}/10` : ''}
                </Text>
              </View>

              {/* Game Status Selector */}
              <Text style={[styles.ratingLabel, { color: colors.textSecondary }]}>Status</Text>
              <View style={styles.statusChips}>
                {([
                  { value: null, label: 'None', icon: 'minus-circle-outline' },
                  { value: 'INCOMPLETE', label: 'Playing', icon: 'gamepad-variant' },
                  { value: 'FINISHED', label: 'Finished', icon: 'flag-checkered' },
                  { value: 'COMPLETED_100', label: '100%', icon: 'trophy' },
                  { value: 'RETIRED', label: 'Retired', icon: 'archive' },
                ] as { value: RomUser['status'] | null; label: string; icon: string }[]).map((s) => (
                  <TouchableOpacity
                    key={s.label}
                    onPress={async () => {
                      try {
                        const client = getApiClient();
                        await client.put(`/api/roms/${rom.id}/props`, { status: s.value });
                        setRom({ ...rom, rom_user: patchRomUser({ status: s.value ?? undefined }) });
                      } catch {}
                    }}
                    style={[
                      styles.statusChip,
                      {
                        backgroundColor: romUser.status === s.value ? colors.primary + '30' : colors.surface,
                        borderColor: romUser.status === s.value ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={s.icon as any}
                      size={14}
                      color={romUser.status === s.value ? colors.primary : colors.textSecondary}
                    />
                    <Text style={[styles.statusChipText, { color: romUser.status === s.value ? colors.primary : colors.textSecondary }]}>
                      {s.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {!romUser.last_played && !romUser.status && (
                <Text style={[styles.statusText, { color: colors.gray, marginTop: 8 }]}>
                  Not played yet. Tap Play ROM to start!
                </Text>
              )}
            </View>
          )}

          {/* Screenshots */}
          {screenshots.length > 0 && (
            <View style={styles.screenshotsSection}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Screenshots</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {screenshots.map((url, i) => {
                  const ssUrl = getCoverUrl(serverConfig, url) || url;
                  return (
                    <Image
                      key={i}
                      source={{ uri: ssUrl, headers: isServerAssetUrl(serverConfig, ssUrl) ? authHeaders : undefined }}
                      style={[styles.screenshot, { backgroundColor: colors.topLayer }]}
                      resizeMode="cover"
                    />
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* File Selector for multi-file ROMs */}
          {rom.files && rom.files.length > 1 && (
            <View style={[styles.fileSelector, { backgroundColor: colors.topLayer, borderColor: colors.border }]}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Select File</Text>
              {rom.files
                .filter((f: any) => !f.file_name.endsWith('.txt'))
                .map((f: any) => (
                <TouchableOpacity
                  key={f.id}
                  onPress={() => setSelectedFileId(f.id === selectedFileId ? null : f.id)}
                  style={[
                    styles.fileOption,
                    {
                      backgroundColor: selectedFileId === f.id ? colors.primary + '30' : 'transparent',
                      borderColor: selectedFileId === f.id ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={selectedFileId === f.id ? 'radiobox-marked' : 'radiobox-blank'}
                    size={18}
                    color={selectedFileId === f.id ? colors.primary : colors.gray}
                  />
                  <Text style={[styles.fileName, { color: colors.text }]} numberOfLines={1}>
                    {f.file_name}
                  </Text>
                  <Text style={[styles.fileSize, { color: colors.textSecondary }]}>
                    {formatFileSize(f.file_size_bytes)}
                  </Text>
                </TouchableOpacity>
              ))}
              <Text style={[styles.fileHint, { color: colors.textSecondary }]}>
                Select the .cue file for best compatibility
              </Text>
            </View>
          )}

          {/* Play Button */}
          <TouchableOpacity
            style={[styles.playButton, { backgroundColor: colors.success }]}
            onPress={handlePlay}
          >
            <MaterialCommunityIcons name="play-circle" size={24} color="#fff" />
            <Text style={styles.playText}>Play ROM</Text>
          </TouchableOpacity>

          {/* Download Button */}
          <TouchableOpacity
            style={[styles.downloadButton, { backgroundColor: colors.primary }]}
            onPress={handleDownload}
            disabled={downloading}
          >
            {downloading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <MaterialCommunityIcons name="download" size={22} color="#fff" />
                <Text style={styles.downloadText}>Download ROM</Text>
              </>
            )}
          </TouchableOpacity>

          {/* File Info */}
          <View style={[styles.fileInfo, { backgroundColor: colors.topLayer, borderColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>File Information</Text>
            <InfoRow colors={colors} label="File Name" value={rom.fs_name} />
            <InfoRow colors={colors} label="Size" value={formatFileSize(rom.fs_size_bytes)} />
            {rom.revision && <InfoRow colors={colors} label="Revision" value={rom.revision} />}
            {rom.igdb_id && <InfoRow colors={colors} label="IGDB ID" value={rom.igdb_id.toString()} />}
            {rom.moby_id && <InfoRow colors={colors} label="MobyGames ID" value={rom.moby_id.toString()} />}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const InfoRow = ({ colors, label, value }: { colors: any; label: string; value: string }) => (
  <View style={styles.infoRow}>
    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{label}</Text>
    <Text style={[styles.infoValue, { color: colors.text }]} numberOfLines={1}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  coverSection: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  coverImage: {
    width: SCREEN_WIDTH * 0.5,
    height: SCREEN_WIDTH * 0.75,
    borderRadius: borderRadius.lg,
  },
  noCover: {
    width: SCREEN_WIDTH * 0.5,
    height: SCREEN_WIDTH * 0.75,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoSection: {
    paddingHorizontal: spacing.md,
  },
  romTitle: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginBottom: spacing.sm,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.round,
    marginHorizontal: 4,
    marginBottom: 4,
  },
  metaChipText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    marginLeft: 4,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    margin: 2,
  },
  tagText: {
    fontSize: fontSize.xs,
    fontWeight: '500',
  },
  sectionLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  summaryContainer: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  summary: {
    fontSize: fontSize.md,
    lineHeight: 22,
  },
  userStatusCard: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 6,
  },
  statusText: {
    fontSize: fontSize.md,
    marginLeft: 6,
  },
  ratingLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginTop: spacing.sm,
    marginBottom: 4,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  ratingText: {
    fontSize: fontSize.sm,
    marginLeft: 8,
  },
  statusChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.round,
    borderWidth: 1,
  },
  statusChipText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    marginLeft: 4,
  },
  screenshotsSection: {
    marginBottom: spacing.md,
  },
  screenshot: {
    width: 200,
    height: 112,
    borderRadius: borderRadius.md,
    marginRight: spacing.sm,
  },
  fileSelector: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  fileOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginTop: spacing.xs,
  },
  fileName: {
    flex: 1,
    fontSize: fontSize.sm,
    marginLeft: 8,
  },
  fileSize: {
    fontSize: fontSize.xs,
    marginLeft: 4,
  },
  fileHint: {
    fontSize: fontSize.xs,
    fontStyle: 'italic',
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: borderRadius.lg,
    marginTop: spacing.md,
  },
  playText: {
    color: '#fff',
    fontSize: fontSize.lg,
    fontWeight: '700',
    marginLeft: 8,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: borderRadius.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  downloadText: {
    color: '#fff',
    fontSize: fontSize.lg,
    fontWeight: '700',
    marginLeft: 8,
  },
  fileInfo: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  infoLabel: {
    fontSize: fontSize.sm,
    flex: 1,
  },
  infoValue: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
});

export default RomDetailScreen;

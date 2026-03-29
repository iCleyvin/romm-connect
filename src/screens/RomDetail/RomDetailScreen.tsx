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
import * as FileSystem from 'expo-file-system';
import { useApp } from '../../store/AppContext';
import { useCredentials } from '../../hooks/useAuthHeaders';
import { getRom, getBaseUrl } from '../../api';
import { STORAGE_KEYS } from '../../constants';
import { Rom, RootStackParamList } from '../../types';
import { getCoverUrl, getRomCoverUrl, formatFileSize } from '../../utils';
import { spacing, borderRadius, fontSize } from '../../theme';
import ScreenHeader from '../../components/common/ScreenHeader';
import LoadingScreen from '../../components/common/LoadingScreen';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const RomDetailScreen = () => {
  const { colors, serverConfig } = useApp();
  const credentials = useCredentials();
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
        Alert.alert('Error', 'Failed to load ROM details');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };
    fetchRom();
  }, [romId]);

  const [downloading, setDownloading] = useState(false);

  const handlePlay = () => {
    if (!rom) return;
    navigation.navigate('Play', {
      romId: rom.id,
      romName: rom.name,
      romFsName: rom.fs_name,
      platformSlug: rom.platform_slug || '',
    });
  };

  const handleDownload = async () => {
    if (!rom || !serverConfig) return;
    setDownloading(true);
    try {
      const storedTokens = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKENS);
      const tokens = storedTokens ? JSON.parse(storedTokens) : null;
      const baseUrl = getBaseUrl(serverConfig);
      const url = `${baseUrl}/api/roms/${rom.id}/content/${encodeURIComponent(rom.fs_name)}`;

      // Download to cache first
      const cacheUri = FileSystem.cacheDirectory + rom.fs_name;
      const download = await FileSystem.downloadAsync(url, cacheUri, {
        headers: tokens ? { Authorization: `Bearer ${tokens.access_token}` } : {},
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

  const coverUrl = getRomCoverUrl(serverConfig, rom, credentials || undefined);
  const screenshots = rom.url_screenshots || [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title={rom.name} onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Cover Image */}
        <View style={styles.coverSection}>
          {coverUrl ? (
            <Image source={{ uri: coverUrl }} style={styles.coverImage} resizeMode="contain" />
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

          {/* User Status */}
          {rom.rom_user && (
            <View style={[styles.userStatusCard, { backgroundColor: colors.topLayer, borderColor: colors.border }]}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Your Progress</Text>
              <View style={styles.statusRow}>
                {rom.rom_user.last_played && (
                  <View style={styles.statusItem}>
                    <MaterialCommunityIcons name="clock-outline" size={16} color={colors.info} />
                    <Text style={[styles.statusText, { color: colors.text }]}>
                      Last played: {new Date(rom.rom_user.last_played).toLocaleDateString()}
                    </Text>
                  </View>
                )}
                {rom.rom_user.now_playing && (
                  <View style={styles.statusItem}>
                    <MaterialCommunityIcons name="play-circle" size={16} color={colors.success} />
                    <Text style={[styles.statusText, { color: colors.success }]}>
                      Now Playing
                    </Text>
                  </View>
                )}
                {rom.rom_user.status && (
                  <View style={styles.statusItem}>
                    <MaterialCommunityIcons name="flag" size={16} color={colors.primary} />
                    <Text style={[styles.statusText, { color: colors.text }]}>
                      {rom.rom_user.status.replace(/_/g, ' ')}
                    </Text>
                  </View>
                )}
                {rom.rom_user.rating != null && rom.rom_user.rating > 0 && (
                  <View style={styles.statusItem}>
                    <MaterialCommunityIcons name="star" size={16} color={colors.warning} />
                    <Text style={[styles.statusText, { color: colors.text }]}>
                      {rom.rom_user.rating}/10
                    </Text>
                  </View>
                )}
                {rom.rom_user.completion != null && rom.rom_user.completion > 0 && (
                  <View style={styles.statusItem}>
                    <MaterialCommunityIcons name="percent" size={16} color={colors.success} />
                    <Text style={[styles.statusText, { color: colors.text }]}>
                      {rom.rom_user.completion}%
                    </Text>
                  </View>
                )}
              </View>
              {!rom.rom_user.last_played && !rom.rom_user.status && (
                <Text style={[styles.statusText, { color: colors.gray, marginTop: 4 }]}>
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
                {screenshots.map((url, i) => (
                  <Image
                    key={i}
                    source={{ uri: getCoverUrl(serverConfig, url) || url }}
                    style={[styles.screenshot, { backgroundColor: colors.topLayer }]}
                    resizeMode="cover"
                  />
                ))}
              </ScrollView>
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
    marginBottom: 4,
  },
  statusText: {
    fontSize: fontSize.md,
    marginLeft: 6,
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

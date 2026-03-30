// by Cleyvin

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useApp } from '../../store/AppContext';
import { getStats, getPlatforms, getRoms, scanAllPlatforms } from '../../api';
import { StatsResponse, Platform, Rom, RootStackParamList } from '../../types';
import { formatFileSize } from '../../utils';
import { spacing, borderRadius, fontSize } from '../../theme';
import LoadingScreen from '../../components/common/LoadingScreen';
import RomCard from '../../components/cards/RomCard';

const HomeScreen = () => {
  const { colors, user } = useApp();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [recentlyPlayed, setRecentlyPlayed] = useState<Rom[]>([]);
  const [recentRoms, setRecentRoms] = useState<Rom[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [scanning, setScanning] = useState(false);

  const fetchData = async () => {
    try {
      const [statsData, platformsData, recentData, playedData] = await Promise.all([
        getStats(),
        getPlatforms(),
        getRoms({ limit: 12, order_by: 'updated_at', order_dir: 'desc' }),
        getRoms({ limit: 6, order_by: 'last_played', order_dir: 'desc' }),
      ]);
      setStats(statsData);
      setPlatforms(platformsData);
      setRecentRoms(recentData.items || []);
      // Filter only ROMs that have been played
      const played = (playedData.items || []).filter(
        (r: Rom) => r.rom_user?.last_played
      );
      setRecentlyPlayed(played);
    } catch (err) {
      console.error('Failed to fetch home data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const [scanStatus, setScanStatus] = useState('');

  const handleScan = async () => {
    setScanning(true);
    try {
      // Step 1: Scan server
      setScanStatus('Scanning server...');
      const result = await scanAllPlatforms();

      // Step 2: Refresh app data
      setScanStatus('Updating app...');
      await fetchData();

      setScanStatus('');
      Alert.alert(
        'Scan Complete',
        `${result.scanned} platforms scanned.${result.errors.length > 0 ? `\n\nErrors:\n${result.errors.join('\n')}` : '\nLibrary updated!'}`,
      );
    } catch (err: any) {
      setScanStatus('');
      Alert.alert('Scan Error', err.message || 'Could not scan library');
    } finally {
      setScanning(false);
      setScanStatus('');
    }
  };

  if (loading) return <LoadingScreen message="Loading dashboard..." />;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 24 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* Greeting */}
      <View style={styles.greeting}>
        <View>
          <Text style={[styles.greetingText, { color: colors.textSecondary }]}>Welcome back,</Text>
          <Text style={[styles.userName, { color: colors.text }]}>{user?.username || 'Player'}</Text>
        </View>
        <View style={styles.headerActions}>
          {/* Scan Button */}
          <TouchableOpacity
            onPress={handleScan}
            disabled={scanning}
            style={[styles.headerButton, { backgroundColor: colors.topLayer }]}
          >
            {scanning ? (
              <ActivityIndicator size={18} color={colors.primary} />
            ) : (
              <MaterialCommunityIcons name="magnify-scan" size={22} color={colors.primary} />
            )}
          </TouchableOpacity>
          {/* Upload Button */}
          <TouchableOpacity
            onPress={() => navigation.navigate('Upload')}
            style={[styles.headerButton, { backgroundColor: colors.topLayer }]}
          >
            <MaterialCommunityIcons name="upload" size={22} color={colors.accent} />
          </TouchableOpacity>
          {/* Avatar */}
          <View style={[styles.avatarCircle, { backgroundColor: colors.primary + '30' }]}>
            <MaterialCommunityIcons name="account" size={24} color={colors.primary} />
          </View>
        </View>
      </View>

      {/* Scan Status */}
      {scanStatus ? (
        <View style={styles.scanStatus}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.scanStatusText, { color: colors.primary }]}>{scanStatus}</Text>
        </View>
      ) : null}

      {/* Stats Cards */}
      {stats && (
        <View style={styles.statsGrid}>
          <StatCard colors={colors} icon="gamepad-variant" label="Platforms" value={(stats.PLATFORMS ?? 0).toString()} color={colors.primary} />
          <StatCard colors={colors} icon="disc" label="ROMs" value={(stats.ROMS ?? 0).toString()} color={colors.accent} />
          <StatCard colors={colors} icon="content-save" label="Saves" value={(stats.SAVES ?? 0).toString()} color={colors.success} />
          <StatCard colors={colors} icon="harddisk" label="Total Size" value={formatFileSize(stats.TOTAL_FILESIZE_BYTES ?? 0)} color={colors.info} />
        </View>
      )}

      {/* Recently Played (BEFORE Recently Updated) */}
      {recentlyPlayed.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="history" size={20} color={colors.accent} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recently Played</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
            {recentlyPlayed.map((rom) => (
              <View key={rom.id} style={styles.horizontalCard}>
                <RomCard
                  rom={rom}
                  onPress={() => navigation.navigate('RomDetail', { romId: rom.id })}
                />
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Recently Updated */}
      {recentRoms.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="update" size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recently Updated</Text>
          </View>
          <View style={styles.romGrid}>
            {recentRoms.map((rom) => (
              <RomCard
                key={rom.id}
                rom={rom}
                onPress={() => navigation.navigate('RomDetail', { romId: rom.id })}
              />
            ))}
          </View>
        </View>
      )}

      {/* Quick Platform Access */}
      {platforms.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="gamepad-variant" size={20} color={colors.secondary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Platforms</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.platformScroll}>
            {platforms.slice(0, 10).map((platform) => (
              <TouchableOpacity
                key={platform.id}
                onPress={() =>
                  navigation.navigate('RomGallery', {
                    platformId: platform.id,
                    platformName: platform.custom_name || platform.name,
                    platformSlug: platform.slug,
                  })
                }
                style={[styles.platformChip, { backgroundColor: colors.topLayer, borderColor: colors.border }]}
              >
                <MaterialCommunityIcons name="gamepad-variant" size={16} color={colors.primary} />
                <Text style={[styles.platformChipText, { color: colors.text }]} numberOfLines={1}>
                  {platform.custom_name || platform.name}
                </Text>
                <Text style={[styles.platformChipCount, { color: colors.textSecondary }]}>
                  {platform.rom_count}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Donation Card */}
      <View style={[styles.donationCard, { backgroundColor: colors.topLayer, borderColor: colors.border }]}>
        <MaterialCommunityIcons name="heart" size={28} color={colors.accent} />
        <Text style={[styles.donationTitle, { color: colors.text }]}>Support RoMM Connect</Text>
        <Text style={[styles.donationText, { color: colors.textSecondary }]}>
          This app is free and open source. If you enjoy it, consider buying the developer a coffee!
        </Text>
        <TouchableOpacity
          style={[styles.donationButton, { backgroundColor: colors.accent }]}
          onPress={() => {
            Linking.openURL('https://www.paypal.com/donate/?hosted_button_id=&business=cleyvin@hotmail.com&currency_code=USD');
          }}
        >
          <MaterialCommunityIcons name="hand-heart" size={18} color="#fff" />
          <Text style={styles.donationButtonText}>Donate via PayPal</Text>
        </TouchableOpacity>
        <Text style={[styles.donationFooter, { color: colors.gray }]}>by Cleyvin @ 2026</Text>
      </View>
    </ScrollView>
  );
};

const StatCard = ({ colors, icon, label, value, color }: { colors: any; icon: string; label: string; value: string; color: string }) => (
  <View style={[styles.statCard, { backgroundColor: colors.topLayer, borderColor: colors.border }]}>
    <MaterialCommunityIcons name={icon as any} size={24} color={color} />
    <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  greeting: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  greetingText: { fontSize: fontSize.md },
  userName: { fontSize: fontSize.xxl, fontWeight: '700' },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  scanStatusText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginLeft: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.md,
  },
  statCard: {
    width: '46%',
    margin: '2%',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
  statValue: { fontSize: fontSize.xl, fontWeight: '700', marginTop: spacing.xs },
  statLabel: { fontSize: fontSize.sm, marginTop: 2 },
  section: { marginTop: spacing.md },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    marginLeft: 8,
  },
  horizontalList: {
    paddingHorizontal: spacing.sm,
  },
  horizontalCard: {
    width: 120,
  },
  romGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.sm,
  },
  platformScroll: { paddingLeft: spacing.md },
  platformChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginRight: spacing.sm,
  },
  platformChipText: { fontSize: fontSize.sm, fontWeight: '600', marginLeft: 6, maxWidth: 100 },
  platformChipCount: { fontSize: fontSize.xs, marginLeft: 6 },
  donationCard: {
    margin: spacing.md,
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
  donationTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  donationText: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  donationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: borderRadius.lg,
    marginTop: spacing.md,
  },
  donationButtonText: {
    color: '#fff',
    fontSize: fontSize.md,
    fontWeight: '700',
    marginLeft: 8,
  },
  donationFooter: {
    fontSize: fontSize.xs,
    marginTop: spacing.sm,
  },
});

export default HomeScreen;

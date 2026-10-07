// by Cleyvin

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useApp } from '../../store/AppContext';
import { describeError, getPlatforms, getRoms, getStats, httpStatus, startScan, waitForTask } from '../../api';
import { queryKeys } from '../../api/queryClient';
import { LINKS, SCOPES } from '../../constants';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useRefetchOnFocus } from '../../hooks/useRefetchOnFocus';
import { Rom, RootStackParamList } from '../../types';
import { formatFileSize, platformName } from '../../utils';
import { spacing, borderRadius, fontSize, IconName, ThemeColors } from '../../theme';
import RomCard from '../../components/cards/RomCard';
import PlatformIcon from '../../components/common/PlatformIcon';
import SearchBar from '../../components/common/SearchBar';
import RomGrid from '../../components/common/RomGrid';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import LoadingScreen from '../../components/common/LoadingScreen';

type ScanState = { phase: 'running' | 'done' | 'failed'; message: string } | null;

const SHELF_CARD_WIDTH = 112;

const HomeScreen = () => {
  const { colors, user, can } = useApp();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const searchTerm = useDebouncedValue(search.trim());
  const [scan, setScan] = useState<ScanState>(null);
  const unmounted = useRef(false);

  useEffect(
    () => () => {
      unmounted.current = true;
    },
    [],
  );

  const stats = useQuery({ queryKey: queryKeys.stats, queryFn: getStats });
  const platforms = useQuery({ queryKey: queryKeys.platforms, queryFn: getPlatforms });
  const recentlyPlayed = useQuery({
    queryKey: queryKeys.roms({ shelf: 'played' }),
    queryFn: () => getRoms({ played: true, orderBy: 'last_played', orderDir: 'desc', limit: 12 }),
    select: (page) => page.items.filter((rom) => rom.rom_user?.last_played),
  });
  const recentlyAdded = useQuery({
    queryKey: queryKeys.roms({ shelf: 'added' }),
    queryFn: () => getRoms({ orderBy: 'id', orderDir: 'desc', limit: 12 }),
    select: (page) => page.items,
  });
  const results = useQuery({
    queryKey: queryKeys.roms({ searchTerm }),
    queryFn: () => getRoms({ searchTerm, limit: 48 }),
    enabled: searchTerm.length > 0,
    select: (page) => page.items,
  });

  const refreshAll = useCallback(() => {
    stats.refetch();
    platforms.refetch();
    recentlyPlayed.refetch();
    recentlyAdded.refetch();
  }, [stats.refetch, platforms.refetch, recentlyPlayed.refetch, recentlyAdded.refetch]);
  useRefetchOnFocus(refreshAll);

  const openRom = useCallback((rom: Rom) => navigation.navigate('RomDetail', { romId: rom.id }), [navigation]);

  const handleScan = async () => {
    setScan({ phase: 'running', message: 'Scanning library…' });
    try {
      const task = await startScan();
      const ok = task ? await waitForTask(task.task_id, () => unmounted.current) : true;
      if (unmounted.current) return;
      await queryClient.invalidateQueries();
      setScan(
        ok
          ? { phase: 'done', message: task ? 'Library scan finished' : 'Library scan started on the server' }
          : { phase: 'failed', message: 'The scan did not finish. Check the server logs.' },
      );
    } catch (err) {
      if (unmounted.current) return;
      const message =
        httpStatus(err) === 409 ? 'A scan is already running on the server' : describeError(err, 'Could not start the scan');
      setScan({ phase: 'failed', message });
    }
  };

  const searching = search.trim().length > 0;
  const refreshing =
    stats.isRefetching || platforms.isRefetching || recentlyPlayed.isRefetching || recentlyAdded.isRefetching;
  const loadFailed = stats.isError && platforms.isError && recentlyAdded.isError;
  const firstLoad = stats.isPending && platforms.isPending && recentlyAdded.isPending;
  const topPlatforms = [...(platforms.data ?? [])].sort((a, b) => b.rom_count - a.rom_count).slice(0, 12);
  const libraryEmpty = !!stats.data && stats.data.ROMS === 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 12 }]}>
      <View style={styles.greeting}>
        <View style={styles.greetingTextWrap}>
          <Text style={[styles.greetingText, { color: colors.textSecondary }]}>Welcome back,</Text>
          <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
            {user?.username || 'Player'}
          </Text>
        </View>
        {can(SCOPES.TASKS_RUN) && (
          <HeaderButton
            colors={colors}
            icon="magnify-scan"
            label="Scan library"
            busy={scan?.phase === 'running'}
            onPress={handleScan}
          />
        )}
        {can(SCOPES.ROMS_WRITE) && (
          <HeaderButton colors={colors} icon="upload" label="Upload ROM" onPress={() => navigation.navigate('Upload')} />
        )}
      </View>

      <SearchBar value={search} onChangeText={setSearch} placeholder="Search all ROMs" />

      {scan && (
        <View style={[styles.scanBanner, { backgroundColor: colors.topLayer, borderColor: colors.border }]}>
          {scan.phase === 'running' ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <MaterialCommunityIcons
              name={scan.phase === 'done' ? 'check-circle' : 'alert-circle'}
              size={18}
              color={scan.phase === 'done' ? colors.success : colors.error}
            />
          )}
          <Text style={[styles.scanText, { color: colors.text }]}>{scan.message}</Text>
          {scan.phase !== 'running' && (
            <TouchableOpacity onPress={() => setScan(null)} hitSlop={12} accessibilityLabel="Dismiss">
              <MaterialCommunityIcons name="close" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {searching ? (
        results.isError ? (
          <ErrorState error={results.error} onRetry={() => results.refetch()} />
        ) : !results.data || searchTerm !== search.trim() ? (
          <LoadingScreen />
        ) : (
          <RomGrid
            roms={results.data}
            empty={<EmptyState icon="magnify-close" title="No matches" subtitle={`No ROM matches “${searchTerm}”.`} />}
          />
        )
      ) : firstLoad ? (
        <LoadingScreen />
      ) : loadFailed ? (
        <ErrorState error={stats.error} onRetry={refreshAll} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refreshAll} tintColor={colors.primary} colors={[colors.primary]} />
          }
        >
          {stats.data && (
            <View style={styles.statsGrid}>
              <StatCard colors={colors} icon="gamepad-variant" label="Platforms" value={String(stats.data.PLATFORMS ?? 0)} tint={colors.primary} />
              <StatCard colors={colors} icon="disc" label="ROMs" value={(stats.data.ROMS ?? 0).toLocaleString()} tint={colors.accent} />
              <StatCard
                colors={colors}
                icon="content-save"
                label="Saves & states"
                value={String((stats.data.SAVES ?? 0) + (stats.data.STATES ?? 0))}
                tint={colors.success}
              />
              <StatCard colors={colors} icon="harddisk" label="Library size" value={formatFileSize(stats.data.TOTAL_FILESIZE_BYTES)} tint={colors.info} />
            </View>
          )}

          {libraryEmpty && (
            <EmptyState
              icon="disc-alert"
              title="Your library is empty"
              subtitle="Add ROMs to your server, then scan the library to see them here."
            />
          )}

          <Shelf colors={colors} icon="history" title="Continue playing" roms={recentlyPlayed.data} onPress={openRom} />
          <Shelf colors={colors} icon="new-box" title="Recently added" roms={recentlyAdded.data} onPress={openRom} />

          {topPlatforms.length > 0 && (
            <View style={styles.section}>
              <SectionTitle colors={colors} icon="gamepad-variant" title="Platforms" />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shelfContent}>
                {topPlatforms.map((platform) => (
                  <TouchableOpacity
                    key={platform.id}
                    onPress={() => navigation.navigate('RomGallery', { title: platformName(platform), platformId: platform.id })}
                    style={[styles.platformChip, { backgroundColor: colors.topLayer, borderColor: colors.border }]}
                  >
                    <PlatformIcon platform={platform} size={20} />
                    <Text style={[styles.platformChipText, { color: colors.text }]} numberOfLines={1}>
                      {platformName(platform)}
                    </Text>
                    <Text style={[styles.platformChipCount, { color: colors.textSecondary }]}>{platform.rom_count}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={[styles.donationCard, { backgroundColor: colors.topLayer, borderColor: colors.border }]}>
            <MaterialCommunityIcons name="heart" size={24} color={colors.accent} />
            <View style={styles.donationBody}>
              <Text style={[styles.donationTitle, { color: colors.text }]}>Enjoying RoMM Connect?</Text>
              <Text style={[styles.donationText, { color: colors.textSecondary }]}>
                It is free and open source. A donation keeps it going.
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.donationButton, { backgroundColor: colors.accent }]}
              onPress={() => Linking.openURL(LINKS.DONATE)}
            >
              <Text style={styles.donationButtonText}>Donate</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </View>
  );
};

const HeaderButton = ({
  colors,
  icon,
  label,
  busy,
  onPress,
}: {
  colors: ThemeColors;
  icon: IconName;
  label: string;
  busy?: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={busy}
    style={[styles.headerButton, { backgroundColor: colors.topLayer }]}
    accessibilityRole="button"
    accessibilityLabel={label}
  >
    {busy ? <ActivityIndicator size="small" color={colors.primary} /> : <MaterialCommunityIcons name={icon} size={22} color={colors.primary} />}
  </TouchableOpacity>
);

const SectionTitle = ({ colors, icon, title }: { colors: ThemeColors; icon: IconName; title: string }) => (
  <View style={styles.sectionHeader}>
    <MaterialCommunityIcons name={icon} size={20} color={colors.primary} />
    <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
  </View>
);

const Shelf = ({
  colors,
  icon,
  title,
  roms,
  onPress,
}: {
  colors: ThemeColors;
  icon: IconName;
  title: string;
  roms: Rom[] | undefined;
  onPress: (rom: Rom) => void;
}) => {
  if (!roms?.length) return null;
  return (
    <View style={styles.section}>
      <SectionTitle colors={colors} icon={icon} title={title} />
      <FlatList
        horizontal
        data={roms}
        keyExtractor={(item) => String(item.id)}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.shelfContent}
        renderItem={({ item }) => <RomCard rom={item} width={SHELF_CARD_WIDTH} onPress={onPress} />}
      />
    </View>
  );
};

const StatCard = ({
  colors,
  icon,
  label,
  value,
  tint,
}: {
  colors: ThemeColors;
  icon: IconName;
  label: string;
  value: string;
  tint: string;
}) => (
  <View style={[styles.statCard, { backgroundColor: colors.topLayer, borderColor: colors.border }]}>
    <MaterialCommunityIcons name={icon} size={22} color={tint} />
    <View style={styles.statBody}>
      <Text style={[styles.statValue, { color: colors.text }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  greeting: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    gap: 8,
  },
  greetingTextWrap: { flex: 1 },
  greetingText: { fontSize: fontSize.md },
  userName: { fontSize: fontSize.xxl, fontWeight: '700' },
  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: 12,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  scanText: { flex: 1, fontSize: fontSize.md },
  scrollContent: { paddingBottom: spacing.lg, flexGrow: 1 },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  statCard: {
    flexGrow: 1,
    flexBasis: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  statBody: { flex: 1 },
  statValue: { fontSize: fontSize.xl, fontWeight: '700' },
  statLabel: { fontSize: fontSize.sm, marginTop: 1 },
  section: { marginTop: spacing.lg },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionTitle: { fontSize: fontSize.xl, fontWeight: '700' },
  shelfContent: { paddingHorizontal: spacing.md, gap: spacing.sm },
  platformChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  platformChipText: { fontSize: fontSize.sm, fontWeight: '600', maxWidth: 130 },
  platformChipCount: { fontSize: fontSize.sm },
  donationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: spacing.md,
    marginTop: spacing.xl,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  donationBody: { flex: 1 },
  donationTitle: { fontSize: fontSize.md, fontWeight: '700' },
  donationText: { fontSize: fontSize.sm, marginTop: 2, lineHeight: 17 },
  donationButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: borderRadius.lg,
  },
  donationButtonText: { color: '#fff', fontSize: fontSize.md, fontWeight: '700' },
});

export default HomeScreen;

// by Cleyvin

import React, { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useApp } from '../../store/AppContext';
import { getPlatforms } from '../../api';
import { queryKeys } from '../../api/queryClient';
import { useGridLayout } from '../../hooks/useGridLayout';
import { useRefetchOnFocus } from '../../hooks/useRefetchOnFocus';
import { Platform, RootStackParamList } from '../../types';
import { formatCount, platformName } from '../../utils';
import { spacing } from '../../theme';
import PlatformCard from '../../components/cards/PlatformCard';
import LoadingScreen from '../../components/common/LoadingScreen';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import ScreenHeader from '../../components/common/ScreenHeader';
import SearchBar from '../../components/common/SearchBar';

const PADDING = spacing.md;
const GAP = spacing.sm;

const PlatformsScreen = () => {
  const { colors } = useApp();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [search, setSearch] = useState('');
  const { columns, itemWidth } = useGridLayout(150, PADDING, GAP, 2);

  const query = useQuery({ queryKey: queryKeys.platforms, queryFn: getPlatforms });
  useRefetchOnFocus(query.refetch);

  const platforms = useMemo(() => {
    const term = search.trim().toLowerCase();
    return [...(query.data ?? [])]
      .filter((platform) => !term || platformName(platform).toLowerCase().includes(term))
      .sort((a, b) => platformName(a).localeCompare(platformName(b)));
  }, [query.data, search]);

  const openPlatform = useCallback(
    (platform: Platform) =>
      navigation.navigate('RomGallery', { title: platformName(platform), platformId: platform.id }),
    [navigation],
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title="Platforms"
        subtitle={query.data ? formatCount(query.data.length, 'platform') : undefined}
      />

      {query.isPending ? (
        <LoadingScreen />
      ) : query.isError && !query.data ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : (
        <>
          <SearchBar value={search} onChangeText={setSearch} placeholder="Search platforms" />
          <FlatList
            key={columns}
            data={platforms}
            keyExtractor={(item) => String(item.id)}
            numColumns={columns}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            refreshControl={
              <RefreshControl
                refreshing={query.isRefetching}
                onRefresh={() => query.refetch()}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            }
            renderItem={({ item }) => <PlatformCard platform={item} width={itemWidth} onPress={openPlatform} />}
            ListEmptyComponent={
              <EmptyState
                icon="gamepad-variant-outline"
                title={search ? 'No matches' : 'No platforms yet'}
                subtitle={search ? undefined : 'Add ROMs to your server and scan the library.'}
              />
            }
          />
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { paddingHorizontal: PADDING, paddingBottom: spacing.lg, flexGrow: 1 },
  row: { gap: GAP, marginBottom: GAP },
});

export default PlatformsScreen;

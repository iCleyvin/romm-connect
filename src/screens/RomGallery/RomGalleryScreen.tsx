// by Cleyvin

import React, { useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useApp } from '../../store/AppContext';
import { getRoms } from '../../api';
import { queryKeys } from '../../api/queryClient';
import { ROM_PAGE_SIZE } from '../../constants';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { RootStackParamList } from '../../types';
import { formatCount } from '../../utils';
import ScreenHeader from '../../components/common/ScreenHeader';
import SearchBar from '../../components/common/SearchBar';
import RomGrid from '../../components/common/RomGrid';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import LoadingScreen from '../../components/common/LoadingScreen';

const RomGalleryScreen = () => {
  const { colors } = useApp();
  const navigation = useNavigation();
  const { title, platformId, collectionId, smartCollectionId } =
    useRoute<RouteProp<RootStackParamList, 'RomGallery'>>().params;
  const [search, setSearch] = useState('');
  const searchTerm = useDebouncedValue(search.trim());

  const scope = useMemo(
    () => ({ platformId, collectionId, smartCollectionId, searchTerm }),
    [platformId, collectionId, smartCollectionId, searchTerm],
  );

  const query = useInfiniteQuery({
    queryKey: queryKeys.roms(scope),
    queryFn: ({ pageParam }) =>
      getRoms({
        ...scope,
        // With a search term the server ranks by relevance unless told otherwise.
        orderBy: searchTerm ? undefined : 'name',
        orderDir: 'asc',
        offset: pageParam,
        limit: ROM_PAGE_SIZE,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => {
      const loaded = pages.reduce((count, page) => count + page.items.length, 0);
      const more = lastPage.total != null ? loaded < lastPage.total : lastPage.items.length === ROM_PAGE_SIZE;
      return more && lastPage.items.length > 0 ? loaded : undefined;
    },
  });

  const roms = useMemo(() => {
    // Pages can overlap if the library changes between requests.
    const seen = new Set<number>();
    return (query.data?.pages ?? []).flatMap((page) => page.items).filter((rom) => !seen.has(rom.id) && seen.add(rom.id));
  }, [query.data]);
  const total = query.data?.pages[0]?.total;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title={title}
        subtitle={total != null ? formatCount(total, 'ROM') : undefined}
        onBack={() => navigation.goBack()}
      />
      <SearchBar value={search} onChangeText={setSearch} placeholder={`Search in ${title}`} />

      {query.isPending ? (
        <LoadingScreen />
      ) : query.isError && roms.length === 0 ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : (
        <RomGrid
          roms={roms}
          refreshing={query.isRefetching && !query.isFetchingNextPage}
          onRefresh={() => query.refetch()}
          onEndReached={() => {
            if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage();
          }}
          loadingMore={query.isFetchingNextPage}
          empty={
            <EmptyState
              icon="disc-alert"
              title={searchTerm ? 'No matches' : 'Nothing here yet'}
              subtitle={searchTerm ? `No ROM matches “${searchTerm}”.` : 'This section has no ROMs.'}
            />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
});

export default RomGalleryScreen;

// by Cleyvin

import React, { useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useApp } from '../../store/AppContext';
import { getCollections, getSmartCollections } from '../../api';
import { queryKeys } from '../../api/queryClient';
import { useRefetchOnFocus } from '../../hooks/useRefetchOnFocus';
import { Collection, RootStackParamList } from '../../types';
import { formatCount } from '../../utils';
import { spacing } from '../../theme';
import CollectionCard from '../../components/cards/CollectionCard';
import ScreenHeader from '../../components/common/ScreenHeader';
import LoadingScreen from '../../components/common/LoadingScreen';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';

const fetchAllCollections = async (): Promise<Collection[]> => {
  const [regular, smart] = await Promise.all([getCollections(), getSmartCollections()]);
  return [...regular, ...smart].sort(
    (a, b) => Number(b.is_favorite ?? false) - Number(a.is_favorite ?? false) || a.name.localeCompare(b.name),
  );
};

const CollectionsScreen = () => {
  const { colors } = useApp();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const query = useQuery({ queryKey: queryKeys.collections, queryFn: fetchAllCollections });
  useRefetchOnFocus(query.refetch);

  const openCollection = useCallback(
    (collection: Collection) =>
      navigation.navigate('RomGallery', {
        title: collection.name,
        ...(collection.is_smart ? { smartCollectionId: collection.id } : { collectionId: collection.id }),
      }),
    [navigation],
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title="Collections"
        subtitle={query.data ? formatCount(query.data.length, 'collection') : undefined}
      />

      {query.isPending ? (
        <LoadingScreen />
      ) : query.isError && !query.data ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : (
        <FlatList
          data={query.data}
          keyExtractor={(item) => `${item.is_smart ? 'smart' : 'regular'}-${item.id}`}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={query.isRefetching}
              onRefresh={() => query.refetch()}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          renderItem={({ item }) => <CollectionCard collection={item} onPress={openCollection} />}
          ListEmptyComponent={
            <EmptyState
              icon="folder-multiple-outline"
              title="No collections yet"
              subtitle="Collections you create in RoMM show up here."
            />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { paddingTop: spacing.md, paddingBottom: spacing.lg, flexGrow: 1 },
});

export default CollectionsScreen;

// by Cleyvin

import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useApp } from '../../store/AppContext';
import { getCollections } from '../../api';
import { Collection } from '../../types';
import CollectionCard from '../../components/cards/CollectionCard';
import ScreenHeader from '../../components/common/ScreenHeader';
import LoadingScreen from '../../components/common/LoadingScreen';
import EmptyState from '../../components/common/EmptyState';
import { spacing } from '../../theme';

const CollectionsScreen = () => {
  const { colors } = useApp();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCollections = async () => {
    try {
      const data = await getCollections();
      setCollections(data);
    } catch (err) {
      console.error('Failed to fetch collections:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchCollections();
    }, [])
  );

  if (loading) return <LoadingScreen message="Loading collections..." />;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Collections" subtitle={`${collections.length} collections`} />

      <FlatList
        data={collections}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchCollections(); }}
            tintColor={colors.primary}
          />
        }
        renderItem={({ item }) => (
          <CollectionCard
            collection={item}
            onPress={() => Alert.alert(item.name, item.description || 'No description')}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="folder-multiple-outline"
            title="No collections yet"
            subtitle="Create collections on your RoMM server"
          />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: {
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
});

export default CollectionsScreen;

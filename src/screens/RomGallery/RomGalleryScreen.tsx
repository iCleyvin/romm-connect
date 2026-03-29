// by Cleyvin

import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useApp } from '../../store/AppContext';
import { getRoms } from '../../api';
import { Rom, RootStackParamList } from '../../types';
import { spacing, borderRadius, fontSize } from '../../theme';
import RomCard from '../../components/cards/RomCard';
import ScreenHeader from '../../components/common/ScreenHeader';
import EmptyState from '../../components/common/EmptyState';
import { ROM_PAGE_SIZE } from '../../constants';

const RomGalleryScreen = () => {
  const { colors } = useApp();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'RomGallery'>>();
  const { platformId, platformName } = route.params;

  const [roms, setRoms] = useState<Rom[]>([]);
  const [search, setSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRoms = async (currentOffset: number = 0, append: boolean = false) => {
    try {
      const data = await getRoms({
        platform_id: platformId,
        search_term: search.trim() || undefined,
        offset: currentOffset,
        limit: ROM_PAGE_SIZE,
        order_by: 'name',
        order_dir: 'asc',
      });
      const items = data.items || [];
      setRoms(prev => append ? [...prev, ...items] : items);
      setTotal(data.total || 0);
      setOffset(currentOffset + items.length);
    } catch (err) {
      console.error('Failed to fetch ROMs:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    setOffset(0);
    fetchRoms(0, false);
  }, [search]);

  const onRefresh = () => {
    setRefreshing(true);
    setOffset(0);
    fetchRoms(0, false);
  };

  const onEndReached = () => {
    if (offset < total && !loadingMore) {
      setLoadingMore(true);
      fetchRoms(offset, true);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title={platformName}
        subtitle={`${roms.length} ROMs`}
        onBack={() => navigation.goBack()}
      />

      <View style={[styles.searchContainer, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
        <MaterialCommunityIcons name="magnify" size={20} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search ROMs..."
          placeholderTextColor={colors.placeholder}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={roms}
        keyExtractor={(item) => item.id.toString()}
        numColumns={3}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.3}
        renderItem={({ item }) => (
          <RomCard
            rom={item}
            onPress={() => navigation.navigate('RomDetail', { romId: item.id })}
          />
        )}
        ListEmptyComponent={
          loading ? null : (
            <EmptyState icon="disc-alert" title="No ROMs found" subtitle="Try adjusting your search" />
          )
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footer}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : null
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: spacing.md,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: fontSize.md,
  },
  list: {
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.lg,
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});

export default RomGalleryScreen;

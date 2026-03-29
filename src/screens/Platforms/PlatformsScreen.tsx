// by Cleyvin

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useApp } from '../../store/AppContext';
import { getPlatforms } from '../../api';
import { Platform as PlatformType, RootStackParamList } from '../../types';
import { spacing, borderRadius, fontSize } from '../../theme';
import PlatformCard from '../../components/cards/PlatformCard';
import LoadingScreen from '../../components/common/LoadingScreen';
import EmptyState from '../../components/common/EmptyState';
import ScreenHeader from '../../components/common/ScreenHeader';

const PlatformsScreen = () => {
  const { colors } = useApp();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [platforms, setPlatforms] = useState<PlatformType[]>([]);
  const [filtered, setFiltered] = useState<PlatformType[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPlatforms = async () => {
    try {
      const data = await getPlatforms();
      const sorted = data.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setPlatforms(sorted);
      setFiltered(sorted);
    } catch (err) {
      console.error('Failed to fetch platforms:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchPlatforms();
    }, [])
  );

  useEffect(() => {
    if (search.trim()) {
      const term = search.toLowerCase();
      setFiltered(platforms.filter((p) =>
        (p.name || '').toLowerCase().includes(term) ||
        (p.custom_name || '').toLowerCase().includes(term)
      ));
    } else {
      setFiltered(platforms);
    }
  }, [search, platforms]);

  if (loading) return <LoadingScreen message="Loading platforms..." />;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Platforms" subtitle={`${platforms.length} platforms`} />

      <View style={[styles.searchContainer, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
        <MaterialCommunityIcons name="magnify" size={20} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search platforms..."
          placeholderTextColor={colors.placeholder}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchPlatforms(); }} tintColor={colors.primary} />
        }
        renderItem={({ item }) => (
          <PlatformCard
            platform={item}
            onPress={() =>
              navigation.navigate('RomGallery', {
                platformId: item.id,
                platformName: item.custom_name || item.name,
                platformSlug: item.slug,
              })
            }
          />
        )}
        ListEmptyComponent={
          <EmptyState icon="gamepad-variant-outline" title="No platforms found" subtitle="Pull to refresh or check your server" />
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
});

export default PlatformsScreen;

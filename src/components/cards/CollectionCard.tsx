// by Cleyvin

import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useApp } from '../../store/AppContext';
import { Collection } from '../../types';
import { formatCount, resourceUrl } from '../../utils';
import { borderRadius, spacing } from '../../theme';
import RemoteImage from '../common/RemoteImage';

interface Props {
  collection: Collection;
  onPress: (collection: Collection) => void;
}

const CollectionCard = ({ collection, onPress }: Props) => {
  const { colors, serverUrl } = useApp();
  const covers = [collection.path_cover_small, collection.path_covers_small?.[0]].map((path) =>
    resourceUrl(serverUrl, path),
  );

  return (
    <TouchableOpacity
      onPress={() => onPress(collection)}
      activeOpacity={0.7}
      style={[styles.container, { backgroundColor: colors.topLayer, borderColor: colors.border }]}
      accessibilityRole="button"
      accessibilityLabel={collection.name}
    >
      <RemoteImage
        sources={[...covers, collection.url_cover]}
        style={[styles.cover, { backgroundColor: colors.surface }]}
        fallback={
          <View style={styles.coverFallback}>
            <MaterialCommunityIcons
              name={collection.is_smart ? 'auto-fix' : 'folder-multiple'}
              size={32}
              color={colors.primary}
            />
          </View>
        }
      />
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {collection.name}
        </Text>
        {!!collection.description && (
          <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>
            {collection.description}
          </Text>
        )}
        <View style={styles.metaRow}>
          <Text style={[styles.count, { color: colors.textSecondary }]}>
            {formatCount(collection.rom_count ?? 0, 'ROM')}
            {collection.is_smart ? ' · Smart' : ''}
          </Text>
          {collection.is_favorite && <MaterialCommunityIcons name="star" size={14} color={colors.warning} />}
        </View>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textSecondary} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.sm,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  cover: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.md,
  },
  coverFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
  },
  description: {
    fontSize: 12,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  count: {
    fontSize: 12,
  },
});

export default memo(CollectionCard);

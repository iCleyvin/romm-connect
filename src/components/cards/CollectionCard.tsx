// by Cleyvin

import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useApp } from '../../store/AppContext';
import { Collection } from '../../types';
import { getCoverUrl, isServerAssetUrl } from '../../utils';
import { useImageAuthHeaders } from '../../hooks/useAuthHeaders';
import { borderRadius, spacing } from '../../theme';

interface Props {
  collection: Collection;
  onPress: () => void;
}

const CollectionCard = ({ collection, onPress }: Props) => {
  const { colors, serverConfig } = useApp();
  const authHeaders = useImageAuthHeaders();
  const coverUrl = getCoverUrl(serverConfig, collection.url_cover);
  const coverSource = coverUrl
    ? { uri: coverUrl, headers: isServerAssetUrl(serverConfig, coverUrl) ? authHeaders : undefined }
    : undefined;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.container, { backgroundColor: colors.topLayer, borderColor: colors.border }]}
    >
      <View style={[styles.coverContainer, { backgroundColor: colors.surface }]}>
        {coverSource ? (
          <Image source={coverSource} style={styles.cover} resizeMode="cover" />
        ) : (
          <MaterialCommunityIcons name="folder-multiple" size={36} color={colors.primary} />
        )}
      </View>
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {collection.name}
        </Text>
        {collection.description && (
          <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>
            {collection.description}
          </Text>
        )}
        <View style={styles.metaRow}>
          <MaterialCommunityIcons name="disc" size={12} color={colors.textSecondary} />
          <Text style={[styles.count, { color: colors.textSecondary }]}>
            {collection.rom_count ?? collection.roms?.length ?? 0} ROMs
          </Text>
          {collection.is_favorite && (
            <MaterialCommunityIcons name="star" size={14} color={colors.warning} style={{ marginLeft: 8 }} />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.sm,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  coverContainer: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  cover: {
    width: 60,
    height: 60,
  },
  info: {
    flex: 1,
    marginLeft: spacing.sm,
    justifyContent: 'center',
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
    marginTop: 4,
  },
  count: {
    fontSize: 11,
    marginLeft: 4,
  },
});

export default CollectionCard;

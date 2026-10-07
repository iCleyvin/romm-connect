// by Cleyvin

import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useApp } from '../../store/AppContext';
import { Platform } from '../../types';
import { formatCount, formatFileSize, platformName } from '../../utils';
import { borderRadius, spacing } from '../../theme';
import PlatformIcon from '../common/PlatformIcon';

interface Props {
  platform: Platform;
  width: number;
  onPress: (platform: Platform) => void;
}

const PlatformCard = ({ platform, width, onPress }: Props) => {
  const { colors } = useApp();

  return (
    <TouchableOpacity
      onPress={() => onPress(platform)}
      activeOpacity={0.7}
      style={[styles.container, { width, backgroundColor: colors.topLayer, borderColor: colors.border }]}
      accessibilityRole="button"
      accessibilityLabel={platformName(platform)}
    >
      <PlatformIcon platform={platform} size={56} />
      <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
        {platformName(platform)}
      </Text>
      <View style={[styles.badge, { backgroundColor: colors.primary + '20' }]}>
        <Text style={[styles.badgeText, { color: colors.primary }]}>{formatCount(platform.rom_count, 'ROM')}</Text>
      </View>
      {platform.fs_size_bytes > 0 && (
        <Text style={[styles.size, { color: colors.textSecondary }]}>{formatFileSize(platform.fs_size_bytes)}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    minHeight: 164,
  },
  name: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    flexGrow: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.round,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  size: {
    fontSize: 11,
    marginTop: 4,
  },
});

export default memo(PlatformCard);

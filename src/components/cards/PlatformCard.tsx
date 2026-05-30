// by Cleyvin

import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useApp } from '../../store/AppContext';
import { Platform } from '../../types';
import { getCoverUrl, isServerAssetUrl, formatFileSize } from '../../utils';
import { useImageAuthHeaders } from '../../hooks/useAuthHeaders';
import { borderRadius, spacing } from '../../theme';

interface Props {
  platform: Platform;
  onPress: () => void;
}

const PlatformCard = ({ platform, onPress }: Props) => {
  const { colors, serverConfig } = useApp();
  const authHeaders = useImageAuthHeaders();
  const logoUrl = platform.url_logo?.startsWith('http') ? platform.url_logo : getCoverUrl(serverConfig, platform.url_logo);
  const logoSource = logoUrl
    ? { uri: logoUrl, headers: isServerAssetUrl(serverConfig, logoUrl) ? authHeaders : undefined }
    : undefined;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.container, { backgroundColor: colors.topLayer, borderColor: colors.border }]}
    >
      <View style={styles.iconContainer}>
        {logoSource ? (
          <Image source={logoSource} style={styles.logo} resizeMode="contain" />
        ) : (
          <MaterialCommunityIcons name="gamepad-variant" size={48} color={colors.primary} />
        )}
      </View>
      <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
        {platform.custom_name || platform.name}
      </Text>
      <View style={styles.metaRow}>
        <View style={[styles.badge, { backgroundColor: colors.primary + '20' }]}>
          <Text style={[styles.badgeText, { color: colors.primary }]}>
            {platform.rom_count} ROMs
          </Text>
        </View>
      </View>
      {platform.fs_size_bytes > 0 && (
        <Text style={[styles.size, { color: colors.textSecondary }]}>
          {formatFileSize(platform.fs_size_bytes)}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    margin: spacing.xs,
    alignItems: 'center',
    borderWidth: 1,
    flex: 1,
    minHeight: 160,
  },
  iconContainer: {
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  logo: {
    width: 56,
    height: 56,
  },
  name: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 'auto',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.round,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  size: {
    fontSize: 10,
    marginTop: 4,
  },
});

export default PlatformCard;

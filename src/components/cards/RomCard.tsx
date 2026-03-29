// by Cleyvin

import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useApp } from '../../store/AppContext';
import { useCredentials } from '../../hooks/useAuthHeaders';
import { Rom } from '../../types';
import { getRomCoverUrl, formatFileSize } from '../../utils';
import { borderRadius, spacing } from '../../theme';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_MARGIN = 4;
const NUM_COLUMNS = 3;
const CARD_WIDTH = (SCREEN_WIDTH - (NUM_COLUMNS + 1) * CARD_MARGIN * 2 - 32) / NUM_COLUMNS;

interface Props {
  rom: Rom;
  onPress: () => void;
  aspectRatio?: string;
}

const RomCard = ({ rom, onPress, aspectRatio = '2/3' }: Props) => {
  const { colors, serverConfig } = useApp();
  const credentials = useCredentials();
  const coverUrl = getRomCoverUrl(serverConfig, rom, credentials || undefined);

  const parts = aspectRatio.split('/');
  const ratio = parts.length === 2 ? parseInt(parts[0]) / parseInt(parts[1]) : 2 / 3;
  const cardHeight = CARD_WIDTH / ratio;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.container, { width: CARD_WIDTH }]}
    >
      <View style={[styles.coverContainer, { height: cardHeight, backgroundColor: colors.topLayer }]}>
        {coverUrl ? (
          <Image source={{ uri: coverUrl }} style={styles.cover} resizeMode="cover" />
        ) : (
          <View style={[styles.noCover, { backgroundColor: colors.primaryDark + '40' }]}>
            <MaterialCommunityIcons name="gamepad-variant" size={20} color={colors.primary} style={{ marginBottom: 4 }} />
            <Text style={[styles.noCoverText, { color: colors.text }]} numberOfLines={3}>
              {rom.name}
            </Text>
          </View>
        )}
        {rom.rom_user?.now_playing && (
          <View style={[styles.playingBadge, { backgroundColor: colors.success }]}>
            <MaterialCommunityIcons name="play" size={10} color="#fff" />
          </View>
        )}
        {rom.regions && rom.regions.length > 0 && (
          <View style={[styles.regionBadge, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
            <Text style={styles.regionText}>{rom.regions[0]}</Text>
          </View>
        )}
      </View>
      <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
        {rom.name}
      </Text>
      <Text style={[styles.size, { color: colors.textSecondary }]}>
        {formatFileSize(rom.fs_size_bytes)}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: CARD_MARGIN,
    marginBottom: spacing.sm,
  },
  coverContainer: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  cover: {
    width: '100%',
    height: '100%',
  },
  noCover: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 6,
  },
  noCoverText: {
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 12,
  },
  playingBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  regionBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  regionText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '600',
  },
  name: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
    lineHeight: 14,
  },
  size: {
    fontSize: 9,
    marginTop: 2,
  },
});

export default RomCard;

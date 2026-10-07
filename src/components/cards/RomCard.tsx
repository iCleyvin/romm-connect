// by Cleyvin

import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useApp } from '../../store/AppContext';
import { Rom } from '../../types';
import { romCoverUrl, romTitle } from '../../utils';
import { borderRadius } from '../../theme';
import RemoteImage from '../common/RemoteImage';

interface Props {
  rom: Rom;
  width: number;
  onPress: (rom: Rom) => void;
}

const COVER_ASPECT = 3 / 4;

const RomCard = ({ rom, width, onPress }: Props) => {
  const { colors, serverUrl } = useApp();
  const title = romTitle(rom);

  return (
    <TouchableOpacity
      onPress={() => onPress(rom)}
      activeOpacity={0.8}
      style={{ width }}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <View style={[styles.coverContainer, { height: width / COVER_ASPECT, backgroundColor: colors.topLayer }]}>
        <RemoteImage
          sources={[romCoverUrl(serverUrl, rom), rom.url_cover]}
          style={styles.cover}
          fallback={
            <View style={[styles.noCover, { backgroundColor: colors.primaryDark + '40' }]}>
              <MaterialCommunityIcons name="gamepad-variant" size={22} color={colors.primary} />
              <Text style={[styles.noCoverText, { color: colors.text }]} numberOfLines={3}>
                {title}
              </Text>
            </View>
          }
        />
        {rom.rom_user?.now_playing && (
          <View style={[styles.playingBadge, { backgroundColor: colors.success }]}>
            <MaterialCommunityIcons name="play" size={10} color="#fff" />
          </View>
        )}
        {!!rom.regions?.length && (
          <View style={styles.regionBadge}>
            <Text style={styles.regionText}>{rom.regions[0]}</Text>
          </View>
        )}
      </View>
      <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
        {title}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
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
    gap: 4,
  },
  noCoverText: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 13,
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
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  regionText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '600',
  },
  name: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
    lineHeight: 15,
    minHeight: 30,
  },
});

export default memo(RomCard);

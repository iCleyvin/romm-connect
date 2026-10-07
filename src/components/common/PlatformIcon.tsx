// by Cleyvin

import React from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useApp } from '../../store/AppContext';
import { Platform } from '../../types';
import RemoteImage from './RemoteImage';

interface Props {
  platform: Pick<Platform, 'slug' | 'fs_slug'>;
  size: number;
}

// RoMM ships one icon per platform, as SVG for some and ICO for the rest.
const PlatformIcon = ({ platform, size }: Props) => {
  const { colors, serverUrl } = useApp();
  const base = serverUrl ? `${serverUrl}/assets/platforms/` : null;
  const names = [...new Set([platform.fs_slug, platform.slug].filter(Boolean).map((slug) => slug.toLowerCase()))];
  const sources = base ? names.flatMap((name) => [`${base}${name}.svg`, `${base}${name}.ico`]) : [];

  return (
    <RemoteImage
      sources={sources}
      style={{ width: size, height: size }}
      contentFit="contain"
      fallback={<MaterialCommunityIcons name="gamepad-variant" size={size} color={colors.primary} />}
    />
  );
};

export default PlatformIcon;

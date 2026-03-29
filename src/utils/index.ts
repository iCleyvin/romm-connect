// by Cleyvin

import { getBaseUrl } from '../api/client';
import { ServerConfig } from '../types';

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

export const getCoverUrl = (
  serverConfig: ServerConfig | null,
  path?: string
): string | undefined => {
  if (!serverConfig || !path) return undefined;
  const base = getBaseUrl(serverConfig);
  if (path.startsWith('http')) return path;
  // RoMM serves assets from /assets/ path, strip leading /assets/ if present
  const cleanPath = path.startsWith('/assets/') ? path.slice(8) : path;
  return `${base}/api/raw/assets/${cleanPath}`;
};

export const getRomCoverUrl = (
  serverConfig: ServerConfig | null,
  rom: { path_cover_small?: string; path_cover_large?: string; url_cover?: string; path_cover_s?: string; path_cover_l?: string },
  credentials?: { username: string; password: string }
): string | undefined => {
  // Priority 1: External URL (IGDB etc.) - no auth needed
  if (rom.url_cover) return rom.url_cover;

  // Priority 2: Local cover with Basic Auth embedded in URL
  const localPath = rom.path_cover_small || rom.path_cover_large || rom.path_cover_s || rom.path_cover_l;
  if (localPath && serverConfig) {
    const protocol = serverConfig.useHttps ? 'https' : 'http';
    const port = serverConfig.port ? `:${serverConfig.port}` : '';
    let cleanPath = localPath.startsWith('/assets/') ? localPath.slice(8) : localPath;
    const qsIndex = cleanPath.indexOf('?');
    if (qsIndex > 0) cleanPath = cleanPath.substring(0, qsIndex);

    if (credentials) {
      return `${protocol}://${encodeURIComponent(credentials.username)}:${encodeURIComponent(credentials.password)}@${serverConfig.host}${port}/api/raw/assets/${encodeURI(cleanPath)}`;
    }
    return `${protocol}://${serverConfig.host}${port}/api/raw/assets/${encodeURI(cleanPath)}`;
  }

  return undefined;
};

export const getAspectRatio = (ratio: string): number => {
  const parts = ratio.split('/');
  if (parts.length === 2) {
    return parseInt(parts[0]) / parseInt(parts[1]);
  }
  return 2 / 3;
};

export const getPlatformIcon = (slug: string): string => {
  const iconMap: Record<string, string> = {
    'n64': 'gamepad-variant',
    'snes': 'gamepad-square',
    'nes': 'gamepad',
    'gb': 'gamepad-round',
    'gba': 'gamepad-round',
    'gbc': 'gamepad-round',
    'nds': 'nintendo-switch',
    'psx': 'sony-playstation',
    'ps2': 'sony-playstation',
    'psp': 'sony-playstation',
    'genesis': 'controller-classic',
    'megadrive': 'controller-classic',
    'dreamcast': 'controller-classic',
    'saturn': 'controller-classic',
    'arcade': 'pac-man',
    'mame': 'pac-man',
    'atari2600': 'space-invaders',
    '3ds': 'nintendo-switch',
    'wii': 'nintendo-wii-remote',
    'gamecube': 'gamepad-variant',
    'switch': 'nintendo-switch',
  };
  return iconMap[slug] || 'gamepad-variant-outline';
};

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
};

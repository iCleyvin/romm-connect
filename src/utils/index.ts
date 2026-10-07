// by Cleyvin

import { Platform, Rom } from '../types';

export const formatFileSize = (bytes: number | null | undefined): string => {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${parseFloat((bytes / Math.pow(1024, index)).toFixed(1))} ${units[index]}`;
};

export const formatCount = (count: number, singular: string): string =>
  `${count.toLocaleString()} ${singular}${count === 1 ? '' : 's'}`;

export const formatDate = (iso: string | null | undefined): string => {
  if (!iso) return '';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString();
};

const RESOURCES_PATH = '/assets/romm/resources/';

/**
 * Absolute URL for a cover, screenshot or other library resource. RoMM serves
 * these as static files (no auth) and returns server-relative paths; very old
 * servers return them relative to the resources folder.
 */
export const resourceUrl = (serverUrl: string | null, path: string | null | undefined): string | undefined => {
  if (!path) return undefined;
  if (/^https?:\/\//i.test(path)) return path;
  if (!serverUrl) return undefined;
  const absolute = path.startsWith('/') ? path : `${RESOURCES_PATH}${path}`;
  return `${serverUrl}${encodeURI(absolute)}`;
};

export const romTitle = (rom: Pick<Rom, 'name' | 'fs_name' | 'fs_name_no_tags'>): string =>
  rom.name || rom.fs_name_no_tags || rom.fs_name;

export const romCoverUrl = (serverUrl: string | null, rom: Rom, size: 'small' | 'large' = 'small'): string | undefined => {
  const local = size === 'large' ? rom.path_cover_large || rom.path_cover_small : rom.path_cover_small || rom.path_cover_large;
  return resourceUrl(serverUrl, local) ?? (rom.url_cover || undefined);
};

export const platformName = (platform: Pick<Platform, 'name' | 'custom_name' | 'display_name'>): string =>
  platform.custom_name || platform.display_name || platform.name;

/** Name the ROM download is saved under; multi-file ROMs arrive as a zip. */
export const romDownloadName = (rom: Rom): string => {
  const isBundle = (rom.files?.length ?? 0) > 1 || rom.has_multiple_files;
  return isBundle && !/\.zip$/i.test(rom.fs_name) ? `${rom.fs_name}.zip` : rom.fs_name;
};

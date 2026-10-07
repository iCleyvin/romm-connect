// by Cleyvin

import { api } from './client';
import { API_PATHS, ROM_PAGE_SIZE } from '../constants';
import { Rom, RomPage, RomUser } from '../types';

export interface RomQuery {
  platformId?: number;
  collectionId?: number;
  smartCollectionId?: number;
  searchTerm?: string;
  /** Only ROMs the current user has played. */
  played?: boolean;
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export const getRoms = async (query: RomQuery = {}): Promise<RomPage> => {
  const { data } = await api.get(API_PATHS.ROMS, {
    params: {
      // Older servers read `platform_id`; current ones read `platform_ids`.
      platform_ids: query.platformId,
      platform_id: query.platformId,
      collection_id: query.collectionId,
      smart_collection_id: query.smartCollectionId,
      search_term: query.searchTerm || undefined,
      last_played: query.played || undefined,
      order_by: query.orderBy,
      order_dir: query.orderDir,
      limit: query.limit ?? ROM_PAGE_SIZE,
      offset: query.offset ?? 0,
      // Indexes only the web gallery's virtual scroll needs; skipping them
      // keeps list responses small.
      with_char_index: false,
      with_filter_values: false,
      with_rom_id_index: false,
    },
  });
  if (Array.isArray(data)) return { items: data, total: data.length };
  return { items: data?.items ?? [], total: typeof data?.total === 'number' ? data.total : null };
};

export const getRom = async (id: number): Promise<Rom> => {
  const { data } = await api.get<Rom>(`${API_PATHS.ROMS}/${id}`);
  return data;
};

export type RomUserUpdate = Partial<Pick<RomUser, 'rating' | 'status' | 'backlogged' | 'now_playing'>>;

export const updateRomUser = async (
  romId: number,
  changes: RomUserUpdate,
  options: { touchLastPlayed?: boolean } = {},
): Promise<RomUser> => {
  const touch = options.touchLastPlayed ?? false;
  const { data } = await api.put<RomUser>(
    `${API_PATHS.ROMS}/${romId}/props`,
    // Current servers take the fields at the top level and the flag as a query
    // parameter; releases before that wrapped both in the body. Sending the
    // two shapes keeps one request valid everywhere.
    { ...changes, data: changes, update_last_played: touch },
    { params: { update_last_played: touch || undefined } },
  );
  return data;
};

/** Server-relative URL that serves a ROM (zipped when it spans several files). */
export const romContentPath = (rom: Rom, fileId?: number): string => {
  const file = fileId != null ? rom.files?.find((f) => f.id === fileId) : undefined;
  const name = encodeURIComponent(file ? file.file_name : rom.fs_name);
  const query = file ? `?file_ids=${file.id}` : '';
  return `${API_PATHS.ROMS}/${rom.id}/content/${name}${query}`;
};

// by Cleyvin

import { api } from './client';
import { isMissingEndpoint } from './errors';
import { API_PATHS } from '../constants';
import { Collection } from '../types';

const withCount = (collection: Collection, isSmart: boolean): Collection => ({
  ...collection,
  is_smart: isSmart,
  rom_count: collection.rom_count ?? collection.rom_ids?.length ?? 0,
});

export const getCollections = async (): Promise<Collection[]> => {
  const { data } = await api.get<Collection[]>(API_PATHS.COLLECTIONS);
  return data.map((collection) => withCount(collection, false));
};

export const getSmartCollections = async (): Promise<Collection[]> => {
  try {
    const { data } = await api.get<Collection[]>(`${API_PATHS.COLLECTIONS}/smart`);
    return data.map((collection) => withCount(collection, true));
  } catch (err) {
    // Servers that predate smart collections simply have none.
    if (isMissingEndpoint(err)) return [];
    throw err;
  }
};

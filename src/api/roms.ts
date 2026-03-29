// by Cleyvin

import { getApiClient } from './client';
import { API_PATHS } from '../constants';
import { Rom } from '../types';

interface GetRomsParams {
  platform_id?: number;
  search_term?: string;
  limit?: number;
  offset?: number;
  order_by?: string;
  order_dir?: 'asc' | 'desc';
}

interface PaginatedRoms {
  items: Rom[];
  total: number;
  limit: number;
  offset: number;
}

export const getRoms = async (params: GetRomsParams = {}): Promise<PaginatedRoms> => {
  const client = getApiClient();
  const queryParams: Record<string, string | number> = {};

  if (params.platform_id) queryParams.platform_id = params.platform_id;
  if (params.search_term) queryParams.search_term = params.search_term;
  if (params.limit) queryParams.limit = params.limit;
  if (params.offset != null) queryParams.offset = params.offset;
  if (params.order_by) queryParams.order_by = params.order_by;
  if (params.order_dir) queryParams.order_dir = params.order_dir;

  const response = await client.get(API_PATHS.ROMS, { params: queryParams });
  return response.data;
};

export const getRom = async (id: number): Promise<Rom> => {
  const client = getApiClient();
  const response = await client.get(`${API_PATHS.ROMS}/${id}`);
  return response.data;
};

export const searchRoms = async (searchTerm: string): Promise<Rom[]> => {
  const client = getApiClient();
  const response = await client.get(API_PATHS.ROMS, {
    params: { search_term: searchTerm, limit: 20 },
  });
  return response.data.items || response.data;
};

export const getRomDownloadUrl = (romId: number, fileName: string): string => {
  return `${API_PATHS.ROMS}/${romId}/content/${encodeURIComponent(fileName)}`;
};

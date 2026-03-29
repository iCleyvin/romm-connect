// by Cleyvin

import { getApiClient } from './client';
import { API_PATHS } from '../constants';
import { Platform } from '../types';

export const getPlatforms = async (): Promise<Platform[]> => {
  const client = getApiClient();
  const response = await client.get(API_PATHS.PLATFORMS);
  return response.data;
};

export const getPlatform = async (id: number): Promise<Platform> => {
  const client = getApiClient();
  const response = await client.get(`${API_PATHS.PLATFORMS}/${id}`);
  return response.data;
};

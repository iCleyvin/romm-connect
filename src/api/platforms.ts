// by Cleyvin

import { api } from './client';
import { API_PATHS } from '../constants';
import { Firmware, Platform } from '../types';

export const getPlatforms = async (): Promise<Platform[]> => {
  const { data } = await api.get<Platform[]>(API_PATHS.PLATFORMS);
  return data;
};

export const getFirmware = async (platformId: number): Promise<Firmware[]> => {
  const { data } = await api.get<Firmware[]>(API_PATHS.FIRMWARE, { params: { platform_id: platformId } });
  return data;
};

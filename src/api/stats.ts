// by Cleyvin

import { api } from './client';
import { API_PATHS } from '../constants';
import { StatsResponse } from '../types';

export const getStats = async (): Promise<StatsResponse> => {
  const { data } = await api.get<StatsResponse>(API_PATHS.STATS);
  return data;
};

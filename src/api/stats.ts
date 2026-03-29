// by Cleyvin

import { getApiClient } from './client';
import { API_PATHS } from '../constants';
import { StatsResponse } from '../types';

export const getStats = async (): Promise<StatsResponse> => {
  const client = getApiClient();
  const response = await client.get(API_PATHS.STATS);
  return response.data;
};

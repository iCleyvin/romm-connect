// by Cleyvin

import { getApiClient } from './client';
import { API_PATHS } from '../constants';
import { Collection } from '../types';

export const getCollections = async (): Promise<Collection[]> => {
  const client = getApiClient();
  const response = await client.get(API_PATHS.COLLECTIONS);
  return response.data;
};

export const getCollection = async (id: number): Promise<Collection> => {
  const client = getApiClient();
  const response = await client.get(`${API_PATHS.COLLECTIONS}/${id}`);
  return response.data;
};

// by Cleyvin

import axios from 'axios';
import { getApiClient, getBaseUrl, setTokens, setApiTokenDirect } from './client';
import { API_PATHS } from '../constants';
import { AuthTokens, User, ServerConfig, HeartbeatResponse } from '../types';

export const testConnection = async (config: ServerConfig): Promise<HeartbeatResponse> => {
  const baseURL = getBaseUrl(config);
  const response = await axios.get(`${baseURL}${API_PATHS.HEARTBEAT}`, { timeout: 10000 });
  return response.data;
};

export const login = async (username: string, password: string): Promise<AuthTokens> => {
  const client = getApiClient();
  const params = new URLSearchParams();
  params.append('grant_type', 'password');
  params.append('username', username);
  params.append('password', password);
  params.append('scope', 'me.read me.write roms.read roms.write roms.user.read roms.user.write platforms.read platforms.write collections.read assets.read assets.write devices.read devices.write tasks.run');

  const response = await client.post(API_PATHS.TOKEN, params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  const tokens: AuthTokens = response.data;
  setTokens(tokens);
  return tokens;
};


export const loginWithApiToken = async (apiToken: string): Promise<void> => {
  setApiTokenDirect(apiToken);
};

export const getCurrentUser = async (): Promise<User> => {
  const client = getApiClient();
  const response = await client.get(API_PATHS.USERS_ME);
  return response.data;
};

export const logout = async (): Promise<void> => {
  try {
    const client = getApiClient();
    await client.post(API_PATHS.LOGOUT);
  } catch {
    // Ignore logout errors
  }
};

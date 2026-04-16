// by Cleyvin

import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS, API_PATHS } from '../constants';
import { ServerConfig, AuthTokens } from '../types';

let apiClient: AxiosInstance | null = null;
let currentTokens: AuthTokens | null = null;
let apiTokenDirect: string | null = null;

export const getBaseUrl = (config: ServerConfig): string => {
  const protocol = config.useHttps ? 'https' : 'http';
  const port = config.port ? `:${config.port}` : '';
  return `${protocol}://${config.host}${port}`;
};

export const createApiClient = (config: ServerConfig): AxiosInstance => {
  const baseURL = getBaseUrl(config);

  apiClient = axios.create({
    baseURL,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  apiClient.interceptors.request.use(async (reqConfig: InternalAxiosRequestConfig) => {
    if (!currentTokens) {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKENS);
        if (stored) {
          currentTokens = JSON.parse(stored);
        }
      } catch {}
    }
    if (apiTokenDirect) {
      reqConfig.headers.Authorization = `Bearer ${apiTokenDirect}`;
    } else if (currentTokens?.access_token) {
      reqConfig.headers.Authorization = `Bearer ${currentTokens.access_token}`;
    }
    return reqConfig;
  });

  apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;
      if (error.response?.status === 401 && !originalRequest._retry && currentTokens?.refresh_token && !apiTokenDirect) {
        originalRequest._retry = true;
        try {
          const refreshed = await refreshTokens(currentTokens.refresh_token);
          currentTokens = refreshed;
          await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKENS, JSON.stringify(refreshed));
          originalRequest.headers.Authorization = `Bearer ${refreshed.access_token}`;
          return apiClient!(originalRequest);
        } catch {
          currentTokens = null;
          await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKENS);
          throw error;
        }
      }
      return Promise.reject(error);
    }
  );

  return apiClient;
};

export const getApiClient = (): AxiosInstance => {
  if (!apiClient) {
    throw new Error('API client not initialized. Call createApiClient first.');
  }
  return apiClient;
};

export const setTokens = (tokens: AuthTokens) => {
  currentTokens = tokens;
};

export const setApiTokenDirect = (token: string) => {
  apiTokenDirect = token;
  currentTokens = null;
};


export const clearTokens = () => {
  currentTokens = null;
  apiTokenDirect = null;
};

const refreshTokens = async (refreshToken: string): Promise<AuthTokens> => {
  const config = await AsyncStorage.getItem(STORAGE_KEYS.SERVER_CONFIG);
  if (!config) throw new Error('No server config');
  const baseURL = getBaseUrl(JSON.parse(config));

  const params = new URLSearchParams();
  params.append('grant_type', 'refresh_token');
  params.append('refresh_token', refreshToken);

  const response = await axios.post(`${baseURL}${API_PATHS.TOKEN}`, params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return response.data;
};

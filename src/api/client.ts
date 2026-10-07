// by Cleyvin

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_PATHS } from '../constants';
import { AuthTokens } from '../types';
import { Session, saveSession } from './session';

let serverUrl: string | null = null;
let session: Session | null = null;
let refreshInFlight: Promise<string | null> | null = null;
const expiredListeners = new Set<() => void>();

export const setServerUrl = (url: string | null) => {
  serverUrl = url;
};

export const getServerUrl = (): string => {
  if (!serverUrl) throw new Error('No RoMM server configured');
  return serverUrl;
};

export const setSession = (next: Session | null) => {
  session = next;
};

export const getSession = (): Session | null => session;

/** Fires when the server rejects the stored session and it cannot be renewed. */
export const onSessionExpired = (listener: () => void): (() => void) => {
  expiredListeners.add(listener);
  return () => {
    expiredListeners.delete(listener);
  };
};

const notifySessionExpired = () => {
  session = null;
  expiredListeners.forEach((listener) => listener());
};

const currentBearer = (): string | null => {
  if (!session) return null;
  return session.kind === 'token' ? session.apiToken : session.accessToken;
};

// Repeated keys (`platform_ids=1&platform_ids=2`) are what FastAPI parses as a list.
const serializeParams = (params: Record<string, unknown>): string => {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    for (const item of Array.isArray(value) ? value : [value]) {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(item))}`);
    }
  }
  return parts.join('&');
};

export const api = axios.create({
  timeout: 30000,
  paramsSerializer: { serialize: serializeParams },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  config.baseURL = getServerUrl();
  const bearer = currentBearer();
  if (bearer) config.headers.Authorization = `Bearer ${bearer}`;
  return config;
});

const refreshAccessToken = (): Promise<string | null> => {
  if (refreshInFlight) return refreshInFlight;

  const run = async (): Promise<string | null> => {
    const current = session;
    if (!current || current.kind !== 'oauth') return null;

    const body = `grant_type=refresh_token&refresh_token=${encodeURIComponent(current.refreshToken)}`;
    try {
      const { data } = await axios.post<AuthTokens>(`${getServerUrl()}${API_PATHS.TOKEN}`, body, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 15000,
      });
      // Refresh tokens are single use: persist the rotated pair before anything else.
      const next: Session = { ...current, accessToken: data.access_token, refreshToken: data.refresh_token };
      session = next;
      await saveSession(next);
      return next.accessToken;
    } catch (err) {
      const status = (err as AxiosError).response?.status;
      if (status === 400 || status === 401 || status === 403) notifySessionExpired();
      throw err;
    }
  };

  refreshInFlight = run().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
};

api.interceptors.response.use(undefined, async (error: AxiosError) => {
  const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
  if (error.response?.status !== 401 || !original || original._retried || !session) {
    return Promise.reject(error);
  }
  if (session.kind === 'token') {
    notifySessionExpired();
    return Promise.reject(error);
  }

  original._retried = true;
  try {
    await refreshAccessToken();
  } catch {
    return Promise.reject(error);
  }
  return api(original);
});

const jwtExpiry = (token: string): number | null => {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const exp = JSON.parse(atob(payload)).exp;
    return typeof exp === 'number' ? exp * 1000 : null;
  } catch {
    return null;
  }
};

/**
 * Bearer token for requests made outside axios (the emulator WebView, native
 * downloads). Renews an OAuth access token that is about to expire.
 */
export const getFreshBearer = async (force = false): Promise<string | null> => {
  if (!session) return null;
  if (session.kind === 'token') return session.apiToken;

  const expiry = jwtExpiry(session.accessToken);
  const expiringSoon = expiry !== null && expiry - Date.now() < 120_000;
  if (force || expiringSoon) {
    try {
      return await refreshAccessToken();
    } catch {
      return session ? currentBearer() : null;
    }
  }
  return session.accessToken;
};

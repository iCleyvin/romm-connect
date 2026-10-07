// by Cleyvin

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { LEGACY_KEYS, SECURE_KEYS, STORAGE_KEYS } from '../constants';

export type Session =
  | { kind: 'oauth'; accessToken: string; refreshToken: string; scopes: string[] }
  | { kind: 'token'; apiToken: string };

export const normalizeServerUrl = (input: string): string => input.trim().replace(/\/+$/, '');

export const saveSession = async (session: Session): Promise<void> => {
  await SecureStore.setItemAsync(SECURE_KEYS.SESSION, JSON.stringify(session));
};

export const clearSession = async (): Promise<void> => {
  await SecureStore.deleteItemAsync(SECURE_KEYS.SESSION);
};

export const saveServerUrl = async (url: string): Promise<void> => {
  await AsyncStorage.setItem(STORAGE_KEYS.SERVER_URL, url);
};

export const clearServerUrl = async (): Promise<void> => {
  await AsyncStorage.removeItem(STORAGE_KEYS.SERVER_URL);
};

// Releases up to v0.5.0 kept OAuth tokens in plain AsyncStorage and the account
// password in SecureStore. Carry the session over so updating does not sign
// anyone out, and drop the password, which nothing needs any more.
const migrateLegacyStorage = async (): Promise<{ serverUrl: string | null; session: Session | null }> => {
  const [[, legacyConfig], [, legacyTokens], [, legacyMethod]] = await AsyncStorage.multiGet([
    LEGACY_KEYS.SERVER_CONFIG,
    LEGACY_KEYS.AUTH_TOKENS,
    LEGACY_KEYS.AUTH_METHOD,
  ]);
  if (!legacyConfig) return { serverUrl: null, session: null };

  let serverUrl: string | null = null;
  let session: Session | null = null;
  try {
    const config = JSON.parse(legacyConfig);
    if (config?.host) {
      const port = config.port ? `:${config.port}` : '';
      serverUrl = `${config.useHttps ? 'https' : 'http'}://${config.host}${port}`;
    }
    const legacyApiToken = await SecureStore.getItemAsync(LEGACY_KEYS.SECURE_API_TOKEN);
    if (legacyMethod === 'token' && legacyApiToken) {
      session = { kind: 'token', apiToken: legacyApiToken };
    } else if (legacyTokens) {
      const tokens = JSON.parse(legacyTokens);
      if (tokens?.access_token && tokens?.refresh_token) {
        session = {
          kind: 'oauth',
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          scopes: [],
        };
      }
    }
  } catch {
    // Unreadable legacy data: fall through and start clean.
  }

  if (serverUrl) await saveServerUrl(serverUrl);
  if (serverUrl && session) await saveSession(session);
  await AsyncStorage.multiRemove(Object.values(LEGACY_KEYS).filter((key) => key.startsWith('@')));
  await SecureStore.deleteItemAsync(LEGACY_KEYS.SECURE_CREDENTIALS);
  await SecureStore.deleteItemAsync(LEGACY_KEYS.SECURE_API_TOKEN);

  return { serverUrl, session: serverUrl ? session : null };
};

export const loadStoredState = async (): Promise<{ serverUrl: string | null; session: Session | null }> => {
  const serverUrl = await AsyncStorage.getItem(STORAGE_KEYS.SERVER_URL);
  if (!serverUrl) return migrateLegacyStorage();

  let session: Session | null = null;
  try {
    const stored = await SecureStore.getItemAsync(SECURE_KEYS.SESSION);
    if (stored) session = JSON.parse(stored);
  } catch {
    // A keystore reset makes the stored value undecryptable; treat as signed out.
  }
  return { serverUrl, session };
};

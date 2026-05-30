// by Cleyvin

import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS } from '../constants';
// NOTE: store/AppContext imports loadCredentials/loadApiToken from this file, so
// this is a (benign) import cycle. It is safe because useApp is only referenced
// at hook-call time, never during module evaluation — live bindings resolve it.
import { useApp } from '../store/AppContext';

export const useAuthHeaders = (): Record<string, string> => {
  const [headers, setHeaders] = useState<Record<string, string>>({});

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKENS).then((stored) => {
      if (stored) {
        const tokens = JSON.parse(stored);
        setHeaders({ Authorization: `Bearer ${tokens.access_token}` });
      }
    });
  }, []);

  return headers;
};

// Store credentials securely using platform Keystore/Keychain
const CREDS_KEY = 'romm_credentials';

export const saveCredentials = async (username: string, password: string) => {
  await SecureStore.setItemAsync(CREDS_KEY, JSON.stringify({ username, password }));
};

export const loadCredentials = async (): Promise<{ username: string; password: string } | null> => {
  const stored = await SecureStore.getItemAsync(CREDS_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
};

export const deleteCredentials = async () => {
  await SecureStore.deleteItemAsync(CREDS_KEY);
};
// Store API token securely
const API_TOKEN_KEY = 'romm_api_token';

export const saveApiToken = async (token: string) => {
  await SecureStore.setItemAsync(API_TOKEN_KEY, token);
};

export const loadApiToken = async (): Promise<string | null> => {
  return await SecureStore.getItemAsync(API_TOKEN_KEY);
};

export const deleteApiToken = async () => {
  await SecureStore.deleteItemAsync(API_TOKEN_KEY);
};

export const useCredentials = (): { username: string; password: string } | null => {
  const [creds, setCreds] = useState<{ username: string; password: string } | null>(null);

  useEffect(() => {
    loadCredentials().then((c) => { if (c) setCreds(c); });
  }, []);

  return creds;
};

// Auth headers for <Image> requests to the RoMM server (covers/screenshots).
// Resolves the bearer token (OAuth or API token) and returns a headers object
// suitable for `source={{ uri, headers }}`. Returns undefined until the token is
// resolved, and for users with no token.
//
// It re-resolves whenever the session changes — i.e. when context `authToken` or
// `authMethod` change (login, logout, change-server, OAuth<->API-token switch) —
// so freshly-mounted covers pick up the current credentials.
//
// Edge case (accepted): a *silent* OAuth refresh updates the token in
// AsyncStorage + the axios client but not the context value, so this hook does
// not re-fire for it. That is fine in practice: getCurrentAuthToken() reads
// AsyncStorage (the source of truth, already updated by the refresh), so any
// cover mounted after the refresh gets the new token, and images that already
// loaded were validated at load time and are cached by RN.
export const useImageAuthHeaders = (): Record<string, string> | undefined => {
  // Read session signals so the effect re-runs on login/logout/method switch.
  const { authToken, authMethod } = useApp();
  const [headers, setHeaders] = useState<Record<string, string> | undefined>(undefined);

  useEffect(() => {
    let active = true;
    getCurrentAuthToken().then((token) => {
      if (active) setHeaders(token ? { Authorization: `Bearer ${token}` } : undefined);
    });
    return () => { active = false; };
  }, [authToken, authMethod]);

  return headers;
};

// Returns the current bearer token, supporting both OAuth and API token auth
export const getCurrentAuthToken = async (): Promise<string | null> => {
  const method = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_METHOD);
  if (method === 'token') {
    return await loadApiToken();
  }
  const stored = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKENS);
  if (!stored) return null;
  try {
    return JSON.parse(stored).access_token || null;
  } catch {
    return null;
  }
};

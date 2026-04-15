// by Cleyvin

import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS } from '../constants';

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

export const useCredentials = (): { username: string; password: string } | null => {
  const [creds, setCreds] = useState<{ username: string; password: string } | null>(null);

  useEffect(() => {
    loadCredentials().then((c) => { if (c) setCreds(c); });
  }, []);

  return creds;
};

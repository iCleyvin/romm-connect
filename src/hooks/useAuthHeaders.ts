// by Cleyvin

import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

// Store credentials for image auth (Basic Auth in URL)
const CREDS_KEY = '@romm_credentials';

export const saveCredentials = async (username: string, password: string) => {
  await AsyncStorage.setItem(CREDS_KEY, JSON.stringify({ username, password }));
};

export const useCredentials = (): { username: string; password: string } | null => {
  const [creds, setCreds] = useState<{ username: string; password: string } | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(CREDS_KEY).then((stored) => {
      if (stored) setCreds(JSON.parse(stored));
    });
  }, []);

  return creds;
};

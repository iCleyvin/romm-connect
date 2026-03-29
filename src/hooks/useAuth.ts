// by Cleyvin

import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { login as apiLogin, getCurrentUser, logout as apiLogout, clearTokens } from '../api';
import { STORAGE_KEYS } from '../constants';
import { AuthTokens, User } from '../types';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loginUser = useCallback(async (username: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const tokens = await apiLogin(username, password);
      await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKENS, JSON.stringify(tokens));

      const userData = await getCurrentUser();
      setUser(userData);
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));
      return true;
    } catch (err: any) {
      const msg = err.response?.status === 401
        ? 'Invalid username or password'
        : err.response?.data?.detail || 'Connection failed';
      setError(msg);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const logoutUser = useCallback(async () => {
    await apiLogout();
    clearTokens();
    await AsyncStorage.multiRemove([STORAGE_KEYS.AUTH_TOKENS, STORAGE_KEYS.USER]);
    setUser(null);
  }, []);

  const restoreSession = useCallback(async (): Promise<boolean> => {
    try {
      const storedTokens = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKENS);
      if (!storedTokens) return false;

      const userData = await getCurrentUser();
      setUser(userData);
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));
      return true;
    } catch {
      await AsyncStorage.multiRemove([STORAGE_KEYS.AUTH_TOKENS, STORAGE_KEYS.USER]);
      clearTokens();
      return false;
    }
  }, []);

  return { user, loading, error, loginUser, logoutUser, restoreSession };
};

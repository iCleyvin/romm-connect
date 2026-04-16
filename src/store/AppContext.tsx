// by Cleyvin

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadCredentials, loadApiToken } from '../hooks/useAuthHeaders';
import { Colors, ThemeColors, ThemeMode } from '../theme';
import { STORAGE_KEYS } from '../constants';
import { User, ServerConfig } from '../types';

interface Credentials {
  username: string;
  password: string;
}

export type AuthMethod = 'oauth' | 'token';

interface AppContextType {
  theme: ThemeMode;
  colors: ThemeColors;
  toggleTheme: () => void;
  user: User | null;
  setUser: (user: User | null) => void;
  serverConfig: ServerConfig | null;
  setServerConfig: (config: ServerConfig | null) => void;
  credentials: Credentials | null;
  setCredentials: (creds: Credentials | null) => void;
  authToken: string | null;
  setAuthToken: (token: string | null) => void;
  authMethod: AuthMethod;
  setAuthMethod: (method: AuthMethod) => void;
  isReady: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [user, setUser] = useState<User | null>(null);
  const [serverConfig, setServerConfig] = useState<ServerConfig | null>(null);
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [authMethod, setAuthMethod] = useState<AuthMethod>('oauth');
  const [isReady, setIsReady] = useState(false);

  const colors = Colors[theme];

  useEffect(() => {
    const init = async () => {
      try {
        const [storedTheme, storedConfig, storedUser, storedTokens, storedCreds, storedAuthMethod, storedApiToken] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.THEME),
          AsyncStorage.getItem(STORAGE_KEYS.SERVER_CONFIG),
          AsyncStorage.getItem(STORAGE_KEYS.USER),
          AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKENS),
          loadCredentials(),
          AsyncStorage.getItem(STORAGE_KEYS.AUTH_METHOD),
          loadApiToken(),
        ]);
        if (storedTheme === 'light' || storedTheme === 'dark') setTheme(storedTheme);
        if (storedConfig) setServerConfig(JSON.parse(storedConfig));
        if (storedUser) setUser(JSON.parse(storedUser));
        if (storedTokens) {
          try { setAuthToken(JSON.parse(storedTokens).access_token); } catch {}
        }
        if (storedCreds) setCredentials(storedCreds);
        if (storedAuthMethod === 'token') setAuthMethod('token');
        if (storedApiToken) setAuthToken(storedApiToken);
      } catch (e) {
        console.warn('AppContext init error:', e);
      }
      setIsReady(true);
    };
    init();
  }, []);

  const toggleTheme = async () => {
    const next: ThemeMode = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    await AsyncStorage.setItem(STORAGE_KEYS.THEME, next);
  };

  return (
    <AppContext.Provider
      value={{
        theme, colors, toggleTheme,
        user, setUser,
        serverConfig, setServerConfig,
        credentials, setCredentials,
        authToken, setAuthToken,
        authMethod, setAuthMethod,
        isReady,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};

// by Cleyvin

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, ThemeColors, ThemeMode } from '../theme';
import { STORAGE_KEYS } from '../constants';
import { HeartbeatResponse, User } from '../types';
import { getCurrentUser, getHeartbeat, httpStatus } from '../api';
import { onSessionExpired, setServerUrl, setSession } from '../api/client';
import { queryClient } from '../api/queryClient';
import { clearServerUrl, clearSession, loadStoredState, saveServerUrl, saveSession, Session } from '../api/session';

export type AuthStatus = 'loading' | 'needs-server' | 'signed-out' | 'signed-in';

interface AppContextType {
  theme: ThemeMode;
  colors: ThemeColors;
  toggleTheme: () => void;
  status: AuthStatus;
  serverUrl: string | null;
  heartbeat: HeartbeatResponse | null;
  user: User | null;
  /** True after the server rejected a stored session, until the next sign-in. */
  sessionExpired: boolean;
  /** Whether the signed-in session may use an API scope such as `roms.write`. */
  can: (scope: string) => boolean;
  /** Stores the server; with a session (QR pairing) it also signs in. */
  connectServer: (url: string, heartbeat: HeartbeatResponse, session?: Session) => Promise<void>;
  forgetServer: () => Promise<void>;
  signIn: (session: Session) => Promise<void>;
  signOut: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Used only when neither the token nor the profile lists scopes (old servers).
const ROLE_DENIED_SCOPES: Record<string, string[]> = {
  admin: [],
  editor: ['tasks.run'],
  viewer: ['tasks.run', 'roms.write', 'platforms.write'],
};

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [serverUrl, setServerUrlState] = useState<string | null>(null);
  const [heartbeat, setHeartbeat] = useState<HeartbeatResponse | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [tokenScopes, setTokenScopes] = useState<string[]>([]);
  const [sessionExpired, setSessionExpired] = useState(false);

  const applyUser = useCallback((next: User | null) => {
    setUser(next);
    if (next) AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(next)).catch(() => {});
    else AsyncStorage.removeItem(STORAGE_KEYS.USER).catch(() => {});
  }, []);

  const dropSession = useCallback(async () => {
    setSession(null);
    setTokenScopes([]);
    applyUser(null);
    queryClient.clear();
    await clearSession().catch(() => {});
  }, [applyUser]);

  useEffect(() => {
    const boot = async () => {
      const [storedTheme, cachedUser, stored] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.THEME).catch(() => null),
        AsyncStorage.getItem(STORAGE_KEYS.USER).catch(() => null),
        loadStoredState().catch(() => ({ serverUrl: null, session: null })),
      ]);
      if (storedTheme === 'light' || storedTheme === 'dark') setTheme(storedTheme);

      if (!stored.serverUrl) {
        setStatus('needs-server');
        return;
      }
      setServerUrl(stored.serverUrl);
      setServerUrlState(stored.serverUrl);
      getHeartbeat().then(setHeartbeat).catch(() => {});

      if (!stored.session) {
        setStatus('signed-out');
        return;
      }
      setSession(stored.session);
      if (stored.session.kind === 'oauth') setTokenScopes(stored.session.scopes);
      if (cachedUser) {
        try {
          setUser(JSON.parse(cachedUser));
        } catch {
          // Ignore a corrupt cache; the profile is fetched again below.
        }
      }
      // Enter the app straight away so a server that is briefly unreachable
      // does not look like a sign-out. A rejected session is handled by the
      // expiry listener below.
      setStatus('signed-in');
      getCurrentUser().then(applyUser).catch(() => {});
    };
    boot();
  }, [applyUser]);

  useEffect(
    () =>
      onSessionExpired(() => {
        setSessionExpired(true);
        dropSession().finally(() => setStatus((current) => (current === 'signed-in' ? 'signed-out' : current)));
      }),
    [dropSession],
  );

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next: ThemeMode = current === 'dark' ? 'light' : 'dark';
      AsyncStorage.setItem(STORAGE_KEYS.THEME, next).catch(() => {});
      return next;
    });
  }, []);

  const signIn = useCallback(
    async (session: Session) => {
      setSession(session);
      try {
        const profile = await getCurrentUser();
        await saveSession(session);
        setTokenScopes(session.kind === 'oauth' ? session.scopes : []);
        applyUser(profile);
        setSessionExpired(false);
        setStatus('signed-in');
      } catch (err) {
        setSession(null);
        setSessionExpired(false);
        if (httpStatus(err) === 401) throw new Error('The server rejected these credentials');
        throw err;
      }
    },
    [applyUser],
  );

  const connectServer = useCallback(
    async (url: string, serverHeartbeat: HeartbeatResponse, session?: Session) => {
      setServerUrl(url);
      if (session) {
        // Pairing delivers the server and a token together: validate the token
        // before committing so a bad code leaves the app on this screen.
        try {
          await signIn(session);
        } catch (err) {
          setServerUrl(null);
          throw err;
        }
      }
      await saveServerUrl(url);
      setServerUrlState(url);
      setHeartbeat(serverHeartbeat);
      if (!session) setStatus('signed-out');
    },
    [signIn],
  );

  const forgetServer = useCallback(async () => {
    await dropSession();
    await clearServerUrl().catch(() => {});
    setServerUrl(null);
    setServerUrlState(null);
    setHeartbeat(null);
    setSessionExpired(false);
    setStatus('needs-server');
  }, [dropSession]);

  const signOut = useCallback(async () => {
    await dropSession();
    setSessionExpired(false);
    setStatus('signed-out');
  }, [dropSession]);

  const can = useCallback(
    (scope: string) => {
      const granted = tokenScopes.length > 0 ? tokenScopes : user?.oauth_scopes;
      if (granted && granted.length > 0) return granted.includes(scope);
      return !(ROLE_DENIED_SCOPES[user?.role ?? 'viewer'] ?? []).includes(scope);
    },
    [tokenScopes, user],
  );

  const value = useMemo<AppContextType>(
    () => ({
      theme,
      colors: Colors[theme],
      toggleTheme,
      status,
      serverUrl,
      heartbeat,
      user,
      sessionExpired,
      can,
      connectServer,
      forgetServer,
      signIn,
      signOut,
    }),
    [theme, toggleTheme, status, serverUrl, heartbeat, user, sessionExpired, can, connectServer, forgetServer, signIn, signOut],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};

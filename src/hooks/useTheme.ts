// by Cleyvin

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, ThemeColors, ThemeMode } from '../theme';
import { STORAGE_KEYS } from '../constants';

export const useTheme = () => {
  const [mode, setMode] = useState<ThemeMode>('dark');
  const colors = Colors[mode];

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEYS.THEME).then((stored) => {
      if (stored === 'light' || stored === 'dark') {
        setMode(stored);
      }
    });
  }, []);

  const toggleTheme = useCallback(async () => {
    const next: ThemeMode = mode === 'dark' ? 'light' : 'dark';
    setMode(next);
    await AsyncStorage.setItem(STORAGE_KEYS.THEME, next);
  }, [mode]);

  return { mode, colors, toggleTheme };
};

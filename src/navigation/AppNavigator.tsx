// by Cleyvin

import React, { useMemo } from 'react';
import { NavigationContainer, DarkTheme, DefaultTheme, Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { useApp } from '../store/AppContext';
import { RootStackParamList } from '../types';
import LoadingScreen from '../components/common/LoadingScreen';

import ServerConfigScreen from '../screens/ServerConfig/ServerConfigScreen';
import LoginScreen from '../screens/Login/LoginScreen';
import MainTabs from './MainTabs';
import RomDetailScreen from '../screens/RomDetail/RomDetailScreen';
import RomGalleryScreen from '../screens/RomGallery/RomGalleryScreen';
import PlayScreen from '../screens/Play/PlayScreen';
import UploadScreen from '../screens/Upload/UploadScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  const { colors, theme, status } = useApp();

  const navTheme = useMemo<Theme>(() => {
    const base = theme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.primary,
        background: colors.background,
        card: colors.surface,
        text: colors.text,
        border: colors.border,
        notification: colors.accent,
      },
    };
  }, [theme, colors]);

  if (status === 'loading') return <LoadingScreen />;

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
        }}
      >
        {/* Which screens exist follows the auth state, so signing in or out
            swaps the stack instead of each screen resetting navigation. */}
        {status === 'needs-server' && <Stack.Screen name="ServerConfig" component={ServerConfigScreen} />}
        {status === 'signed-out' && <Stack.Screen name="Login" component={LoginScreen} />}
        {status === 'signed-in' && (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="RomGallery" component={RomGalleryScreen} />
            <Stack.Screen name="RomDetail" component={RomDetailScreen} />
            <Stack.Screen
              name="Play"
              component={PlayScreen}
              options={{ animation: 'fade', orientation: 'all', gestureEnabled: false }}
            />
            <Stack.Screen name="Upload" component={UploadScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;

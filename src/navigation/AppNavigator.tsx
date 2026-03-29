// by Cleyvin

import React, { useEffect, useState } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from '../store/AppContext';
import { createApiClient, getCurrentUser } from '../api';
import { STORAGE_KEYS } from '../constants';
import { RootStackParamList } from '../types';

import ServerConfigScreen from '../screens/ServerConfig/ServerConfigScreen';
import LoginScreen from '../screens/Login/LoginScreen';
import MainTabs from './MainTabs';
import RomDetailScreen from '../screens/RomDetail/RomDetailScreen';
import RomGalleryScreen from '../screens/RomGallery/RomGalleryScreen';
import PlayScreen from '../screens/Play/PlayScreen';
import UploadScreen from '../screens/Upload/UploadScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  const { colors, serverConfig, setUser, isReady } = useApp();
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList | null>(null);

  const navTheme = {
    ...DefaultTheme,
    dark: true,
    colors: {
      ...DefaultTheme.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      notification: colors.accent,
    },
  };

  useEffect(() => {
    const bootstrap = async () => {
      if (!isReady) return;

      const storedConfig = await AsyncStorage.getItem(STORAGE_KEYS.SERVER_CONFIG);
      if (!storedConfig) {
        setInitialRoute('ServerConfig');
        return;
      }

      const config = JSON.parse(storedConfig);
      try {
        createApiClient(config);
        const storedTokens = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKENS);
        if (storedTokens) {
          const userData = await getCurrentUser();
          setUser(userData);
          setInitialRoute('Main');
        } else {
          setInitialRoute('Login');
        }
      } catch {
        setInitialRoute('Login');
      }
    };

    bootstrap();
  }, [isReady]);

  if (!initialRoute) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="ServerConfig" component={ServerConfigScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen
          name="RomDetail"
          component={RomDetailScreen}
          options={{ animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="RomGallery" component={RomGalleryScreen} />
        <Stack.Screen
          name="Play"
          component={PlayScreen}
          options={{ animation: 'slide_from_bottom', orientation: 'all' }}
        />
        <Stack.Screen name="Upload" component={UploadScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;

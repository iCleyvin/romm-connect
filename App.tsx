// by Cleyvin

import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { HotUpdater } from '@hot-updater/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider } from './src/store/AppContext';
import { queryClient } from './src/api/queryClient';
import AppNavigator from './src/navigation/AppNavigator';
import ErrorBoundary from './src/components/common/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AppProvider>
            <StatusBar style="auto" />
            <AppNavigator />
          </AppProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

export default HotUpdater.wrap({
  baseURL: 'https://updates.kcomer.app/hot-updater',
  updateStrategy: 'appVersion',
  updateMode: 'auto',
  fallbackComponent: ({ progress, status }) => (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0D1117' }}>
      <ActivityIndicator size="large" color="#8B74E8" />
      <Text style={{ color: '#8B949E', marginTop: 16, fontSize: 14 }}>
        {status === 'UPDATING' ? `Updating... ${Math.round(progress * 100)}%` : 'Checking for updates...'}
      </Text>
    </View>
  ),
})(App);

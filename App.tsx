// by Cleyvin

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { HotUpdater } from '@hot-updater/react-native';
import { AppProvider } from './src/store/AppContext';
import AppNavigator from './src/navigation/AppNavigator';
import ErrorBoundary from './src/components/common/ErrorBoundary';
import { View, Text, ActivityIndicator } from 'react-native';

function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <StatusBar style="auto" />
        <AppNavigator />
      </AppProvider>
    </ErrorBoundary>
  );
}

export default HotUpdater.wrap({
  baseURL: "https://updates.kcomer.app/hot-updater",
  updateStrategy: "appVersion",
  updateMode: "auto",
  fallbackComponent: ({ progress, status }) => (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0D1117' }}>
      <ActivityIndicator size="large" color="#58a6ff" />
      <Text style={{ color: '#8b949e', marginTop: 16, fontSize: 14 }}>
        {status === 'UPDATING' ? `Updating... ${Math.round(progress * 100)}%` : 'Checking for updates...'}
      </Text>
    </View>
  ),
})(App);

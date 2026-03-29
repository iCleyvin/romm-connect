// by Cleyvin

import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useApp } from '../../store/AppContext';

interface Props {
  message?: string;
}

const LoadingScreen = ({ message }: Props) => {
  const { colors } = useApp();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
      {message && (
        <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    marginTop: 16,
    fontSize: 14,
  },
});

export default LoadingScreen;

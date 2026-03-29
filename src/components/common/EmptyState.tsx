// by Cleyvin

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useApp } from '../../store/AppContext';

interface Props {
  icon: string;
  title: string;
  subtitle?: string;
}

const EmptyState = ({ icon, title, subtitle }: Props) => {
  const { colors } = useApp();

  return (
    <View style={styles.container}>
      <MaterialCommunityIcons name={icon as any} size={64} color={colors.gray} />
      <Text style={[styles.title, { color: colors.textSecondary }]}>{title}</Text>
      {subtitle && (
        <Text style={[styles.subtitle, { color: colors.gray }]}>{subtitle}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});

export default EmptyState;

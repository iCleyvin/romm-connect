// by Cleyvin

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useApp } from '../../store/AppContext';
import { testConnection, createApiClient } from '../../api';
import { STORAGE_KEYS } from '../../constants';
import { RootStackParamList, ServerConfig } from '../../types';
import { spacing, borderRadius, fontSize } from '../../theme';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ServerConfig'>;
};

const ServerConfigScreen = ({ navigation }: Props) => {
  const { colors, setServerConfig } = useApp();
  const insets = useSafeAreaInsets();
  const [host, setHost] = useState('');
  const [port, setPort] = useState('');
  const [useHttps, setUseHttps] = useState(false);
  const [testing, setTesting] = useState(false);
  const [serverVersion, setServerVersion] = useState<string | null>(null);

  const handleTestConnection = async () => {
    if (!host.trim()) {
      Alert.alert('Error', 'Please enter a server address');
      return;
    }

    setTesting(true);
    setServerVersion(null);
    const config: ServerConfig = { host: host.trim(), port: port.trim(), useHttps };

    try {
      const heartbeat = await testConnection(config);
      const version = heartbeat.SYSTEM?.VERSION || 'unknown';
      setServerVersion(version);
      Alert.alert('Success', `Connected to RoMM v${version}`);
    } catch (err: any) {
      const msg = err.code === 'ECONNREFUSED'
        ? 'Connection refused. Check the address and port.'
        : err.message || 'Could not connect to server';
      Alert.alert('Connection Failed', msg);
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!host.trim()) {
      Alert.alert('Error', 'Please enter a server address');
      return;
    }

    const config: ServerConfig = { host: host.trim(), port: port.trim(), useHttps };

    setTesting(true);
    try {
      await testConnection(config);
      await AsyncStorage.setItem(STORAGE_KEYS.SERVER_CONFIG, JSON.stringify(config));
      setServerConfig(config);
      createApiClient(config);
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    } catch {
      Alert.alert('Error', 'Could not connect to server. Please check your settings.');
    } finally {
      setTesting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoContainer}>
          <View style={[styles.logoCircle, { backgroundColor: colors.primary + '20' }]}>
            <MaterialCommunityIcons name="server-network" size={48} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>RoMM Connect</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Configure your RoMM server to get started
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Server Address</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
            placeholder="e.g. 192.168.1.100 or romm.example.com"
            placeholderTextColor={colors.placeholder}
            value={host}
            onChangeText={setHost}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />

          <Text style={[styles.label, { color: colors.textSecondary }]}>Port (optional)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
            placeholder="e.g. 80, 443, 8080"
            placeholderTextColor={colors.placeholder}
            value={port}
            onChangeText={setPort}
            keyboardType="number-pad"
          />

          <View style={styles.switchRow}>
            <Text style={[styles.switchLabel, { color: colors.text }]}>Use HTTPS</Text>
            <Switch
              value={useHttps}
              onValueChange={setUseHttps}
              trackColor={{ false: colors.gray, true: colors.primaryDark }}
              thumbColor={useHttps ? colors.primary : colors.textSecondary}
            />
          </View>

          {serverVersion && (
            <View style={[styles.versionBadge, { backgroundColor: colors.success + '20' }]}>
              <MaterialCommunityIcons name="check-circle" size={16} color={colors.success} />
              <Text style={[styles.versionText, { color: colors.success }]}>
                RoMM v{serverVersion}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.testButton, { borderColor: colors.primary }]}
            onPress={handleTestConnection}
            disabled={testing}
          >
            {testing ? (
              <ActivityIndicator color={colors.primary} size="small" />
            ) : (
              <>
                <MaterialCommunityIcons name="connection" size={18} color={colors.primary} />
                <Text style={[styles.testButtonText, { color: colors.primary }]}>Test Connection</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: colors.primary }]}
            onPress={handleSave}
            disabled={testing}
          >
            {testing ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <MaterialCommunityIcons name="check" size={20} color="#fff" />
                <Text style={styles.saveButtonText}>Connect to Server</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <Text style={[styles.footer, { color: colors.textSecondary }]}>
          by Cleyvin @ 2026
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: fontSize.title,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: fontSize.md,
    marginTop: 8,
    textAlign: 'center',
  },
  form: {
    flex: 1,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    height: 50,
    borderRadius: borderRadius.lg,
    paddingHorizontal: 16,
    fontSize: fontSize.lg,
    borderWidth: 1,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingVertical: 8,
  },
  switchLabel: {
    fontSize: fontSize.lg,
    fontWeight: '500',
  },
  versionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: borderRadius.md,
    marginTop: 16,
  },
  versionText: {
    marginLeft: 8,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  testButton: {
    height: 50,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  testButtonText: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginLeft: 8,
  },
  saveButton: {
    height: 50,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: fontSize.lg,
    fontWeight: '700',
    marginLeft: 8,
  },
  footer: {
    textAlign: 'center',
    marginTop: 32,
    fontSize: fontSize.sm,
  },
});

export default ServerConfigScreen;

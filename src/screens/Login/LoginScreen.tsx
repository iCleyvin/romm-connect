// by Cleyvin

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveCredentials, saveApiToken } from '../../hooks/useAuthHeaders';
import { useApp } from '../../store/AppContext';
import { login, loginWithApiToken, getCurrentUser } from '../../api';
import { STORAGE_KEYS } from '../../constants';
import { RootStackParamList } from '../../types';
import { spacing, borderRadius, fontSize } from '../../theme';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Login'>;
};

type LoginMethod = 'credentials' | 'apitoken';

const LoginScreen = ({ navigation }: Props) => {
  const { colors, setUser, setCredentials, setAuthToken, setAuthMethod } = useApp();
  const insets = useSafeAreaInsets();
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('credentials');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [apiToken, setApiTokenInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (loginMethod === 'credentials') {
      if (!username.trim() || !password.trim()) {
        setError('Please enter username and password');
        return;
      }
    } else {
      if (!apiToken.trim()) {
        setError('Please enter your API token');
        return;
      }
      if (!apiToken.trim().startsWith('rmm_')) {
        setError('Invalid token format. RoMM API tokens start with rmm_');
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      if (loginMethod === 'credentials') {
        const tokens = await login(username.trim(), password);
        await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKENS, JSON.stringify(tokens));
        setAuthToken(tokens.access_token);
        const creds = { username: username.trim(), password };
        setCredentials(creds);
        await saveCredentials(creds.username, creds.password);
        await AsyncStorage.setItem(STORAGE_KEYS.AUTH_METHOD, 'oauth');
        setAuthMethod('oauth');
      } else {
        await loginWithApiToken(apiToken.trim());
        setAuthToken(apiToken.trim());
        await saveApiToken(apiToken.trim());
        await AsyncStorage.setItem(STORAGE_KEYS.AUTH_METHOD, 'token');
        setAuthMethod('token');
      }

      const userData = await getCurrentUser();
      setUser(userData);
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));

      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    } catch (err: any) {
      console.error('Login error:', JSON.stringify({
        status: err.response?.status,
        data: err.response?.data,
        message: err.message,
        code: err.code,
      }));
      if (err.response?.status === 401) {
        setError(loginMethod === 'credentials'
          ? 'Invalid username or password'
          : 'Invalid or expired API token');
      } else if (err.response?.status === 403) {
        setError(`Forbidden: ${JSON.stringify(err.response?.data?.detail || err.response?.data)}`);
      } else {
        setError(`Error ${err.response?.status || err.code}: ${err.response?.data?.detail || err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 60 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={[styles.logoCircle, { backgroundColor: colors.primary + '20' }]}>
            <MaterialCommunityIcons name="gamepad-variant" size={48} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Welcome Back</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Sign in to your RoMM server
          </Text>
        </View>

        {/* Login method toggle */}
        <View style={[styles.toggleContainer, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.toggleButton, loginMethod === 'credentials' && { backgroundColor: colors.primary }]}
            onPress={() => { setLoginMethod('credentials'); setError(null); }}
          >
            <MaterialCommunityIcons
              name="account-key"
              size={16}
              color={loginMethod === 'credentials' ? '#fff' : colors.textSecondary}
            />
            <Text style={[styles.toggleText, { color: loginMethod === 'credentials' ? '#fff' : colors.textSecondary }]}>
              Credentials
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, loginMethod === 'apitoken' && { backgroundColor: colors.primary }]}
            onPress={() => { setLoginMethod('apitoken'); setError(null); }}
          >
            <MaterialCommunityIcons
              name="key-chain"
              size={16}
              color={loginMethod === 'apitoken' ? '#fff' : colors.textSecondary}
            />
            <Text style={[styles.toggleText, { color: loginMethod === 'apitoken' ? '#fff' : colors.textSecondary }]}>
              API Token
            </Text>
          </TouchableOpacity>
        </View>

        {error && (
          <View style={[styles.errorContainer, { backgroundColor: colors.error + '15' }]}>
            <MaterialCommunityIcons name="alert-circle" size={18} color={colors.error} />
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          </View>
        )}

        <View style={styles.form}>
          {loginMethod === 'credentials' ? (
            <>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Username</Text>
              <View style={[styles.inputContainer, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                <MaterialCommunityIcons name="account" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Enter username"
                  placeholderTextColor={colors.placeholder}
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <Text style={[styles.label, { color: colors.textSecondary }]}>Password</Text>
              <View style={[styles.inputContainer, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                <MaterialCommunityIcons name="lock" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Enter password"
                  placeholderTextColor={colors.placeholder}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                  <MaterialCommunityIcons
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Text style={[styles.label, { color: colors.textSecondary }]}>API Token</Text>
              <View style={[styles.inputContainer, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                <MaterialCommunityIcons name="key" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="rmm_xxxxxxxx..."
                  placeholderTextColor={colors.placeholder}
                  value={apiToken}
                  onChangeText={setApiTokenInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry={!showToken}
                />
                <TouchableOpacity onPress={() => setShowToken(!showToken)} style={styles.eyeButton}>
                  <MaterialCommunityIcons
                    name={showToken ? 'eye-off' : 'eye'}
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
              <Text style={[styles.hint, { color: colors.textSecondary }]}>
                Generate a token in your RoMM server under Settings {'>'} API Tokens
              </Text>
            </>
          )}

          <TouchableOpacity
            style={[styles.loginButton, { backgroundColor: colors.primary }]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.loginButtonText}>
                {loginMethod === 'credentials' ? 'Sign In' : 'Connect'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.changeServerButton}
            onPress={() => navigation.reset({ index: 0, routes: [{ name: 'ServerConfig' }] })}
          >
            <MaterialCommunityIcons name="server-network" size={16} color={colors.textSecondary} />
            <Text style={[styles.changeServerText, { color: colors.textSecondary }]}>
              Change Server
            </Text>
          </TouchableOpacity>
        </View>
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
  header: {
    alignItems: 'center',
    marginBottom: 24,
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
  },
  toggleContainer: {
    flexDirection: 'row',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: 4,
    marginBottom: 16,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    gap: 6,
  },
  toggleText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: borderRadius.md,
    marginBottom: 16,
  },
  errorText: {
    marginLeft: 8,
    fontSize: fontSize.md,
    flex: 1,
  },
  form: {},
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: fontSize.lg,
    height: '100%',
  },
  eyeButton: {
    padding: 8,
  },
  hint: {
    fontSize: fontSize.sm,
    marginTop: 8,
    fontStyle: 'italic',
  },
  loginButton: {
    height: 50,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  changeServerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    padding: 8,
  },
  changeServerText: {
    marginLeft: 6,
    fontSize: fontSize.md,
  },
});

export default LoginScreen;

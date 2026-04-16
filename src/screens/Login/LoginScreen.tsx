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
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { saveCredentials, saveApiToken } from '../../hooks/useAuthHeaders';
import { useApp } from '../../store/AppContext';
import { login, loginWithApiToken, exchangePairingCode, getCurrentUser } from '../../api';
import { STORAGE_KEYS } from '../../constants';
import { RootStackParamList } from '../../types';
import { spacing, borderRadius, fontSize } from '../../theme';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Login'>;
};

type LoginMethod = 'credentials' | 'apitoken';

const extractPairingCode = (scanned: string): string | null => {
  const cleaned = scanned.trim();
  const urlMatch = cleaned.match(/[?&]code=([A-Za-z0-9-]+)/);
  if (urlMatch) return urlMatch[1];
  const plainMatch = cleaned.match(/^[A-Za-z0-9-]{8,10}$/);
  if (plainMatch) return cleaned;
  return null;
};

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
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  const openScanner = async () => {
    setError(null);
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        setError('Camera permission is required to scan QR codes');
        return;
      }
    }
    setScanning(false);
    setScannerOpen(true);
  };

  const handleQRScanned = async ({ data }: { data: string }) => {
    if (scanning) return;
    setScanning(true);

    const code = extractPairingCode(data);
    if (!code) {
      setError('Invalid QR code. Expected a RoMM pairing code.');
      setScannerOpen(false);
      setScanning(false);
      return;
    }

    try {
      const rawToken = await exchangePairingCode(code);
      setApiTokenInput(rawToken);
      setScannerOpen(false);
    } catch (err: any) {
      if (err.response?.status === 404) {
        setError('Pairing code expired. Generate a new one in your RoMM server.');
      } else if (err.response?.status === 429) {
        setError('Too many attempts. Wait a moment and try again.');
      } else {
        setError(`Failed to exchange pairing code: ${err.message}`);
      }
      setScannerOpen(false);
    } finally {
      setScanning(false);
    }
  };

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
              <View style={styles.tokenLabelRow}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>API Token</Text>
                <TouchableOpacity style={styles.scanButton} onPress={openScanner}>
                  <MaterialCommunityIcons name="qrcode-scan" size={16} color={colors.primary} />
                  <Text style={[styles.scanButtonText, { color: colors.primary }]}>Scan QR</Text>
                </TouchableOpacity>
              </View>
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
                Generate a token in your RoMM server under Settings {'>'} API Tokens, or scan the pairing QR code.
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

        <View style={[styles.watermark, { paddingBottom: insets.bottom + 16 }]}>
          <Text style={[styles.watermarkText, { color: colors.textSecondary }]}>
            by Cleyvin · 2026
          </Text>
        </View>
      </ScrollView>

      <Modal visible={scannerOpen} animationType="slide" onRequestClose={() => setScannerOpen(false)}>
        <View style={[styles.scannerContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.scannerHeader, { paddingTop: insets.top + 12 }]}>
            <TouchableOpacity onPress={() => setScannerOpen(false)} style={styles.scannerClose}>
              <MaterialCommunityIcons name="close" size={28} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.scannerTitle, { color: colors.text }]}>Scan Pairing QR</Text>
            <View style={{ width: 28 }} />
          </View>
          {permission?.granted ? (
            <CameraView
              style={styles.camera}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={scanning ? undefined : handleQRScanned}
            >
              <View style={styles.scannerOverlay}>
                <View style={[styles.scannerFrame, { borderColor: colors.primary }]} />
                <Text style={[styles.scannerHint, { color: '#fff' }]}>
                  {scanning ? 'Exchanging code...' : 'Point the camera at the QR code'}
                </Text>
              </View>
            </CameraView>
          ) : (
            <View style={styles.permissionPrompt}>
              <Text style={[styles.hint, { color: colors.text }]}>Camera permission required</Text>
            </View>
          )}
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 20,
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
  tokenLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  scanButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
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
  watermark: {
    alignItems: 'center',
    marginTop: 40,
  },
  watermarkText: {
    fontSize: fontSize.sm,
    opacity: 0.6,
  },
  scannerContainer: {
    flex: 1,
  },
  scannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  scannerClose: {
    padding: 4,
  },
  scannerTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  camera: {
    flex: 1,
  },
  scannerOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  scannerFrame: {
    width: 260,
    height: 260,
    borderWidth: 3,
    borderRadius: 16,
  },
  scannerHint: {
    marginTop: 20,
    fontSize: fontSize.md,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  permissionPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default LoginScreen;

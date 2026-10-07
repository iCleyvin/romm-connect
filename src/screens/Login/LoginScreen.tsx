// by Cleyvin

import React, { useRef, useState } from 'react';
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
import { useApp } from '../../store/AppContext';
import { describeError, httpStatus, isApiToken, loginWithPassword, pairFromQr } from '../../api';
import { borderRadius, fontSize, IconName } from '../../theme';
import QrScannerModal from '../../components/common/QrScannerModal';

type LoginMethod = 'credentials' | 'token';

const METHODS: { key: LoginMethod; label: string; icon: IconName }[] = [
  { key: 'credentials', label: 'Password', icon: 'account-key' },
  { key: 'token', label: 'API token', icon: 'key-chain' },
];

const LoginScreen = () => {
  const { colors, serverUrl, heartbeat, sessionExpired, signIn, connectServer, forgetServer } = useApp();
  const insets = useSafeAreaInsets();
  const passwordDisabled = heartbeat?.FRONTEND?.DISABLE_USERPASS_LOGIN === true;
  const [method, setMethod] = useState<LoginMethod>(passwordDisabled ? 'token' : 'credentials');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [secretVisible, setSecretVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    sessionExpired ? 'Your session expired. Sign in again to continue.' : null,
  );
  const [scannerOpen, setScannerOpen] = useState(false);
  const [pairing, setPairing] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  const handleLogin = async () => {
    const token = apiToken.trim();
    if (method === 'credentials' && (!username.trim() || !password)) {
      setError('Enter your username and password');
      return;
    }
    if (method === 'token' && !isApiToken(token)) {
      setError('RoMM API tokens start with rmm_');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const session =
        method === 'credentials'
          ? await loginWithPassword(username.trim(), password)
          : ({ kind: 'token', apiToken: token } as const);
      await signIn(session);
    } catch (err) {
      if (httpStatus(err) === 401) {
        setError(method === 'credentials' ? 'Wrong username or password' : 'This API token is invalid or expired');
      } else {
        setError(describeError(err, 'Sign-in failed'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleScanned = async (data: string) => {
    setPairing(true);
    setError(null);
    try {
      const { url, heartbeat: pairedHeartbeat, session } = await pairFromQr(data, serverUrl);
      setScannerOpen(false);
      // A code issued by another server switches to that server.
      if (url === serverUrl) await signIn(session);
      else await connectServer(url, pairedHeartbeat, session);
    } catch (err) {
      setScannerOpen(false);
      setError(describeError(err, 'Pairing failed'));
    } finally {
      setPairing(false);
    }
  };

  const inputBox = [styles.inputBox, { backgroundColor: colors.inputBackground, borderColor: colors.border }];

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={[styles.logo, { backgroundColor: colors.primary + '20' }]}>
            <MaterialCommunityIcons name="gamepad-variant" size={48} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Sign in</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
            {serverUrl?.replace(/^https?:\/\//, '')}
            {heartbeat ? ` · RoMM ${heartbeat.SYSTEM.VERSION}` : ''}
          </Text>
        </View>

        {serverUrl?.startsWith('http://') && (
          <View style={[styles.insecure, { backgroundColor: colors.warning + '18' }]}>
            <MaterialCommunityIcons name="lock-open-variant" size={18} color={colors.warning} />
            <Text style={[styles.insecureText, { color: colors.text }]}>
              This connection is not encrypted. Only sign in on a network you trust, or put your server behind HTTPS.
            </Text>
          </View>
        )}

        <View style={[styles.toggle, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
          {METHODS.map(({ key, label, icon }) => {
            const active = method === key;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.toggleButton, active && { backgroundColor: colors.primary }]}
                onPress={() => {
                  setMethod(key);
                  setError(null);
                  setSecretVisible(false);
                }}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
              >
                <MaterialCommunityIcons name={icon} size={16} color={active ? '#fff' : colors.textSecondary} />
                <Text style={[styles.toggleText, { color: active ? '#fff' : colors.textSecondary }]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {error && (
          <View style={[styles.error, { backgroundColor: colors.error + '15' }]}>
            <MaterialCommunityIcons name="alert-circle" size={18} color={colors.error} />
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          </View>
        )}

        {method === 'credentials' ? (
          <>
            {passwordDisabled && (
              <Text style={[styles.hint, { color: colors.warning }]}>
                This server has password sign-in turned off. Use an API token instead.
              </Text>
            )}
            <Text style={[styles.label, { color: colors.textSecondary }]}>Username</Text>
            <View style={inputBox}>
              <MaterialCommunityIcons name="account" size={20} color={colors.textSecondary} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Username"
                placeholderTextColor={colors.placeholder}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="username"
                textContentType="username"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
              />
            </View>

            <Text style={[styles.label, { color: colors.textSecondary }]}>Password</Text>
            <View style={inputBox}>
              <MaterialCommunityIcons name="lock" size={20} color={colors.textSecondary} />
              <TextInput
                ref={passwordRef}
                style={[styles.input, { color: colors.text }]}
                placeholder="Password"
                placeholderTextColor={colors.placeholder}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!secretVisible}
                autoCapitalize="none"
                autoComplete="password"
                textContentType="password"
                returnKeyType="go"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity
                onPress={() => setSecretVisible((visible) => !visible)}
                hitSlop={10}
                accessibilityLabel={secretVisible ? 'Hide password' : 'Show password'}
              >
                <MaterialCommunityIcons name={secretVisible ? 'eye-off' : 'eye'} size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <View style={styles.labelRow}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>API token</Text>
              <TouchableOpacity style={styles.scanButton} onPress={() => setScannerOpen(true)}>
                <MaterialCommunityIcons name="qrcode-scan" size={16} color={colors.primary} />
                <Text style={[styles.scanButtonText, { color: colors.primary }]}>Scan QR</Text>
              </TouchableOpacity>
            </View>
            <View style={inputBox}>
              <MaterialCommunityIcons name="key" size={20} color={colors.textSecondary} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="rmm_…"
                placeholderTextColor={colors.placeholder}
                value={apiToken}
                onChangeText={setApiToken}
                secureTextEntry={!secretVisible}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="go"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity
                onPress={() => setSecretVisible((visible) => !visible)}
                hitSlop={10}
                accessibilityLabel={secretVisible ? 'Hide token' : 'Show token'}
              >
                <MaterialCommunityIcons name={secretVisible ? 'eye-off' : 'eye'} size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.hint, { color: colors.textSecondary }]}>
              Create a client token in your RoMM profile and paste it here, or scan its pairing QR.
            </Text>
          </>
        )}

        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: colors.primary }]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Sign in</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.changeServer} onPress={forgetServer} disabled={loading}>
          <MaterialCommunityIcons name="server-network" size={16} color={colors.textSecondary} />
          <Text style={[styles.changeServerText, { color: colors.textSecondary }]}>Use a different server</Text>
        </TouchableOpacity>

        <Text style={[styles.footer, { color: colors.textSecondary }]}>by Cleyvin · 2026</Text>
      </ScrollView>

      <QrScannerModal
        visible={scannerOpen}
        busy={pairing}
        onScanned={handleScanned}
        onClose={() => setScannerOpen(false)}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 24 },
  header: { alignItems: 'center', marginBottom: 24 },
  logo: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: { fontSize: fontSize.title, fontWeight: '700' },
  subtitle: { fontSize: fontSize.md, marginTop: 8 },
  toggle: {
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
  toggleText: { fontSize: fontSize.sm, fontWeight: '600' },
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: borderRadius.md,
    marginBottom: 8,
  },
  errorText: { marginLeft: 8, fontSize: fontSize.md, flex: 1 },
  insecure: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: borderRadius.md,
    marginBottom: 16,
  },
  insecureText: { flex: 1, fontSize: fontSize.sm, lineHeight: 17 },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  scanButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 6 },
  scanButtonText: { fontSize: fontSize.sm, fontWeight: '600' },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: 12,
    gap: 8,
  },
  input: { flex: 1, fontSize: fontSize.lg, height: '100%', paddingVertical: 0 },
  hint: { fontSize: fontSize.sm, marginTop: 8, lineHeight: 17 },
  primaryButton: {
    height: 50,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
  },
  primaryButtonText: { color: '#fff', fontSize: fontSize.lg, fontWeight: '700' },
  changeServer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 20,
    padding: 8,
  },
  changeServerText: { fontSize: fontSize.md },
  footer: { textAlign: 'center', marginTop: 'auto', paddingTop: 32, fontSize: fontSize.sm, opacity: 0.7 },
});

export default LoginScreen;

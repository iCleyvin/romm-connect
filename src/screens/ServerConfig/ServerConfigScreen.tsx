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
import { useApp } from '../../store/AppContext';
import { describeError, pairFromQr, probeServer } from '../../api';
import { borderRadius, fontSize } from '../../theme';
import QrScannerModal from '../../components/common/QrScannerModal';

const ServerConfigScreen = () => {
  const { colors, connectServer } = useApp();
  const insets = useSafeAreaInsets();
  const [address, setAddress] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [pairing, setPairing] = useState(false);

  const handleConnect = async () => {
    if (!address.trim()) {
      setError('Enter your server address');
      return;
    }
    setConnecting(true);
    setError(null);
    try {
      const { url, heartbeat } = await probeServer(address);
      await connectServer(url, heartbeat);
    } catch (err) {
      setError(describeError(err, 'Could not connect to this server'));
    } finally {
      setConnecting(false);
    }
  };

  const handleScanned = async (data: string) => {
    setPairing(true);
    setError(null);
    try {
      const { url, heartbeat, session } = await pairFromQr(data, address.trim() || null);
      setScannerOpen(false);
      await connectServer(url, heartbeat, session);
    } catch (err) {
      setScannerOpen(false);
      setError(describeError(err, 'Pairing failed'));
    } finally {
      setPairing(false);
    }
  };

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
          <Text style={[styles.title, { color: colors.text }]}>RoMM Connect</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Connect to your RoMM server to browse and play your library.
          </Text>
        </View>

        {error && (
          <View style={[styles.error, { backgroundColor: colors.error + '15' }]}>
            <MaterialCommunityIcons name="alert-circle" size={18} color={colors.error} />
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          </View>
        )}

        <Text style={[styles.label, { color: colors.textSecondary }]}>Server address</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
          placeholder="romm.example.com or 192.168.1.10:8080"
          placeholderTextColor={colors.placeholder}
          value={address}
          onChangeText={setAddress}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          returnKeyType="go"
          onSubmitEditing={handleConnect}
        />
        <Text style={[styles.hint, { color: colors.textSecondary }]}>
          HTTPS is tried first. Start the address with http:// to force a plain connection.
        </Text>

        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: colors.primary }]}
          onPress={handleConnect}
          disabled={connecting}
        >
          {connecting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Connect</Text>}
        </TouchableOpacity>

        <View style={styles.dividerRow}>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Text style={[styles.dividerText, { color: colors.textSecondary }]}>or</Text>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
        </View>

        <TouchableOpacity
          style={[styles.secondaryButton, { borderColor: colors.primary }]}
          onPress={() => {
            setError(null);
            setScannerOpen(true);
          }}
          disabled={connecting}
        >
          <MaterialCommunityIcons name="qrcode-scan" size={20} color={colors.primary} />
          <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>Scan pairing QR</Text>
        </TouchableOpacity>
        <Text style={[styles.hint, { color: colors.textSecondary, textAlign: 'center' }]}>
          The pairing code from your server sets up the address and signs you in.
        </Text>

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
  header: { alignItems: 'center', marginBottom: 32 },
  logo: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: { fontSize: fontSize.title, fontWeight: '700' },
  subtitle: { fontSize: fontSize.md, marginTop: 8, textAlign: 'center', lineHeight: 20 },
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: borderRadius.md,
    marginBottom: 16,
  },
  errorText: { marginLeft: 8, fontSize: fontSize.md, flex: 1 },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginBottom: 6,
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
  hint: { fontSize: fontSize.sm, marginTop: 8, lineHeight: 17 },
  primaryButton: {
    height: 50,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  primaryButtonText: { color: '#fff', fontSize: fontSize.lg, fontWeight: '700' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 20, gap: 12 },
  divider: { flex: 1, height: StyleSheet.hairlineWidth },
  dividerText: { fontSize: fontSize.sm },
  secondaryButton: {
    height: 50,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryButtonText: { fontSize: fontSize.lg, fontWeight: '600' },
  footer: { textAlign: 'center', marginTop: 'auto', paddingTop: 32, fontSize: fontSize.sm, opacity: 0.7 },
});

export default ServerConfigScreen;

// by Cleyvin

import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Linking, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useApp } from '../../store/AppContext';
import { borderRadius, fontSize } from '../../theme';

interface Props {
  visible: boolean;
  /** True while the scanned code is being processed. */
  busy: boolean;
  onScanned: (data: string) => void;
  onClose: () => void;
}

const QrScannerModal = ({ visible, busy, onScanned, onClose }: Props) => {
  const { colors } = useApp();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  // The camera reports the same code many times a second; act on it once.
  const handled = useRef(false);

  useEffect(() => {
    if (!visible) return;
    handled.current = false;
    if (permission && !permission.granted && permission.canAskAgain) requestPermission();
  }, [visible, permission, requestPermission]);

  const handleScan = ({ data }: { data: string }) => {
    if (handled.current || busy) return;
    handled.current = true;
    onScanned(data);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={onClose} hitSlop={12} accessibilityLabel="Close scanner">
            <MaterialCommunityIcons name="close" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Scan pairing QR</Text>
          <View style={{ width: 28 }} />
        </View>

        {permission?.granted ? (
          <View style={styles.cameraWrap}>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={handleScan}
            />
            <View style={styles.overlay} pointerEvents="none">
              <View style={[styles.frame, { borderColor: colors.primary }]} />
              {busy ? (
                <View style={styles.busyRow}>
                  <ActivityIndicator color="#fff" />
                  <Text style={styles.hint}>Pairing…</Text>
                </View>
              ) : (
                <Text style={styles.hint}>Point the camera at the pairing QR shown by your RoMM server.</Text>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.permission}>
            <MaterialCommunityIcons name="camera-off" size={56} color={colors.gray} />
            <Text style={[styles.permissionText, { color: colors.text }]}>
              Camera access is needed to scan the pairing code.
            </Text>
            <TouchableOpacity
              style={[styles.permissionButton, { backgroundColor: colors.primary }]}
              onPress={() => (permission?.canAskAgain ? requestPermission() : Linking.openSettings())}
            >
              <Text style={styles.permissionButtonText}>
                {permission?.canAskAgain ? 'Allow camera' : 'Open settings'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  title: { fontSize: fontSize.lg, fontWeight: '700' },
  cameraWrap: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  frame: {
    width: 250,
    height: 250,
    borderWidth: 3,
    borderRadius: 16,
  },
  busyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 20 },
  hint: {
    color: '#fff',
    marginTop: 20,
    fontSize: fontSize.md,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 20,
  },
  permission: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  permissionText: { fontSize: fontSize.lg, textAlign: 'center', marginTop: 16, lineHeight: 22 },
  permissionButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: borderRadius.lg,
  },
  permissionButtonText: { color: '#fff', fontSize: fontSize.lg, fontWeight: '700' },
});

export default QrScannerModal;

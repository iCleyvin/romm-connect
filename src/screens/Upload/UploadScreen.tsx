// by Cleyvin

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as DocumentPicker from 'expo-document-picker';
import { useApp } from '../../store/AppContext';
import { getPlatforms, uploadRom } from '../../api';
import { Platform as PlatformType, RootStackParamList } from '../../types';
import { spacing, borderRadius, fontSize } from '../../theme';
import ScreenHeader from '../../components/common/ScreenHeader';

const UploadScreen = () => {
  const { colors } = useApp();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [platforms, setPlatforms] = useState<PlatformType[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformType | null>(null);
  const [selectedFile, setSelectedFile] = useState<{ uri: string; name: string; size: number } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    getPlatforms().then((data) => {
      setPlatforms(data.sort((a, b) => a.name.localeCompare(b.name)));
    });
  }, []);

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*' });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      setSelectedFile({ uri: asset.uri, name: asset.name, size: asset.size || 0 });
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedPlatform) {
      Alert.alert('Error', 'Select a platform and a ROM file');
      return;
    }

    setUploading(true);
    setProgress(0);
    try {
      await uploadRom(
        selectedPlatform.id,
        selectedFile.name,
        selectedFile.uri,
        setProgress,
      );
      Alert.alert('Success', `${selectedFile.name} uploaded to ${selectedPlatform.name}`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Upload failed';
      Alert.alert('Error', typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setUploading(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return ` (${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]})`;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Upload ROM" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Select Platform */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>Platform</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.platformScroll}
          contentContainerStyle={styles.platformList}
        >
          {platforms.map((p) => (
            <TouchableOpacity
              key={p.id}
              onPress={() => setSelectedPlatform(p)}
              style={[
                styles.platformChip,
                {
                  backgroundColor: selectedPlatform?.id === p.id ? colors.primary : colors.topLayer,
                  borderColor: selectedPlatform?.id === p.id ? colors.primary : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.platformChipText,
                  { color: selectedPlatform?.id === p.id ? '#fff' : colors.text },
                ]}
              >
                {p.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {selectedPlatform && (
          <View style={[styles.selectedInfo, { backgroundColor: colors.topLayer }]}>
            <MaterialCommunityIcons name="check-circle" size={16} color={colors.success} />
            <Text style={[styles.selectedText, { color: colors.text }]}>
              {selectedPlatform.name} ({selectedPlatform.fs_slug})
            </Text>
          </View>
        )}

        {/* Select File */}
        <Text style={[styles.label, { color: colors.textSecondary, marginTop: spacing.lg }]}>ROM File</Text>
        <TouchableOpacity
          style={[styles.filePicker, { backgroundColor: colors.topLayer, borderColor: colors.border }]}
          onPress={pickFile}
        >
          <MaterialCommunityIcons
            name={selectedFile ? 'file-check' : 'file-upload'}
            size={32}
            color={selectedFile ? colors.success : colors.primary}
          />
          <Text style={[styles.fileText, { color: colors.text }]}>
            {selectedFile ? `${selectedFile.name}${formatSize(selectedFile.size)}` : 'Tap to select ROM file'}
          </Text>
        </TouchableOpacity>

        {/* Upload Progress */}
        {uploading && (
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
              <View style={[styles.progressFill, { backgroundColor: colors.primary, width: `${progress}%` }]} />
            </View>
            <Text style={[styles.progressText, { color: colors.textSecondary }]}>{progress}%</Text>
          </View>
        )}

        {/* Upload Button */}
        <TouchableOpacity
          style={[
            styles.uploadButton,
            { backgroundColor: selectedFile && selectedPlatform ? colors.primary : colors.gray },
          ]}
          onPress={handleUpload}
          disabled={uploading || !selectedFile || !selectedPlatform}
        >
          {uploading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <MaterialCommunityIcons name="upload" size={22} color="#fff" />
              <Text style={styles.uploadText}>Upload ROM</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: 40 },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  platformScroll: { maxHeight: 50 },
  platformList: { paddingRight: spacing.md },
  platformChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginRight: spacing.sm,
  },
  platformChipText: { fontSize: fontSize.sm, fontWeight: '600' },
  selectedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
  },
  selectedText: { fontSize: fontSize.md, marginLeft: 8 },
  filePicker: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileText: { fontSize: fontSize.md, marginTop: spacing.sm, textAlign: 'center' },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  progressBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 4 },
  progressText: { marginLeft: spacing.sm, fontSize: fontSize.sm, fontWeight: '600' },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: borderRadius.lg,
    marginTop: spacing.lg,
  },
  uploadText: { color: '#fff', fontSize: fontSize.lg, fontWeight: '700', marginLeft: 8 },
});

export default UploadScreen;

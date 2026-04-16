// by Cleyvin

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from '../../store/AppContext';
import { logout, clearTokens, getBaseUrl } from '../../api';
import { STORAGE_KEYS } from '../../constants';
import { RootStackParamList, HeartbeatResponse } from '../../types';
import { testConnection } from '../../api';
import { spacing, borderRadius, fontSize } from '../../theme';
import ScreenHeader from '../../components/common/ScreenHeader';

const SettingsScreen = () => {
  const { colors, user, theme, toggleTheme, serverConfig, setUser, setServerConfig } = useApp();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [serverInfo, setServerInfo] = useState<HeartbeatResponse | null>(null);

  useEffect(() => {
    if (serverConfig) {
      testConnection(serverConfig)
        .then(setServerInfo)
        .catch(() => {});
    }
  }, [serverConfig]);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          clearTokens();
          await AsyncStorage.multiRemove([STORAGE_KEYS.AUTH_TOKENS, STORAGE_KEYS.USER]);
          setUser(null);
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        },
      },
    ]);
  };

  const handleChangeServer = () => {
    Alert.alert('Change Server', 'This will disconnect from the current server.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Change',
        onPress: async () => {
          await logout();
          clearTokens();
          await AsyncStorage.multiRemove([
            STORAGE_KEYS.AUTH_TOKENS,
            STORAGE_KEYS.USER,
            STORAGE_KEYS.SERVER_CONFIG,
          ]);
          setUser(null);
          setServerConfig(null);
          navigation.reset({ index: 0, routes: [{ name: 'ServerConfig' }] });
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Settings" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* User Section */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Account</Text>
        <View style={[styles.card, { backgroundColor: colors.topLayer, borderColor: colors.border }]}>
          <View style={styles.userRow}>
            <View style={[styles.avatar, { backgroundColor: colors.primary + '30' }]}>
              <MaterialCommunityIcons name="account" size={28} color={colors.primary} />
            </View>
            <View style={styles.userInfo}>
              <Text style={[styles.userName, { color: colors.text }]}>{user?.username || 'Unknown'}</Text>
              <Text style={[styles.userRole, { color: colors.textSecondary }]}>
                {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'User'}
              </Text>
              {user?.email && (
                <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{user.email}</Text>
              )}
            </View>
          </View>
        </View>

        {/* Server Section */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Server</Text>
        <View style={[styles.card, { backgroundColor: colors.topLayer, borderColor: colors.border }]}>
          <SettingRow
            colors={colors}
            icon="server-network"
            label="Server Address"
            value={serverConfig ? getBaseUrl(serverConfig) : 'Not configured'}
          />
          {serverInfo && (
            <SettingRow
              colors={colors}
              icon="information"
              label="Version"
              value={`RoMM v${serverInfo.SYSTEM?.VERSION || 'unknown'}`}
            />
          )}
          <TouchableOpacity style={styles.settingRow} onPress={handleChangeServer}>
            <MaterialCommunityIcons name="swap-horizontal" size={20} color={colors.accent} />
            <Text style={[styles.settingLabel, { color: colors.accent }]}>Change Server</Text>
          </TouchableOpacity>
        </View>

        {/* Appearance */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Appearance</Text>
        <View style={[styles.card, { backgroundColor: colors.topLayer, borderColor: colors.border }]}>
          <View style={styles.settingRow}>
            <MaterialCommunityIcons
              name={theme === 'dark' ? 'weather-night' : 'white-balance-sunny'}
              size={20}
              color={colors.primary}
            />
            <Text style={[styles.settingLabel, { color: colors.text, flex: 1 }]}>Dark Mode</Text>
            <Switch
              value={theme === 'dark'}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.gray, true: colors.primaryDark }}
              thumbColor={theme === 'dark' ? colors.primary : colors.textSecondary}
            />
          </View>
        </View>

        {/* Actions */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Actions</Text>
        <View style={[styles.card, { backgroundColor: colors.topLayer, borderColor: colors.border }]}>
          <TouchableOpacity style={styles.settingRow} onPress={handleLogout}>
            <MaterialCommunityIcons name="logout" size={20} color={colors.error} />
            <Text style={[styles.settingLabel, { color: colors.error }]}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* Donate */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Support</Text>
        <View style={[styles.card, { backgroundColor: colors.topLayer, borderColor: colors.border }]}>
          <View style={styles.donateSection}>
            <MaterialCommunityIcons name="heart" size={32} color={colors.accent} />
            <Text style={[styles.donateTitle, { color: colors.text }]}>
              Love RoMM Connect?
            </Text>
            <Text style={[styles.donateText, { color: colors.textSecondary }]}>
              This app is free and open source. Your donation helps keep development going and means the world to me.
            </Text>
            <TouchableOpacity
              style={[styles.donateButton, { backgroundColor: colors.accent }]}
              onPress={() => {
                Linking.openURL('https://www.paypal.com/donate/?hosted_button_id=&business=cleyvinos@gmail.com&currency_code=USD');
              }}
            >
              <MaterialCommunityIcons name="hand-heart" size={20} color="#fff" />
              <Text style={styles.donateButtonText}>Donate via PayPal</Text>
            </TouchableOpacity>
            <Text style={[styles.donateThank, { color: colors.primary }]}>
              Thank you for your generosity!
            </Text>
          </View>
        </View>

        {/* About */}
        <View style={styles.aboutSection}>
          <Text style={[styles.aboutTitle, { color: colors.textSecondary }]}>RoMM Connect</Text>
          <Text style={[styles.aboutVersion, { color: colors.gray }]}>v0.2.0</Text>
          <Text style={[styles.aboutFooter, { color: colors.gray }]}>
            A mobile client for RoMM ROM Manager
          </Text>
          <Text style={[styles.creditFooter, { color: colors.textSecondary }]}>
            by Cleyvin @ 2026
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const SettingRow = ({
  colors,
  icon,
  label,
  value,
}: {
  colors: any;
  icon: string;
  label: string;
  value: string;
}) => (
  <View style={styles.settingRow}>
    <MaterialCommunityIcons name={icon as any} size={20} color={colors.primary} />
    <Text style={[styles.settingLabel, { color: colors.text }]}>{label}</Text>
    <Text style={[styles.settingValue, { color: colors.textSecondary }]} numberOfLines={1}>
      {value}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    marginLeft: 4,
  },
  card: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    marginLeft: spacing.md,
    flex: 1,
  },
  userName: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  userRole: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  userEmail: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  settingLabel: {
    fontSize: fontSize.md,
    marginLeft: 12,
    flex: 1,
  },
  settingValue: {
    fontSize: fontSize.sm,
    maxWidth: 180,
  },
  aboutSection: {
    alignItems: 'center',
    marginTop: spacing.xxl,
    paddingBottom: spacing.lg,
  },
  aboutTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  aboutVersion: {
    fontSize: fontSize.sm,
    marginTop: 4,
  },
  aboutFooter: {
    fontSize: fontSize.xs,
    marginTop: 4,
  },
  creditFooter: {
    fontSize: fontSize.md,
    fontWeight: '600',
    marginTop: spacing.md,
  },
  donateSection: {
    alignItems: 'center',
    padding: spacing.lg,
  },
  donateTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  donateText: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
    paddingHorizontal: spacing.sm,
  },
  donateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    marginTop: spacing.md,
  },
  donateButtonText: {
    color: '#fff',
    fontSize: fontSize.lg,
    fontWeight: '700',
    marginLeft: 8,
  },
  donateThank: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginTop: spacing.md,
    fontStyle: 'italic',
  },
});

export default SettingsScreen;

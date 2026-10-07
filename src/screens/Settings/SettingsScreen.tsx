// by Cleyvin

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch, Linking } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Application from 'expo-application';
import { useApp } from '../../store/AppContext';
import { LINKS } from '../../constants';
import { spacing, borderRadius, fontSize, IconName, ThemeColors } from '../../theme';
import ScreenHeader from '../../components/common/ScreenHeader';

const SettingsScreen = () => {
  const { colors, user, theme, toggleTheme, serverUrl, heartbeat, signOut, forgetServer } = useApp();
  const appVersion = Application.nativeApplicationVersion;

  const confirmSignOut = () =>
    Alert.alert('Sign out', 'You will need to sign in again to use this server.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: signOut },
    ]);

  const confirmChangeServer = () =>
    Alert.alert('Change server', 'This signs you out and forgets the current server address.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Change server', style: 'destructive', onPress: forgetServer },
    ]);

  const card = [styles.card, { backgroundColor: colors.topLayer, borderColor: colors.border }];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Settings" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <SectionTitle colors={colors} title="Account" />
        <View style={card}>
          <View style={styles.userRow}>
            <View style={[styles.avatar, { backgroundColor: colors.primary + '30' }]}>
              <MaterialCommunityIcons name="account" size={28} color={colors.primary} />
            </View>
            <View style={styles.userInfo}>
              <Text style={[styles.userName, { color: colors.text }]}>{user?.username ?? 'Signed in'}</Text>
              {user?.role && (
                <Text style={[styles.userMeta, { color: colors.textSecondary }]}>
                  {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                </Text>
              )}
              {!!user?.email && <Text style={[styles.userMeta, { color: colors.textSecondary }]}>{user.email}</Text>}
            </View>
          </View>
          <Row colors={colors} icon="logout" label="Sign out" tint={colors.error} onPress={confirmSignOut} last />
        </View>

        <SectionTitle colors={colors} title="Server" />
        <View style={card}>
          <Row colors={colors} icon="server-network" label="Address" value={serverUrl ?? ''} />
          <Row
            colors={colors}
            icon="information"
            label="RoMM version"
            value={heartbeat?.SYSTEM?.VERSION ?? 'Unknown'}
          />
          <Row colors={colors} icon="swap-horizontal" label="Change server" tint={colors.accent} onPress={confirmChangeServer} last />
        </View>

        <SectionTitle colors={colors} title="Appearance" />
        <View style={card}>
          <View style={styles.row}>
            <MaterialCommunityIcons
              name={theme === 'dark' ? 'weather-night' : 'white-balance-sunny'}
              size={20}
              color={colors.primary}
            />
            <Text style={[styles.rowLabel, { color: colors.text }]}>Dark mode</Text>
            <Switch
              value={theme === 'dark'}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.gray, true: colors.primaryDark }}
              thumbColor={theme === 'dark' ? colors.primaryLight : '#f4f3f4'}
            />
          </View>
        </View>

        <SectionTitle colors={colors} title="About" />
        <View style={card}>
          <Row colors={colors} icon="heart" label="Support development" tint={colors.accent} onPress={() => Linking.openURL(LINKS.DONATE)} />
          <Row colors={colors} icon="github" label="Source code" onPress={() => Linking.openURL(LINKS.REPO)} />
          <Row colors={colors} icon="shield-lock" label="Privacy policy" onPress={() => Linking.openURL(LINKS.PRIVACY)} />
          <Row colors={colors} icon="file-document" label="Terms of use" onPress={() => Linking.openURL(LINKS.TERMS)} last />
        </View>

        <View style={styles.about}>
          <Text style={[styles.aboutTitle, { color: colors.textSecondary }]}>RoMM Connect{appVersion ? ` v${appVersion}` : ''}</Text>
          <Text style={[styles.aboutText, { color: colors.textSecondary }]}>
            An unofficial client for RoMM. Not affiliated with the RoMM project.
          </Text>
          <Text style={[styles.aboutText, { color: colors.textSecondary }]}>by Cleyvin · 2026</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const SectionTitle = ({ colors, title }: { colors: ThemeColors; title: string }) => (
  <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{title}</Text>
);

interface RowProps {
  colors: ThemeColors;
  icon: IconName;
  label: string;
  value?: string;
  tint?: string;
  onPress?: () => void;
  last?: boolean;
}

const Row = ({ colors, icon, label, value, tint, onPress, last }: RowProps) => {
  const content = (
    <>
      <MaterialCommunityIcons name={icon} size={20} color={tint ?? colors.primary} />
      <Text style={[styles.rowLabel, { color: tint ?? colors.text }, value !== undefined && styles.rowLabelFixed]}>
        {label}
      </Text>
      {value !== undefined && (
        <Text style={[styles.rowValue, { color: colors.textSecondary }]} numberOfLines={1} selectable>
          {value}
        </Text>
      )}
      {onPress && <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textSecondary} />}
    </>
  );
  const rowStyle = [styles.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }];

  return onPress ? (
    <TouchableOpacity style={rowStyle} onPress={onPress} accessibilityRole="button">
      {content}
    </TouchableOpacity>
  ) : (
    <View style={rowStyle}>{content}</View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.md, paddingBottom: 40 },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    marginLeft: 4,
  },
  card: { borderRadius: borderRadius.lg, borderWidth: 1, overflow: 'hidden' },
  userRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.md },
  avatar: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
  userInfo: { marginLeft: spacing.md, flex: 1 },
  userName: { fontSize: fontSize.lg, fontWeight: '700' },
  userMeta: { fontSize: fontSize.sm, marginTop: 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 50,
    paddingHorizontal: spacing.md,
  },
  rowLabel: { fontSize: fontSize.md, flex: 1 },
  rowLabelFixed: { flex: 0 },
  rowValue: { fontSize: fontSize.md, flex: 1, textAlign: 'right' },
  about: { alignItems: 'center', marginTop: spacing.xl, gap: 4 },
  aboutTitle: { fontSize: fontSize.md, fontWeight: '700' },
  aboutText: { fontSize: fontSize.sm, textAlign: 'center' },
});

export default SettingsScreen;

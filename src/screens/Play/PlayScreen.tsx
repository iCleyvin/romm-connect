// by Cleyvin

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, AppState, useWindowDimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useKeepAwake } from 'expo-keep-awake';
import * as WebBrowser from 'expo-web-browser';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../store/AppContext';
import { getFirmware, getFreshBearer, getRom, romContentPath, updateRomUser } from '../../api';
import { queryKeys } from '../../api/queryClient';
import { EJS_DATA_PATHS, getEmulationSupport } from '../../config/emulation';
import { API_PATHS, SCOPES } from '../../constants';
import { buildPlayerHtml, PlayerMessage } from '../../emulator/playerHtml';
import { RootStackParamList } from '../../types';
import { romTitle } from '../../utils';
import { borderRadius, fontSize, IconName, ThemeColors } from '../../theme';
import ScreenHeader from '../../components/common/ScreenHeader';
import LoadingScreen from '../../components/common/LoadingScreen';
import ErrorState from '../../components/common/ErrorState';

// Characters EmulatorJS cannot use in its storage keys (same set the RoMM web client strips).
const UNSAFE_NAME_CHARS = /[#<$+%>!`&*'|{}/\\?"=@:^\r\n]/g;
const FLUSH_TIMEOUT_MS = 4000;

interface MessageProps {
  colors: ThemeColors;
  icon: IconName;
  title: string;
  text: string;
  action: { label: string; onPress: () => void };
}

const Message = ({ colors, icon, title, text, action }: MessageProps) => (
  <View style={[styles.message, { backgroundColor: colors.background }]}>
    <MaterialCommunityIcons name={icon} size={64} color={colors.primary} />
    <Text style={[styles.messageTitle, { color: colors.text }]}>{title}</Text>
    <Text style={[styles.messageText, { color: colors.textSecondary }]}>{text}</Text>
    <TouchableOpacity style={[styles.messageButton, { backgroundColor: colors.primary }]} onPress={action.onPress}>
      <Text style={styles.messageButtonText}>{action.label}</Text>
    </TouchableOpacity>
  </View>
);

const PlayScreen = () => {
  useKeepAwake();
  const { colors, serverUrl, can } = useApp();
  const navigation = useNavigation();
  const { romId, fileId } = useRoute<RouteProp<RootStackParamList, 'Play'>>().params;
  const queryClient = useQueryClient();
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  const insets = useSafeAreaInsets();

  const webViewRef = useRef<WebView>(null);
  const startedRef = useRef(false);
  const leavingRef = useRef(false);
  const flushDoneRef = useRef<(() => void) | null>(null);
  const [html, setHtml] = useState<string | null>(null);
  const [fatal, setFatal] = useState<string | null>(null);
  const [exiting, setExiting] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const romQuery = useQuery({ queryKey: queryKeys.rom(romId), queryFn: () => getRom(romId) });
  const rom = romQuery.data;
  const emulation = useMemo(() => getEmulationSupport(rom?.platform_slug), [rom?.platform_slug]);
  const playable = !!rom && !!emulation.core && !emulation.needsBrowser;

  const wantsFirmware = playable && can(SCOPES.FIRMWARE_READ);
  const firmwareQuery = useQuery({
    queryKey: queryKeys.firmware(rom?.platform_id ?? 0),
    queryFn: () => getFirmware(rom!.platform_id),
    enabled: wantsFirmware,
    retry: false,
  });
  const firmwareSettled = !wantsFirmware || !firmwareQuery.isLoading;

  const canReadAssets = can(SCOPES.ASSETS_READ);
  const canWriteAssets = can(SCOPES.ASSETS_WRITE);
  const canTrackPlay = can(SCOPES.ROMS_USER_WRITE);

  useEffect(() => {
    if (!rom || !playable || !emulation.core || !firmwareSettled) return;
    let cancelled = false;
    setHtml(null);
    setFatal(null);
    startedRef.current = false;

    const build = async () => {
      const token = await getFreshBearer();
      if (cancelled) return;
      if (!token) {
        setFatal('Your session is no longer valid. Sign in again.');
        return;
      }
      const baseName = (rom.fs_name_no_ext || rom.fs_name.replace(/\.[^.]+$/, '')).trim();
      const bios = [...(firmwareQuery.data ?? [])].sort((a, b) => a.file_name.localeCompare(b.file_name))[0];
      setHtml(
        buildPlayerHtml({
          romId: rom.id,
          title: romTitle(rom),
          gameName: (rom.fs_name_no_tags || baseName).replace(UNSAFE_NAME_CHARS, '').trim() || `rom-${rom.id}`,
          core: emulation.core!,
          controlScheme: emulation.controlScheme,
          romUrl: romContentPath(rom, fileId),
          biosUrl: bios ? `${API_PATHS.FIRMWARE}/${bios.id}/content/${encodeURIComponent(bios.file_name)}` : '',
          saveFileName: `${baseName}.srm`,
          stateFileName: `${baseName}.state`,
          dataPaths: EJS_DATA_PATHS,
          token,
          canReadAssets,
          canWriteAssets,
          accent: colors.primary,
        }),
      );
    };
    build();
    return () => {
      cancelled = true;
    };
    // The page is built once per attempt; later theme or permission changes must not reload a running game.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rom?.id, playable, firmwareSettled, fileId, attempt]);

  const flushSave = useCallback(
    () =>
      new Promise<void>((resolve) => {
        if (!webViewRef.current || !startedRef.current) return resolve();
        flushDoneRef.current = resolve;
        webViewRef.current.injectJavaScript('window.__rommFlush && window.__rommFlush(); true;');
        setTimeout(resolve, FLUSH_TIMEOUT_MS);
      }),
    [],
  );

  // Hold every way of leaving (header, hardware back) until the save is on the server.
  useEffect(
    () =>
      navigation.addListener('beforeRemove', (event) => {
        if (leavingRef.current) return;
        event.preventDefault();
        leavingRef.current = true;
        setExiting(true);
        flushSave().then(() => navigation.dispatch(event.data.action));
      }),
    [navigation, flushSave],
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background') flushSave();
    });
    return () => subscription.remove();
  }, [flushSave]);

  useEffect(
    () => () => {
      if (!startedRef.current) return;
      const refresh = () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.rom(romId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.allRoms });
      };
      if (canTrackPlay) updateRomUser(romId, { now_playing: false }).catch(() => {}).finally(refresh);
      else refresh();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [romId],
  );

  const handleMessage = useCallback(
    async (event: WebViewMessageEvent) => {
      let message: PlayerMessage;
      try {
        message = JSON.parse(event.nativeEvent.data);
      } catch {
        return;
      }
      switch (message.type) {
        case 'TOKEN_REQUEST': {
          const token = await getFreshBearer(true);
          webViewRef.current?.injectJavaScript(`window.__rommSetToken(${JSON.stringify(token)}); true;`);
          break;
        }
        case 'STARTED':
          startedRef.current = true;
          if (canTrackPlay) updateRomUser(romId, { now_playing: true }, { touchLastPlayed: true }).catch(() => {});
          break;
        case 'FLUSHED':
          flushDoneRef.current?.();
          flushDoneRef.current = null;
          break;
        case 'FATAL':
          setFatal(message.message);
          break;
      }
    },
    [romId, canTrackPlay],
  );

  const title = rom ? romTitle(rom) : 'Play';
  const header = landscape ? null : (
    <ScreenHeader
      title={title}
      subtitle={emulation.core ? `${emulation.core} · saves sync to your server` : undefined}
      onBack={() => navigation.goBack()}
    />
  );

  const renderBody = () => {
    if (romQuery.isPending) return <LoadingScreen message="Loading…" />;
    if (!rom) return <ErrorState error={romQuery.error} onRetry={() => romQuery.refetch()} />;

    if (!emulation.core) {
      return (
        <Message
          colors={colors}
          icon="gamepad-variant-outline"
          title="No emulator for this platform"
          text="EmulatorJS has no core for this system. You can download the ROM and play it in another app."
          action={{ label: 'Go back', onPress: () => navigation.goBack() }}
        />
      );
    }
    if (emulation.needsBrowser) {
      return (
        <Message
          colors={colors}
          icon="web"
          title="Play in your browser"
          text={`The ${emulation.core} core needs multi-threading that an in-app web view cannot offer. It runs in your browser instead.`}
          action={{
            label: 'Open in browser',
            onPress: () => WebBrowser.openBrowserAsync(`${serverUrl}/rom/${rom.id}/ejs`).catch(() => {}),
          }}
        />
      );
    }
    if (fatal) {
      return (
        <Message
          colors={colors}
          icon="alert-circle-outline"
          title="The game could not start"
          text={fatal}
          action={{ label: 'Try again', onPress: () => setAttempt((count) => count + 1) }}
        />
      );
    }
    if (!html) return <LoadingScreen message="Preparing emulator…" />;

    return (
      <WebView
        key={attempt}
        ref={webViewRef}
        source={{ html, baseUrl: `${serverUrl}/` }}
        style={styles.webview}
        originWhitelist={['*']}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback
        allowsFullscreenVideo
        mixedContentMode="compatibility"
        setSupportMultipleWindows={false}
        overScrollMode="never"
        bounces={false}
        webviewDebuggingEnabled={__DEV__}
        // The page must stay on the server's origin; links inside it go nowhere.
        onShouldStartLoadWithRequest={(request) =>
          request.url.startsWith(`${serverUrl}/`) || /^(about|blob|data):/.test(request.url)
        }
        onRenderProcessGone={() => setFatal('The emulator ran out of memory. Large games may not fit on this device.')}
        onContentProcessDidTerminate={() =>
          setFatal('The emulator ran out of memory. Large games may not fit on this device.')
        }
        onError={({ nativeEvent }) => setFatal(nativeEvent.description || 'The emulator page failed to load.')}
      />
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar hidden={landscape} style="light" />
      {header}
      {renderBody()}
      {landscape && !exiting && (
        // The header is hidden in landscape; keep a way out on devices without a back button.
        <TouchableOpacity
          style={[styles.floatingClose, { top: insets.top + 6, left: insets.left + 6 }]}
          onPress={() => navigation.goBack()}
          hitSlop={8}
          accessibilityLabel="Leave game"
        >
          <MaterialCommunityIcons name="close" size={20} color="#fff" />
        </TouchableOpacity>
      )}
      {exiting && (
        <View style={styles.exitOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.exitText}>Saving your progress…</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  webview: { flex: 1, backgroundColor: '#000' },
  message: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  messageTitle: { fontSize: 22, fontWeight: '700', marginTop: 16, textAlign: 'center' },
  messageText: { fontSize: fontSize.lg, textAlign: 'center', lineHeight: 22, marginTop: 10 },
  messageButton: { marginTop: 28, paddingHorizontal: 28, paddingVertical: 14, borderRadius: borderRadius.lg },
  messageButtonText: { color: '#fff', fontSize: fontSize.lg, fontWeight: '700' },
  floatingClose: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  exitOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
  },
  exitText: { color: '#fff', fontSize: fontSize.lg, fontWeight: '600' },
});

export default PlayScreen;

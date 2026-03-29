// by Cleyvin

import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from '../../store/AppContext';
import { getBaseUrl, getApiClient } from '../../api';
import { STORAGE_KEYS } from '../../constants';
import { RootStackParamList } from '../../types';
import ScreenHeader from '../../components/common/ScreenHeader';

const CORE_MAP: Record<string, string> = {
  nes: 'nes', snes: 'snes', n64: 'n64', gb: 'gb', gba: 'gba', gbc: 'gb',
  nds: 'nds', psx: 'psx', psp: 'psp', genesis: 'segaMD', sega_genesis: 'segaMD',
  megadrive: 'segaMD', sms: 'segaMS', sega_master_system: 'segaMS',
  arcade: 'mame2003', mame: 'mame2003', atari2600: 'atari2600', atari7800: 'atari7800',
};

const PlayScreen = () => {
  const { colors, serverConfig } = useApp();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Play'>>();
  const { romId, romName, romFsName, platformSlug } = route.params;
  const [loading, setLoading] = useState(true);
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const webViewRef = useRef<WebView>(null);

  const baseUrl = serverConfig ? getBaseUrl(serverConfig) : '';
  const core = CORE_MAP[platformSlug] || 'nes';

  useEffect(() => {
    const markPlaying = async () => {
      try {
        const client = getApiClient();
        await client.put(`/api/roms/${romId}/props`, {
          now_playing: true,
          last_played: new Date().toISOString(),
        });
      } catch {}
    };
    markPlaying();
    return () => {
      (async () => {
        try {
          const client = getApiClient();
          await client.put(`/api/roms/${romId}/props`, {
            now_playing: false,
            last_played: new Date().toISOString(),
          });
        } catch {}
      })();
    };
  }, [romId]);

  useEffect(() => {
    const buildHtml = async () => {
      const storedTokens = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKENS);
      const tokens = storedTokens ? JSON.parse(storedTokens) : null;
      const authHeader = tokens ? `Bearer ${tokens.access_token}` : '';
      const romUrl = `${baseUrl}/api/roms/${romId}/content/${encodeURIComponent(romFsName)}`;

      const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>${romName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #0D1117; width: 100vw; height: 100vh; overflow: hidden; display: flex; align-items: center; justify-content: center; }
    #game { width: 100%; height: 100%; }
    .loader {
      position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
      text-align: center; font-family: sans-serif; width: 80%;
    }
    .loader-title { color: #FEFDFE; font-size: 18px; font-weight: 700; margin-bottom: 8px; }
    .loader-subtitle { color: #8B949E; font-size: 13px; margin-bottom: 20px; }
    .progress-bar { width: 100%; height: 8px; background: #30363D; border-radius: 4px; overflow: hidden; }
    .progress-fill { height: 100%; background: linear-gradient(90deg, #6043C8, #8B74E8, #A18FFF); border-radius: 4px; transition: width 0.3s ease; width: 0%; }
    .progress-text { color: #8B74E8; font-size: 14px; font-weight: 600; margin-top: 10px; }
    .progress-size { color: #5D5D5D; font-size: 11px; margin-top: 4px; }
  </style>
</head>
<body>
  <div id="game"></div>
  <div class="loader" id="loader">
    <div class="loader-title">${romName.replace(/</g, '&lt;').replace(/'/g, '&#39;')}</div>
    <div class="loader-subtitle" id="stage">Downloading ROM...</div>
    <div class="progress-bar"><div class="progress-fill" id="progressFill"></div></div>
    <div class="progress-text" id="progressText">0%</div>
    <div class="progress-size" id="progressSize"></div>
  </div>

  <script>
    const AUTH = '${authHeader}';
    const BASE_URL = '${baseUrl}';
    const ROM_ID = ${romId};

    function formatBytes(bytes) {
      if (bytes === 0) return '0 B';
      const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    function updateProgress(pct, loaded, total) {
      document.getElementById('progressFill').style.width = pct + '%';
      document.getElementById('progressText').textContent = Math.round(pct) + '%';
      if (total > 0) {
        document.getElementById('progressSize').textContent = formatBytes(loaded) + ' / ' + formatBytes(total);
      }
    }

    (async () => {
      try {
        // Download ROM with progress
        const res = await fetch('${romUrl}', { headers: { 'Authorization': AUTH } });
        if (!res.ok) throw new Error('Failed to fetch ROM: ' + res.status);

        const contentLength = parseInt(res.headers.get('content-length') || '0');
        const reader = res.body.getReader();
        const chunks = [];
        let received = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          received += value.length;
          if (contentLength > 0) {
            updateProgress((received / contentLength) * 80, received, contentLength);
          } else {
            document.getElementById('progressSize').textContent = formatBytes(received);
          }
        }

        const blob = new Blob(chunks);
        const romBlobUrl = URL.createObjectURL(blob);
        updateProgress(80, received, contentLength);

        document.getElementById('stage').textContent = 'Loading emulator...';

        // Configure EmulatorJS
        window.EJS_player = '#game';
        window.EJS_core = '${core}';
        window.EJS_gameUrl = romBlobUrl;
        window.EJS_gameName = '${romName.replace(/'/g, "\\'")}';
        window.EJS_color = '#8B74E8';
        window.EJS_startOnLoaded = true;
        window.EJS_pathtodata = 'https://cdn.emulatorjs.org/stable/data/';

        updateProgress(90, 0, 0);
        document.getElementById('stage').textContent = 'Starting emulator...';

        // Hide Load State file import button and Save State download button
        // Keep only slot-based save/load which works without file system
        const hideStyle = document.createElement('style');
        hideStyle.textContent = \`
          /* Hide the file-based load/save buttons in EmulatorJS menu */
          [data-btn="loadState"], [data-btn="saveState"],
          a[download], input[type="file"],
          [title="Load State"], [title="Save State"] {
            display: none !important;
          }
        \`;
        document.head.appendChild(hideStyle);

        // Intercept any file input click
        document.addEventListener('click', function(e) {
          const target = e.target;
          if (target && target.tagName === 'INPUT' && target.type === 'file') {
            e.preventDefault();
            e.stopPropagation();
            return false;
          }
        }, true);

        window.EJS_defaultOptions = { 'save-state-slot': 1 };


        const script = document.createElement('script');
        script.src = 'https://cdn.emulatorjs.org/stable/data/loader.js';
        script.onload = () => {
          updateProgress(100, 0, 0);
          setTimeout(() => {
            document.getElementById('loader').style.display = 'none';
          }, 1000);
        };
        document.body.appendChild(script);
      } catch (e) {
        document.getElementById('stage').textContent = 'Error: ' + e.message;
        document.getElementById('stage').style.color = '#DA3633';
        document.getElementById('progressFill').style.background = '#DA3633';
      }
    })();
  </script>
</body>
</html>`;

      setHtmlContent(html);
    };
    buildHtml();
  }, [romId]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title={romName}
        subtitle={`${core.toUpperCase()} emulator`}
        onBack={() => navigation.goBack()}
      />
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
      {htmlContent && (
        <WebView
          ref={webViewRef}
          source={{ html: htmlContent, baseUrl }}
          style={styles.webview}
          onLoadEnd={() => setLoading(false)}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          allowsFullscreenVideo={true}
          mediaPlaybackRequiresUserAction={false}
          allowsInlineMediaPlayback={true}
          mixedContentMode="always"
          originWhitelist={['*']}
          allowFileAccess={false}
          allowUniversalAccessFromFileURLs={true}
          setSupportMultipleWindows={false}
          onFileDownload={() => {}}
          allowsBackForwardNavigationGestures={false}
          onShouldStartLoadWithRequest={(request) => {
            // Block blob downloads and file picker triggers
            if (request.url.startsWith('blob:')) return false;
            return true;
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  webview: { flex: 1 },
  loadingOverlay: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    zIndex: 10,
    alignItems: 'center',
  },
});

export default PlayScreen;

// by Cleyvin

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, AppState, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from '../../store/AppContext';
import { getBaseUrl, getApiClient } from '../../api';
import { getCurrentAuthToken } from '../../hooks/useAuthHeaders';
import { STORAGE_KEYS } from '../../constants';
import { RootStackParamList } from '../../types';
import ScreenHeader from '../../components/common/ScreenHeader';
import * as WebBrowser from 'expo-web-browser';

const CORE_MAP: Record<string, string> = {
  nes: 'nes', snes: 'snes', n64: 'n64', gb: 'gb', gba: 'gba', gbc: 'gb',
  nds: 'nds', psx: 'psx', psp: 'psp', genesis: 'segaMD', sega_genesis: 'segaMD',
  megadrive: 'segaMD', sms: 'segaMS', sega_master_system: 'segaMS',
  arcade: 'mame2003', mame: 'mame2003',
};

const PlayScreen = () => {
  const { colors, serverConfig } = useApp();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Play'>>();
  const { romId, romName, romFsName, platformSlug, fileIds } = route.params;
  const [loading, setLoading] = useState(true);
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const webViewRef = useRef<WebView>(null);

  const baseUrl = serverConfig ? getBaseUrl(serverConfig) : '';
  const core = CORE_MAP[platformSlug] || 'nes';
  const UNSUPPORTED_MOBILE_CORES = ['psp', 'ppsspp', 'dos', 'dosbox_pure'];
  const isUnsupported = UNSUPPORTED_MOBILE_CORES.includes(core);

  // Mark as playing
  useEffect(() => {
    try {
      const client = getApiClient();
      client.put(`/api/roms/${romId}/props`, {
        now_playing: true, last_played: new Date().toISOString(),
      }).catch(() => {});
    } catch {}
    return () => {
      try {
        const client = getApiClient();
        client.put(`/api/roms/${romId}/props`, {
          now_playing: false, last_played: new Date().toISOString(),
        }).catch(() => {});
      } catch {}
    };
  }, [romId]);

  // Handle messages from WebView (save/load operations)
  const handleMessage = useCallback(async (event: WebViewMessageEvent) => {
    let msg: any;
    try { msg = JSON.parse(event.nativeEvent.data); } catch { return; }

    const client = getApiClient();

    switch (msg.type) {
      case 'SAVE_STATE': {
        // Upload state to RoMM server
        try {
          const formData = new FormData();
          formData.append('stateFile', {
            uri: `data:application/octet-stream;base64,${msg.state}`,
            type: 'application/octet-stream',
            name: `${romName}.state`,
          } as any);
          if (msg.screenshot) {
            formData.append('screenshotFile', {
              uri: `data:image/png;base64,${msg.screenshot}`,
              type: 'image/png',
              name: `${romName}.png`,
            } as any);
          }
          await client.post(`/api/states?rom_id=${romId}&emulator=${core}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 30000,
          });
          // Notify WebView save succeeded
          webViewRef.current?.injectJavaScript(`
            if (document.getElementById('saveNotif')) document.getElementById('saveNotif').remove();
            var n = document.createElement('div');
            n.id = 'saveNotif';
            n.style.cssText = 'position:fixed;top:10px;right:10px;background:#3FB950;color:#fff;padding:8px 16px;border-radius:8px;font:bold 13px sans-serif;z-index:99999;opacity:0.95;';
            n.textContent = 'State saved to server';
            document.body.appendChild(n);
            setTimeout(function(){n.remove()},2000);
            true;
          `);
        } catch (err) {
          console.error('Failed to upload state:', err);
        }
        break;
      }

      case 'SAVE_FILE': {
        // Upload SRAM save to RoMM server
        try {
          const formData = new FormData();
          formData.append('saveFile', {
            uri: `data:application/octet-stream;base64,${msg.save}`,
            type: 'application/octet-stream',
            name: `${romName}.srm`,
          } as any);
          await client.post(`/api/saves?rom_id=${romId}&emulator=${core}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 30000,
          });
        } catch (err) {
          console.error('Failed to upload save:', err);
        }
        break;
      }

      case 'LOAD_STATE_REQUEST': {
        // Fetch latest state from server and send to WebView
        try {
          const statesRes = await client.get(`/api/states?rom_id=${romId}`);
          const states = statesRes.data || [];
          if (states.length === 0) {
            webViewRef.current?.injectJavaScript(`
              window.EJS_emulator.play();
              var n = document.createElement('div');
              n.style.cssText = 'position:fixed;top:10px;right:10px;background:#DA3633;color:#fff;padding:8px 16px;border-radius:8px;font:bold 13px sans-serif;z-index:99999;';
              n.textContent = 'No saved states found';
              document.body.appendChild(n);
              setTimeout(function(){n.remove()},2000);
              true;
            `);
            return;
          }
          // Get most recent state
          const latest = states.sort((a: any, b: any) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
          )[0];
          // Download state binary via download_path
          // The download_path has single-encoded chars (%3A, %20) but the server
          // expects double-encoded (%253A, %2520) so we re-encode the percent signs
          let downloadPath = latest.download_path || `/api/raw/assets/${latest.full_path}`;
          // Remove query string (timestamp) and re-encode the path
          const qsIdx = downloadPath.indexOf('?');
          if (qsIdx > 0) downloadPath = downloadPath.substring(0, qsIdx);
          // Re-encode: %XX -> %25XX (double encode special chars in filename)
          downloadPath = downloadPath.replace(/%([0-9A-Fa-f]{2})/g, '%25$1');
          const tokStr = await getCurrentAuthToken();
          const authH = tokStr ? `Bearer ${tokStr}` : '';
          const downloadUrl = `${baseUrl}${downloadPath}`;

          // Use fetch inside WebView for binary download
          webViewRef.current?.injectJavaScript(`
            (function(){
              var stage = document.createElement('div');
              stage.style.cssText = 'position:fixed;top:10px;right:10px;background:#8B74E8;color:#fff;padding:8px 16px;border-radius:8px;font:bold 13px sans-serif;z-index:99999;';
              stage.textContent = 'Loading state...';
              document.body.appendChild(stage);

              fetch('${downloadUrl}', {
                headers: { 'Authorization': '${authH}' }
              })
              .then(function(r) {
                if (!r.ok) throw new Error('HTTP ' + r.status);
                return r.arrayBuffer();
              })
              .then(function(buf) {
                var arr = new Uint8Array(buf);
                window.EJS_emulator.gameManager.loadState(arr);
                window.EJS_emulator.play();
                stage.textContent = 'State loaded from server';
                stage.style.background = '#3FB950';
                setTimeout(function(){stage.remove()},2000);
              })
              .catch(function(e) {
                stage.textContent = 'Load failed: ' + e.message;
                stage.style.background = '#DA3633';
                setTimeout(function(){stage.remove()},3000);
                window.EJS_emulator.play();
              });
            })();
            true;
          `);
        } catch (err) {
          console.error('Failed to load state:', err);
          webViewRef.current?.injectJavaScript(`
            window.EJS_emulator.play();
            true;
          `);
        }
        break;
      }

      case 'AUTO_SAVE': {
        // Background auto-save (state + sram)
        try {
          if (msg.state) {
            const formData = new FormData();
            formData.append('stateFile', {
              uri: `data:application/octet-stream;base64,${msg.state}`,
              type: 'application/octet-stream',
              name: `${romName}.state`,
            } as any);
            await client.post(`/api/states?rom_id=${romId}&emulator=${core}`, formData, {
              headers: { 'Content-Type': 'multipart/form-data' },
            });
          }
        } catch {}
        break;
      }
    }
  }, [romId, romName, core]);

  // Auto-save when app goes to background
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background' && webViewRef.current) {
        webViewRef.current.injectJavaScript(`
          (function(){
            try {
              var stateData = window.EJS_emulator.gameManager.getState();
              var b64 = uint8ToBase64(stateData);
              sendToRN('AUTO_SAVE', { state: b64 });
            } catch(e) {}
          })();
          true;
        `);
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const buildHtml = async () => {
      const tokenStr = await getCurrentAuthToken();
      const authHeader = tokenStr ? `Bearer ${tokenStr}` : '';
      const fileIdsParam = fileIds && fileIds.length > 0 ? `?file_ids=${fileIds.join(',')}` : '';
      const romUrl = `${baseUrl}/api/roms/${romId}/content/${encodeURIComponent(romFsName)}${fileIdsParam}`;

      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #0D1117; width: 100vw; height: 100vh; overflow: hidden; }
    #game { width: 100%; height: 100%; }
    .loader {
      position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
      text-align: center; font-family: sans-serif; width: 80%;
    }
    .loader-title { color: #FEFDFE; font-size: 18px; font-weight: 700; margin-bottom: 8px; }
    .loader-subtitle { color: #8B949E; font-size: 13px; margin-bottom: 20px; }
    .progress-bar { width: 100%; height: 8px; background: #30363D; border-radius: 4px; overflow: hidden; }
    .progress-fill { height: 100%; background: linear-gradient(90deg, #6043C8, #8B74E8, #A18FFF); border-radius: 4px; transition: width 0.3s; width: 0%; }
    .progress-text { color: #8B74E8; font-size: 14px; font-weight: 600; margin-top: 10px; }
    .progress-size { color: #5D5D5D; font-size: 11px; margin-top: 4px; }
  </style>
</head>
<body>
  <div id="game"></div>
  <div class="loader" id="loader">
    <div class="loader-title">${romName.replace(/</g, '&lt;')}</div>
    <div class="loader-subtitle" id="stage">Downloading ROM...</div>
    <div class="progress-bar"><div class="progress-fill" id="progressFill"></div></div>
    <div class="progress-text" id="progressText">0%</div>
    <div class="progress-size" id="progressSize"></div>
  </div>

  <script>
    // === Base64 helpers ===
    function uint8ToBase64(u8) {
      var bin = '';
      for (var i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]);
      return btoa(bin);
    }
    function base64ToUint8(b64) {
      var bin = atob(b64);
      var arr = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      return arr;
    }

    // === Bridge: WebView -> React Native ===
    function sendToRN(type, payload) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify(Object.assign({ type: type }, payload)));
      }
    }


    // === Capture errors for debugging ===
    (function() {
      var origErr = console.error;
      console.error = function() {
        try {
          var msg = Array.prototype.slice.call(arguments).map(function(a){
            try { return typeof a === 'object' ? JSON.stringify(a) : String(a); } catch(e){ return String(a); }
          }).join(' ');
          sendToRN('WV_ERROR', { msg: msg });
        } catch(e) {}
        origErr.apply(console, arguments);
      };
      window.addEventListener('error', function(e) {
        sendToRN('WV_ERROR', { msg: 'UNCAUGHT: ' + e.message + ' at ' + e.filename + ':' + e.lineno });
      });
      window.addEventListener('unhandledrejection', function(e) {
        sendToRN('WV_ERROR', { msg: 'UNHANDLED_REJECT: ' + (e.reason && e.reason.message || e.reason) });
      });
    })();

    // === Progress ===
    function formatBytes(b) {
      if (b===0) return '0 B';
      var k=1024, s=['B','KB','MB','GB'], i=Math.floor(Math.log(b)/Math.log(k));
      return parseFloat((b/Math.pow(k,i)).toFixed(1))+' '+s[i];
    }
    function updateProgress(pct, loaded, total) {
      document.getElementById('progressFill').style.width = pct+'%';
      document.getElementById('progressText').textContent = Math.round(pct)+'%';
      if (total>0) document.getElementById('progressSize').textContent = formatBytes(loaded)+' / '+formatBytes(total);
    }

    // === EmulatorJS Config ===
    window.EJS_player = '#game';
    window.EJS_core = '${core}';
    window.EJS_color = '#8B74E8';
    window.EJS_startOnLoaded = true;
    window.EJS_pathtodata = 'https://cdn.emulatorjs.org/stable/data/';
    window.EJS_fixedSaveInterval = 10000; // Flush SRAM every 10s

    // === Save State -> Upload to server ===
    window.EJS_onSaveState = function(data) {
      try {
        var stateB64 = uint8ToBase64(new Uint8Array(data.state));
        var ssB64 = null;
        if (data.screenshot) {
          ssB64 = (typeof data.screenshot === 'string') ? data.screenshot : uint8ToBase64(new Uint8Array(data.screenshot));
        }
        sendToRN('SAVE_STATE', { state: stateB64, screenshot: ssB64 });
      } catch(e) { console.error('Save state error:', e); }
    };

    // === Load State -> Request from server ===
    window.EJS_onLoadState = function() {
      window.EJS_emulator.pause();
      sendToRN('LOAD_STATE_REQUEST', {});
    };

    // === SRAM auto-sync ===
    window.EJS_onSaveSave = function(data) {
      try {
        var saveB64 = uint8ToBase64(new Uint8Array(data.save));
        sendToRN('SAVE_FILE', { save: saveB64 });
      } catch(e) {}
    };

    // === Game start -> load latest save from server ===
    window.EJS_onGameStart = function() {
      document.getElementById('loader').style.display = 'none';
      // Auto-load latest state will be handled by initial fetch in RN
    };

    // Listen for messages from React Native
    document.addEventListener('message', function(e) {
      try { var msg = JSON.parse(e.data); handleRNMsg(msg); } catch(ex) {}
    });
    window.addEventListener('message', function(e) {
      try { var msg = JSON.parse(e.data); handleRNMsg(msg); } catch(ex) {}
    });
    function handleRNMsg(msg) {
      // handled by injectedJavaScript from RN side
    }

    // === Download ROM and start ===
    // Override XMLHttpRequest to inject auth header for EmulatorJS ROM fetch
    var origXHROpen = XMLHttpRequest.prototype.open;
    var origXHRSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function(method, url) {
      this._romUrl = (typeof url === 'string' && url.indexOf('/api/roms/') >= 0);
      return origXHROpen.apply(this, arguments);
    };
    XMLHttpRequest.prototype.send = function() {
      if (this._romUrl) {
        this.setRequestHeader('Authorization', '${authHeader}');
      }
      return origXHRSend.apply(this, arguments);
    };

    // Also override fetch for auth
    var origFetch = window.fetch;
    window.fetch = function(url, opts) {
      opts = opts || {};
      if (typeof url === 'string' && url.indexOf('/api/') >= 0 && !opts.headers) {
        opts.headers = { 'Authorization': '${authHeader}' };
      } else if (typeof url === 'string' && url.indexOf('/api/') >= 0 && opts.headers && !opts.headers['Authorization']) {
        opts.headers['Authorization'] = '${authHeader}';
      }
      return origFetch.call(this, url, opts);
    };

    (async function() {
      try {
        // First check ROM size to decide strategy
        document.getElementById('stage').textContent = 'Checking ROM...';
        var headRes = await origFetch('${romUrl}', { method: 'HEAD', headers: { 'Authorization': '${authHeader}' } });
        var romSize = parseInt(headRes.headers.get('content-length') || '0');

        // Always download with progress, but use ArrayBuffer for efficiency
        document.getElementById('stage').textContent = 'Downloading ROM...';
        var res = await origFetch('${romUrl}', { headers: { 'Authorization': '${authHeader}' } });
        if (!res.ok) throw new Error('ROM download failed: ' + res.status);
        var reader = res.body.getReader();
        var chunks = [], received = 0;
        while (true) {
          var result = await reader.read();
          if (result.done) break;
          chunks.push(result.value);
          received += result.value.length;
          if (romSize > 0) updateProgress((received/romSize)*85, received, romSize);
          else document.getElementById('progressSize').textContent = formatBytes(received);
        }
        // Merge chunks into single ArrayBuffer (more memory efficient than Blob)
        var totalLen = chunks.reduce(function(s,c){return s+c.length;}, 0);
        var merged = new Uint8Array(totalLen);
        var offset = 0;
        for (var i=0; i<chunks.length; i++) {
          merged.set(chunks[i], offset);
          offset += chunks[i].length;
        }
        chunks = null; // Free chunk references
        var blob = new Blob([merged]);
        merged = null; // Free merged array
        window.EJS_gameUrl = URL.createObjectURL(blob);

        updateProgress(90, 0, 0);
        document.getElementById('stage').textContent = 'Starting emulator...';

        var script = document.createElement('script');
        script.src = 'https://cdn.emulatorjs.org/stable/data/loader.js';
        script.onload = function() { updateProgress(100, 0, 0); };
        document.body.appendChild(script);
      } catch(e) {
        document.getElementById('stage').textContent = 'Error: ' + e.message;
        document.getElementById('stage').style.color = '#DA3633';
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
      {isUnsupported ? (
        <View style={styles.unsupportedContainer}>
          <MaterialCommunityIcons name="web" size={64} color={colors.primary} />
          <Text style={[styles.unsupportedTitle, { color: colors.text }]}>Play in browser</Text>
          <Text style={[styles.unsupportedText, { color: colors.textSecondary }]}>
            {core.toUpperCase()} games cannot run inside the app because Android WebView does not support SharedArrayBuffer. Open this game in your browser to play it.
          </Text>
          <TouchableOpacity
            style={[styles.unsupportedButton, { backgroundColor: colors.primary }]}
            onPress={async () => {
              const url = `${baseUrl}/play/${platformSlug}/${romId}`;
              try {
                await WebBrowser.openBrowserAsync(url);
              } catch (e) {
                Alert.alert('Error', 'Could not open browser');
              }
            }}
          >
            <MaterialCommunityIcons name="open-in-new" size={18} color="#fff" />
            <Text style={styles.unsupportedButtonText}>Open in browser</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.unsupportedSecondary]}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.unsupportedSecondaryText, { color: colors.textSecondary }]}>Go back</Text>
          </TouchableOpacity>
        </View>
      ) : htmlContent && (
        <WebView
          ref={webViewRef}
          source={{ html: htmlContent, baseUrl }}
          style={styles.webview}
          onLoadEnd={() => setLoading(false)}
          onMessage={handleMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          allowsFullscreenVideo={true}
          mediaPlaybackRequiresUserAction={false}
          allowsInlineMediaPlayback={true}
          mixedContentMode="always"
          originWhitelist={['*']}
          allowFileAccess={false}
          allowUniversalAccessFromFileURLs={false}
          setSupportMultipleWindows={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  webview: { flex: 1 },
  unsupportedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  unsupportedTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 8,
  },
  unsupportedText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  unsupportedButton: {
    marginTop: 24,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  unsupportedButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  unsupportedSecondary: {
    marginTop: 12,
    padding: 12,
  },
  unsupportedSecondaryText: {
    fontSize: 14,
  },
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

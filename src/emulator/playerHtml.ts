// by Cleyvin
//
// The page the Play screen loads into its WebView. It is served with the RoMM
// server as its base URL, so every `/api` and `/assets` request is same-origin.
//
// The page talks to the server directly (ROM, BIOS, saves, states) instead of
// relaying binary data through the React Native bridge, which would mean
// base64-encoding multi-megabyte buffers on the JS thread.

export interface PlayerConfig {
  romId: number;
  title: string;
  /** File-system safe name EmulatorJS uses for its own storage keys. */
  gameName: string;
  core: string;
  controlScheme: string | null;
  /** Server-relative URL of the ROM content. */
  romUrl: string;
  /** Server-relative URL of the BIOS file, or '' when the platform has none. */
  biosUrl: string;
  saveFileName: string;
  stateFileName: string;
  /** EmulatorJS `data/` locations, tried in order. */
  dataPaths: string[];
  token: string;
  canReadAssets: boolean;
  canWriteAssets: boolean;
  accent: string;
}

/** Messages the page posts to React Native. */
export type PlayerMessage =
  | { type: 'TOKEN_REQUEST' }
  | { type: 'STARTED' }
  | { type: 'FLUSHED' }
  | { type: 'FATAL'; message: string };

// The config travels as inert JSON rather than being spliced into script
// source, so a title or file name can never break out into code.
const serializeConfig = (config: PlayerConfig): string =>
  JSON.stringify(config).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');

// Plain ES5-style script: it runs in whatever WebView the device ships.
const PAGE = String.raw`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  html, body { width: 100%; height: 100%; overflow: hidden; background: #000; }
  #game { width: 100%; height: 100%; }
  #boot {
    position: fixed; top: 0; right: 0; bottom: 0; left: 0; display: flex; flex-direction: column; align-items: center;
    justify-content: center; gap: 14px; padding: 24px; background: #0D1117;
    font-family: -apple-system, Roboto, sans-serif; text-align: center; z-index: 10;
  }
  #boot-title { color: #FEFDFE; font-size: 18px; font-weight: 700; }
  #boot-stage { color: #8B949E; font-size: 13px; }
  .spinner {
    width: 34px; height: 34px; border-radius: 50%; border: 3px solid #30363D;
    border-top-color: var(--accent); animation: spin 0.9s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  #toasts {
    position: fixed; top: 10px; left: 0; right: 0; display: flex; flex-direction: column;
    align-items: center; gap: 6px; pointer-events: none; z-index: 99999;
  }
  .toast {
    max-width: 86%; padding: 8px 14px; border-radius: 10px; color: #fff;
    font: 600 13px -apple-system, Roboto, sans-serif; background: rgba(28, 35, 48, 0.95);
    border-left: 4px solid var(--accent);
  }
  .toast.ok { border-left-color: #3FB950; }
  .toast.bad { border-left-color: #DA3633; }
</style>
</head>
<body>
<div id="game"></div>
<div id="boot">
  <div class="spinner"></div>
  <div id="boot-title"></div>
  <div id="boot-stage">Loading emulator…</div>
</div>
<div id="toasts"></div>
<script id="romm-config" type="application/json">__ROMM_CONFIG__</script>
<script>
(function () {
  'use strict';

  var cfg = JSON.parse(document.getElementById('romm-config').textContent);
  var token = cfg.token;
  var started = false;

  document.documentElement.style.setProperty('--accent', cfg.accent);
  document.getElementById('boot-title').textContent = cfg.title;

  // ---- Bridge to React Native -------------------------------------------
  function post(type, payload) {
    if (!window.ReactNativeWebView) return;
    var message = { type: type };
    if (payload) for (var key in payload) message[key] = payload[key];
    window.ReactNativeWebView.postMessage(JSON.stringify(message));
  }

  function toast(text, kind, ms) {
    var el = document.createElement('div');
    el.className = 'toast' + (kind ? ' ' + kind : '');
    el.textContent = text;
    document.getElementById('toasts').appendChild(el);
    setTimeout(function () { el.remove(); }, ms || 2500);
  }

  // ---- Authenticated requests -------------------------------------------
  function isApi(url) {
    try {
      var parsed = new URL(url, location.href);
      return parsed.origin === location.origin && parsed.pathname.indexOf('/api/') === 0;
    } catch (e) {
      return false;
    }
  }

  // EmulatorJS fetches the ROM and BIOS itself, so the bearer token is added
  // underneath it, for same-origin API calls only (never to the CDN).
  var nativeFetch = window.fetch.bind(window);
  function authFetch(input, init) {
    var url = typeof input === 'string' ? input : (input && input.url) || String(input);
    if (!isApi(url)) return nativeFetch(input, init);
    var options = {};
    if (init) for (var key in init) options[key] = init[key];
    var headers = new Headers(options.headers || (typeof input !== 'string' && input && input.headers) || undefined);
    headers.set('Authorization', 'Bearer ' + token);
    options.headers = headers;
    return nativeFetch(input, options);
  }
  window.fetch = authFetch;

  var xhrOpen = XMLHttpRequest.prototype.open;
  var xhrSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url) {
    this.__rommApi = isApi(String(url));
    return xhrOpen.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function () {
    if (this.__rommApi) this.setRequestHeader('Authorization', 'Bearer ' + token);
    return xhrSend.apply(this, arguments);
  };

  // An access token can expire during a long session; ask the app for a new one.
  var tokenWaiters = [];
  window.__rommSetToken = function (next) {
    if (next) token = next;
    var waiters = tokenWaiters;
    tokenWaiters = [];
    waiters.forEach(function (resolve) { resolve(!!next); });
  };
  function renewToken() {
    return new Promise(function (resolve) {
      tokenWaiters.push(resolve);
      if (tokenWaiters.length === 1) post('TOKEN_REQUEST');
      setTimeout(function () { resolve(false); }, 15000);
    });
  }
  function api(path, init) {
    return authFetch(path, init).then(function (response) {
      if (response.status !== 401) return response;
      return renewToken().then(function (renewed) {
        return renewed ? authFetch(path, init) : response;
      });
    });
  }

  // ---- Helpers ------------------------------------------------------------
  function manager() {
    return window.EJS_emulator && window.EJS_emulator.gameManager;
  }

  function sameBytes(a, b) {
    if (!a || !b || a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }

  function newestFirst(list) {
    return list.slice().sort(function (a, b) {
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
  }

  function listAssets(kind) {
    return api('/api/' + kind + '?rom_id=' + cfg.romId).then(function (response) {
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response.json();
    }).then(function (list) {
      return Array.isArray(list) ? newestFirst(list) : [];
    });
  }

  function downloadAsset(kind, asset) {
    return api('/api/' + kind + '/' + asset.id + '/content').then(function (response) {
      // Servers without the content route expose the file through download_path.
      if (!response.ok && asset.download_path) return api(asset.download_path);
      return response;
    }).then(function (response) {
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response.arrayBuffer();
    }).then(function (buffer) {
      return new Uint8Array(buffer);
    });
  }

  function uploadAsset(kind, field, fileName, bytes, screenshot) {
    var form = new FormData();
    form.append(field, new Blob([bytes], { type: 'application/octet-stream' }), fileName);
    if (screenshot && screenshot.byteLength) {
      form.append('screenshotFile', new Blob([screenshot], { type: 'image/png' }), fileName.replace(/\.[^.]+$/, '') + '.png');
    }
    var query = '?rom_id=' + cfg.romId + '&emulator=' + encodeURIComponent(cfg.core);
    return api('/api/' + kind + query, { method: 'POST', body: form }).then(function (response) {
      if (!response.ok) throw new Error('HTTP ' + response.status);
    });
  }

  // ---- Battery saves (SRAM) -----------------------------------------------
  var syncedSave = null;       // bytes the server is known to hold
  var saveQueue = Promise.resolve();

  function readSave() {
    try {
      var gm = manager();
      // Passing true flushes the core's memory into the file before reading.
      var data = gm && gm.getSaveFile(true);
      return data && data.length ? new Uint8Array(data) : null;
    } catch (e) {
      return null;
    }
  }

  // Resolves to 'saved', 'unchanged', 'none' or 'failed'. Uploads run one at
  // a time so a slow request can never overwrite a newer one.
  function syncSave() {
    if (!cfg.canWriteAssets || !started) return Promise.resolve('none');
    var run = saveQueue.then(function () {
      var bytes = readSave();
      if (!bytes) return 'none';
      if (sameBytes(bytes, syncedSave)) return 'unchanged';
      return uploadAsset('saves', 'saveFile', cfg.saveFileName, bytes).then(function () {
        syncedSave = bytes;
        return 'saved';
      });
    }).catch(function () { return 'failed'; });
    saveQueue = run;
    return run;
  }

  function restoreSave() {
    if (!cfg.canReadAssets) return Promise.resolve();
    return listAssets('saves').then(function (saves) {
      var pick = null;
      for (var i = 0; i < saves.length && !pick; i++) if (saves[i].emulator === cfg.core) pick = saves[i];
      pick = pick || saves[0];
      if (!pick) return;
      return downloadAsset('saves', pick).then(function (bytes) {
        if (!bytes.length) return;
        var gm = manager();
        var FS = gm.FS;
        var path = gm.getSaveFilePath();
        var parts = path.split('/');
        var dir = '';
        for (var i = 0; i < parts.length - 1; i++) {
          if (!parts[i]) continue;
          dir += '/' + parts[i];
          if (!FS.analyzePath(dir).exists) FS.mkdir(dir);
        }
        var previous = FS.analyzePath(path).exists ? FS.readFile(path) : null;
        if (previous) FS.unlink(path);
        FS.writeFile(path, bytes);
        gm.loadSaveFiles();
        syncedSave = bytes;
        // The core read its save while booting; restart so it sees this one.
        if (!sameBytes(previous, bytes)) gm.restart();
        toast('Cloud save loaded', 'ok');
      });
    }).catch(function () {
      toast('Could not load your cloud save', 'bad', 4000);
    });
  }

  function whenManagerReady() {
    return new Promise(function (resolve) {
      var tries = 0;
      (function check() {
        var gm = manager();
        if (gm && gm.FS && typeof gm.getSaveFilePath === 'function') return resolve(true);
        if (++tries > 100) return resolve(false);
        setTimeout(check, 100);
      })();
    });
  }

  // ---- EmulatorJS hooks ---------------------------------------------------
  window.EJS_onGameStart = function () {
    started = true;
    document.getElementById('boot').style.display = 'none';
    post('STARTED');
    whenManagerReady().then(function (ready) {
      if (!ready) return;
      return restoreSave().then(function () {
        if (!syncedSave) syncedSave = readSave();
        setInterval(syncSave, 30000);
      });
    });
  };

  // "Save state" in the emulator menu keeps one quick-save per game on the server.
  window.EJS_onSaveState = function (data) {
    if (!cfg.canWriteAssets) return toast('Your account cannot store states', 'bad');
    if (!data || !data.state || !data.state.byteLength) return;
    uploadAsset('states', 'stateFile', cfg.stateFileName, data.state, data.screenshot).then(function () {
      toast('State saved to server', 'ok');
    }).catch(function () {
      toast('Could not save the state', 'bad', 4000);
    });
  };

  window.EJS_onLoadState = function () {
    if (!cfg.canReadAssets) return toast('Your account cannot read states', 'bad');
    listAssets('states').then(function (states) {
      // A state is a dump of one core's memory; another core cannot read it.
      var pick = null;
      for (var i = 0; i < states.length && !pick; i++) if (states[i].emulator === cfg.core) pick = states[i];
      if (!pick) return toast('No saved state for this game yet');
      return downloadAsset('states', pick).then(function (bytes) {
        manager().loadState(bytes);
        toast('State loaded', 'ok');
      });
    }).catch(function () {
      toast('Could not load the state', 'bad', 4000);
    });
  };

  // The menu's save-file button becomes "sync now".
  window.EJS_onSaveSave = function () {
    syncSave().then(function (result) {
      if (result === 'saved') toast('Save synced', 'ok');
      else if (result === 'unchanged') toast('Save already up to date', 'ok');
      else if (result === 'failed') toast('Could not sync the save', 'bad', 4000);
      else toast('This game has no save data yet');
    });
  };

  // Called by the app before leaving, and when it goes to the background.
  window.__rommFlush = function () {
    syncSave().then(function () { post('FLUSHED'); });
  };

  // ---- Boot ---------------------------------------------------------------
  window.EJS_player = '#game';
  window.EJS_core = cfg.core;
  window.EJS_gameUrl = cfg.romUrl;
  window.EJS_gameName = cfg.gameName;
  window.EJS_gameID = cfg.romId;
  if (cfg.biosUrl) window.EJS_biosUrl = cfg.biosUrl;
  if (cfg.controlScheme) window.EJS_controlScheme = cfg.controlScheme;
  window.EJS_color = cfg.accent;
  window.EJS_backgroundColor = '#0D1117';
  window.EJS_startOnLoaded = true;
  window.EJS_threads = false;
  window.EJS_defaultOptions = { 'save-state-location': 'browser' };
  // Leaving is the app's job (it flushes the save first); netplay and manual
  // save-file import make no sense on a phone.
  window.EJS_Buttons = { exitEmulation: false, loadSavFiles: false, netplay: false };

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = function () { script.remove(); reject(new Error('unreachable')); };
      document.body.appendChild(script);
    });
  }

  function isJavaScript(url) {
    // A reverse proxy may answer a missing file with an HTML page and a 200.
    if (new URL(url, location.href).origin !== location.origin) return Promise.resolve(true);
    return nativeFetch(url, { method: 'HEAD' }).then(function (response) {
      return response.ok && /javascript/i.test(response.headers.get('content-type') || '');
    }).catch(function () { return false; });
  }

  function boot(index) {
    if (index >= cfg.dataPaths.length) {
      return post('FATAL', { message: 'EmulatorJS could not be loaded from your server or the internet.' });
    }
    var path = cfg.dataPaths[index];
    isJavaScript(path + 'loader.js').then(function (ok) {
      if (!ok) throw new Error('not a script');
      window.EJS_pathtodata = path;
      return loadScript(path + 'loader.js');
    }).then(function () {
      // EmulatorJS draws its own download progress from here on.
      document.getElementById('boot').style.display = 'none';
    }).catch(function () {
      boot(index + 1);
    });
  }
  boot(0);
})();
</script>
</body>
</html>`;

export const buildPlayerHtml = (config: PlayerConfig): string =>
  // A function replacement keeps `$` sequences in the JSON from being read as patterns.
  PAGE.replace('__ROMM_CONFIG__', () => serializeConfig(config));

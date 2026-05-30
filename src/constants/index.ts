// by Cleyvin

import appJson from '../../app.json';

// Single source of truth for the visible app version (mirrors app.json.expo.version)
export const APP_VERSION = appJson.expo.version;

export const STORAGE_KEYS = {
  SERVER_CONFIG: '@romm_server_config',
  AUTH_TOKENS: '@romm_auth_tokens',
  USER: '@romm_user',
  THEME: '@romm_theme',
  AUTH_METHOD: '@romm_auth_method',
};

export const API_PATHS = {
  LOGIN: '/api/login',
  LOGOUT: '/api/logout',
  TOKEN: '/api/token',
  HEARTBEAT: '/api/heartbeat',
  STATS: '/api/stats',
  PLATFORMS: '/api/platforms',
  ROMS: '/api/roms',
  COLLECTIONS: '/api/collections',
  SAVES: '/api/saves',
  STATES: '/api/states',
  USERS_ME: '/api/users/me',
  SEARCH_ROMS: '/api/search/roms',
  RAW_ASSETS: '/api/raw/assets',
};

export const DEFAULT_PORT = '443';
export const DEFAULT_ASPECT_RATIO = '2/3';
export const ROM_PAGE_SIZE = 48;

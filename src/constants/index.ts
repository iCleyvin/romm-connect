// by Cleyvin

export const STORAGE_KEYS = {
  SERVER_URL: '@romm_server_url',
  USER: '@romm_user',
  THEME: '@romm_theme',
};

// SecureStore keys may only contain alphanumerics, ".", "-" and "_".
export const SECURE_KEYS = {
  SESSION: 'romm_session',
};

// Written by releases up to v0.5.0; read once to migrate, then removed.
export const LEGACY_KEYS = {
  SERVER_CONFIG: '@romm_server_config',
  AUTH_TOKENS: '@romm_auth_tokens',
  AUTH_METHOD: '@romm_auth_method',
  SECURE_CREDENTIALS: 'romm_credentials',
  SECURE_API_TOKEN: 'romm_api_token',
};

export const API_PATHS = {
  TOKEN: '/api/token',
  LOGOUT: '/api/logout',
  HEARTBEAT: '/api/heartbeat',
  STATS: '/api/stats',
  PLATFORMS: '/api/platforms',
  ROMS: '/api/roms',
  COLLECTIONS: '/api/collections',
  FIRMWARE: '/api/firmware',
  TASKS: '/api/tasks',
  USERS_ME: '/api/users/me',
  PAIR_EXCHANGE: '/api/client-tokens/exchange',
};

export const SCOPES = {
  ROMS_WRITE: 'roms.write',
  ROMS_USER_WRITE: 'roms.user.write',
  ASSETS_READ: 'assets.read',
  ASSETS_WRITE: 'assets.write',
  FIRMWARE_READ: 'firmware.read',
  TASKS_RUN: 'tasks.run',
} as const;

export const ROM_PAGE_SIZE = 48;
export const API_TOKEN_PREFIX = 'rmm_';

export const LINKS = {
  REPO: 'https://github.com/iCleyvin/romm-connect',
  PRIVACY: 'https://icleyvin.github.io/romm-connect/privacy-policy.html',
  TERMS: 'https://icleyvin.github.io/romm-connect/terms.html',
  DONATE: 'https://www.paypal.com/donate/?business=cleyvinos@gmail.com&currency_code=USD',
};

// by Cleyvin

export interface ServerConfig {
  host: string;
  port: string;
  useHttps: boolean;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires: number;
  refresh_expires: number;
}

export interface User {
  id: number;
  username: string;
  email?: string;
  role: 'viewer' | 'editor' | 'admin';
  enabled: boolean;
  avatar_path?: string;
}

export interface Platform {
  id: number;
  slug: string;
  fs_slug: string;
  name: string;
  custom_name?: string;
  category?: string;
  generation?: number;
  family_name?: string;
  family_slug?: string;
  url_logo?: string;
  aspect_ratio: string;
  rom_count: number;
  fs_size_bytes: number;
  igdb_id?: number;
  moby_id?: number;
}

export interface Rom {
  id: number;
  fs_name: string;
  name: string;
  slug: string;
  summary?: string;
  platform_id: number;
  platform_slug?: string;
  platform_name?: string;
  path_cover_s?: string;
  path_cover_l?: string;
  path_cover_small?: string;
  path_cover_large?: string;
  url_cover?: string;
  path_screenshots?: string[];
  has_manual: boolean;
  url_screenshots?: string[];
  regions?: string[];
  languages?: string[];
  tags?: string[];
  genres?: string[];
  franchises?: string[];
  revision?: string;
  fs_size_bytes: number;
  igdb_id?: number;
  moby_id?: number;
  rom_user?: RomUser;
}

export interface RomUser {
  rating?: number;
  completion?: number;
  difficulty?: number;
  status?: 'INCOMPLETE' | 'FINISHED' | 'COMPLETED_100' | 'RETIRED' | 'NEVER_PLAYING';
  last_played?: string;
  backlogged: boolean;
  now_playing: boolean;
  hidden: boolean;
  note_raw_markdown?: string;
}

export interface Collection {
  id: number;
  name: string;
  description?: string;
  is_public: boolean;
  is_favorite: boolean;
  url_cover?: string;
  rom_count?: number;
  roms?: number[];
}

export interface Save {
  id: number;
  rom_id: number;
  emulator?: string;
  slot?: number;
  device_id?: string;
  file_name: string;
  file_size_bytes: number;
  created_at: string;
  updated_at: string;
}

export interface HeartbeatResponse {
  SYSTEM: {
    VERSION: string;
    SHOW_SETUP_WIZARD: boolean;
  };
  METADATA_SOURCES: {
    ANY_SOURCE_ENABLED: boolean;
    IGDB_API_ENABLED: boolean;
    MOBY_API_ENABLED: boolean;
    STEAMGRIDDB_API_ENABLED: boolean;
    SS_API_ENABLED: boolean;
    RA_API_ENABLED: boolean;
  };
  FILESYSTEM: {
    FS_PLATFORMS: string[];
  };
}

export interface StatsResponse {
  PLATFORMS: number;
  ROMS: number;
  SAVES: number;
  STATES: number;
  SCREENSHOTS: number;
  TOTAL_FILESIZE_BYTES: number;
}

export type RootStackParamList = {
  ServerConfig: undefined;
  Login: undefined;
  Main: undefined;
  RomDetail: { romId: number; platformSlug?: string };
  RomGallery: { platformId: number; platformName: string; platformSlug: string };
  Play: { romId: number; romName: string; romFsName: string; platformSlug: string };
  Upload: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Platforms: undefined;
  Collections: undefined;
  Settings: undefined;
};

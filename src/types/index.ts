// by Cleyvin

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires: number;
  refresh_expires: number;
}

export type UserRole = 'viewer' | 'editor' | 'admin';

export interface User {
  id: number;
  username: string;
  email?: string | null;
  role: UserRole;
  enabled: boolean;
  avatar_path?: string | null;
  oauth_scopes?: string[];
}

export interface Firmware {
  id: number;
  platform_id: number;
  file_name: string;
  file_size_bytes: number;
}

export interface Platform {
  id: number;
  slug: string;
  fs_slug: string;
  name: string;
  custom_name?: string | null;
  display_name?: string | null;
  category?: string | null;
  generation?: number | null;
  family_name?: string | null;
  url_logo?: string | null;
  rom_count: number;
  fs_size_bytes: number;
  firmware?: Firmware[];
}

export interface RomFile {
  id: number;
  rom_id: number;
  file_name: string;
  file_path: string;
  file_size_bytes: number;
}

export type RomStatus = 'incomplete' | 'finished' | 'completed_100' | 'retired' | 'never_playing';

export interface RomUser {
  rating: number;
  difficulty: number;
  completion: number;
  status: RomStatus | null;
  last_played: string | null;
  backlogged: boolean;
  now_playing: boolean;
  hidden: boolean;
}

export interface RomMetadata {
  genres?: string[];
  franchises?: string[];
  companies?: string[];
  game_modes?: string[];
  first_release_date?: number | null;
  average_rating?: number | null;
}

export interface Rom {
  id: number;
  // Unmatched ROMs have no metadata name; use `romTitle()` for display.
  name: string | null;
  slug?: string | null;
  summary?: string | null;
  fs_name: string;
  fs_name_no_tags?: string;
  fs_name_no_ext?: string;
  fs_size_bytes: number;
  platform_id: number;
  platform_slug: string;
  platform_display_name?: string;
  platform_custom_name?: string | null;
  path_cover_small?: string | null;
  path_cover_large?: string | null;
  url_cover?: string | null;
  merged_screenshots?: string[];
  metadatum?: RomMetadata | null;
  regions?: string[];
  languages?: string[];
  tags?: string[];
  revision?: string | null;
  has_multiple_files?: boolean;
  missing_from_fs?: boolean;
  rom_user?: RomUser | null;
  files?: RomFile[];
  user_saves?: unknown[];
  user_states?: unknown[];
}

export interface RomPage {
  items: Rom[];
  // Null when the server skipped the count.
  total: number | null;
}

export type CollectionKind = 'regular' | 'smart';

export interface Collection {
  id: number;
  name: string;
  description?: string | null;
  rom_ids?: number[];
  rom_count?: number;
  path_cover_small?: string | null;
  path_covers_small?: string[];
  url_cover?: string | null;
  is_public?: boolean;
  is_favorite?: boolean;
  is_smart?: boolean;
}

export interface HeartbeatResponse {
  SYSTEM: {
    VERSION: string;
    SHOW_SETUP_WIZARD?: boolean;
  };
  EMULATION?: {
    DISABLE_EMULATOR_JS?: boolean;
  };
  FRONTEND?: {
    DISABLE_USERPASS_LOGIN?: boolean;
  };
  OIDC?: {
    ENABLED?: boolean;
    PROVIDER?: string;
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

export type TaskStatus =
  | 'queued'
  | 'started'
  | 'finished'
  | 'failed'
  | 'deferred'
  | 'scheduled'
  | 'stopped'
  | 'canceled';

export interface TaskInfo {
  task_id: string;
  task_name: string;
  status: TaskStatus;
}

export type RomGalleryParams = {
  title: string;
  platformId?: number;
  collectionId?: number;
  smartCollectionId?: number;
};

export type RootStackParamList = {
  ServerConfig: undefined;
  Login: undefined;
  Main: undefined;
  RomDetail: { romId: number };
  RomGallery: RomGalleryParams;
  Play: { romId: number; fileId?: number };
  Upload: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Platforms: undefined;
  Collections: undefined;
  Settings: undefined;
};

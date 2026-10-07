// by Cleyvin

export { api, getFreshBearer, getServerUrl } from './client';
export { describeError, httpStatus } from './errors';
export {
  probeServer,
  getHeartbeat,
  loginWithPassword,
  isApiToken,
  parsePairingQr,
  exchangePairingCode,
  getCurrentUser,
} from './auth';
export { getPlatforms, getFirmware } from './platforms';
export { getRoms, getRom, updateRomUser, romContentPath, type RomQuery, type RomUserUpdate } from './roms';
export { getCollections, getSmartCollections } from './collections';
export { getStats } from './stats';
export { startScan, waitForTask } from './tasks';
export { uploadRom, type UploadSource } from './upload';
export { pairFromQr } from './pairing';
export { type Session } from './session';

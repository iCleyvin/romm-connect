// by Cleyvin

import axios from 'axios';
import { api, getServerUrl } from './client';
import { httpStatus } from './errors';
import { normalizeServerUrl, Session } from './session';
import { API_PATHS, API_TOKEN_PREFIX } from '../constants';
import { AuthTokens, HeartbeatResponse, User } from '../types';

const fetchHeartbeat = async (baseUrl: string): Promise<HeartbeatResponse> => {
  const { data } = await axios.get<HeartbeatResponse>(`${baseUrl}${API_PATHS.HEARTBEAT}`, { timeout: 10000 });
  if (!data?.SYSTEM?.VERSION) throw new Error('This address did not answer like a RoMM server');
  return data;
};

/**
 * Resolves what the user typed into a reachable server URL. Without a scheme,
 * HTTPS is tried first and plain HTTP second (typical for LAN installs).
 */
export const probeServer = async (input: string): Promise<{ url: string; heartbeat: HeartbeatResponse }> => {
  const cleaned = normalizeServerUrl(input);
  if (!cleaned) throw new Error('Enter your server address');

  const candidates = /^https?:\/\//i.test(cleaned) ? [cleaned] : [`https://${cleaned}`, `http://${cleaned}`];
  let lastError: unknown;
  for (const url of candidates) {
    try {
      return { url, heartbeat: await fetchHeartbeat(url) };
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
};

export const getHeartbeat = (): Promise<HeartbeatResponse> => fetchHeartbeat(getServerUrl());

// Requesting a scope the account lacks fails the whole login, so ask for the
// widest set first and step down until the server accepts one.
const CORE_SCOPES = ['me.read', 'roms.read', 'platforms.read', 'assets.read', 'roms.user.read', 'collections.read'];
const READ_SCOPES = [...CORE_SCOPES, 'firmware.read', 'devices.read'];
const WRITE_SCOPES = [...READ_SCOPES, 'me.write', 'assets.write', 'devices.write', 'roms.user.write', 'collections.write'];
const EDIT_SCOPES = [...WRITE_SCOPES, 'roms.write', 'platforms.write'];
const FULL_SCOPES = [...EDIT_SCOPES, 'tasks.run'];
const SCOPE_TIERS = [FULL_SCOPES, EDIT_SCOPES, WRITE_SCOPES, READ_SCOPES, CORE_SCOPES];

export const loginWithPassword = async (username: string, password: string): Promise<Session> => {
  let lastError: unknown;
  for (const scopes of SCOPE_TIERS) {
    const body = [
      'grant_type=password',
      `username=${encodeURIComponent(username)}`,
      `password=${encodeURIComponent(password)}`,
      `scope=${encodeURIComponent(scopes.join(' '))}`,
    ].join('&');
    try {
      const { data } = await axios.post<AuthTokens>(`${getServerUrl()}${API_PATHS.TOKEN}`, body, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 15000,
      });
      return { kind: 'oauth', accessToken: data.access_token, refreshToken: data.refresh_token, scopes };
    } catch (err) {
      lastError = err;
      const detail = axios.isAxiosError(err) ? (err.response?.data as { detail?: string } | undefined)?.detail : '';
      const insufficientScope = httpStatus(err) === 403 && /scope/i.test(detail ?? '');
      if (!insufficientScope) throw err;
    }
  }
  throw lastError;
};

export const isApiToken = (value: string): boolean => value.startsWith(API_TOKEN_PREFIX);

/** Extracts the server origin and pairing code from a RoMM pairing QR. */
export const parsePairingQr = (scanned: string): { origin: string | null; code: string } | null => {
  const text = scanned.trim();
  const urlMatch = text.match(/^(https?:\/\/[^/?#]+)[^?#]*\?(?:.*&)?code=([A-Za-z0-9-]+)/i);
  if (urlMatch) return { origin: urlMatch[1], code: urlMatch[2] };
  if (/^[A-Za-z0-9]{4}-?[A-Za-z0-9]{4,6}$/.test(text)) return { origin: null, code: text };
  return null;
};

export const exchangePairingCode = async (baseUrl: string, code: string): Promise<string> => {
  const { data } = await axios.post<{ raw_token?: string }>(
    `${baseUrl}${API_PATHS.PAIR_EXCHANGE}`,
    { code },
    { timeout: 15000 },
  );
  if (!data?.raw_token || !isApiToken(data.raw_token)) throw new Error('The server returned an invalid token');
  return data.raw_token;
};

export const getCurrentUser = async (): Promise<User> => {
  const { data } = await api.get<User>(API_PATHS.USERS_ME);
  return data;
};

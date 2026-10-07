// by Cleyvin

import { exchangePairingCode, parsePairingQr, probeServer } from './auth';
import { describeError, httpStatus } from './errors';
import { Session } from './session';
import { HeartbeatResponse } from '../types';

export interface PairingResult {
  url: string;
  heartbeat: HeartbeatResponse;
  session: Session;
}

/**
 * Turns a scanned pairing QR into a server URL and API token. `knownServerUrl`
 * is used when the QR only carries the code.
 */
export const pairFromQr = async (scanned: string, knownServerUrl: string | null): Promise<PairingResult> => {
  const parsed = parsePairingQr(scanned);
  if (!parsed) throw new Error('This is not a RoMM pairing code.');
  const target = parsed.origin ?? knownServerUrl;
  if (!target) throw new Error('This code does not say which server it belongs to. Enter the address first.');

  const { url, heartbeat } = await probeServer(target);
  try {
    const apiToken = await exchangePairingCode(url, parsed.code);
    return { url, heartbeat, session: { kind: 'token', apiToken } };
  } catch (err) {
    const status = httpStatus(err);
    if (status === 404) throw new Error('This pairing code expired. Generate a new one in RoMM.');
    if (status === 429) throw new Error('Too many attempts. Wait a moment and try again.');
    throw new Error(describeError(err, 'Pairing failed'));
  }
};

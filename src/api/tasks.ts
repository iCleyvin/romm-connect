// by Cleyvin

import { getApiClient } from './client';

export const scanAllPlatforms = async (): Promise<{ scanned: number; errors: string[] }> => {
  const client = getApiClient();

  // Get filesystem platforms from heartbeat
  const heartbeat = await client.get('/api/heartbeat');
  const fsPlatforms: string[] = heartbeat.data?.FILESYSTEM?.FS_PLATFORMS || [];

  // Get existing platforms to avoid duplicates
  const existingRes = await client.get('/api/platforms');
  const existingSlugs = new Set(
    (existingRes.data || []).map((p: any) => p.fs_slug)
  );

  let scanned = 0;
  const errors: string[] = [];

  for (const slug of fsPlatforms) {
    if (existingSlugs.has(slug)) {
      scanned++; // Already exists, skip creation
      continue;
    }
    try {
      await client.post('/api/platforms', { fs_slug: slug });
      scanned++;
    } catch (err: any) {
      if (err.response?.status === 409) {
        scanned++; // Conflict = already exists
      } else {
        errors.push(`${slug}: ${err.response?.data?.detail || err.message}`);
      }
    }
  }

  return { scanned, errors };
};

export const runCleanup = async (): Promise<any> => {
  const client = getApiClient();
  const response = await client.post('/api/tasks/run/cleanup_orphaned_resources');
  return response.data;
};

// by Cleyvin

import { api } from './client';
import { isMissingEndpoint } from './errors';
import { API_PATHS } from '../constants';
import { TaskInfo } from '../types';

/**
 * Queues a quick library scan, optionally limited to some platforms. Returns
 * null when the server accepted the scan but gave no job to follow.
 */
export const startScan = async (platformIds: number[] = []): Promise<TaskInfo | null> => {
  try {
    const { data } = await api.post<TaskInfo>(`${API_PATHS.TASKS}/scan`, { type: 'quick', platforms: platformIds });
    return data?.task_id ? data : null;
  } catch (err) {
    if (!isMissingEndpoint(err)) throw err;
  }
  // Servers without the REST scan endpoint can still run the scheduled
  // library scan on demand.
  const { data } = await api.post<TaskInfo>(`${API_PATHS.TASKS}/run/scan_library`);
  return data?.task_id ? data : null;
};

export const getTask = async (taskId: string): Promise<TaskInfo> => {
  const { data } = await api.get<TaskInfo>(`${API_PATHS.TASKS}/${encodeURIComponent(taskId)}`);
  return data;
};

const POLL_INTERVAL_MS = 2500;
const MAX_WAIT_MS = 15 * 60 * 1000;

/** Resolves once the task leaves the queue, with whether it succeeded. */
export const waitForTask = async (taskId: string, isCancelled: () => boolean): Promise<boolean> => {
  const deadline = Date.now() + MAX_WAIT_MS;
  while (!isCancelled() && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    const { status } = await getTask(taskId);
    if (status === 'finished') return true;
    if (status === 'failed' || status === 'stopped' || status === 'canceled') return false;
  }
  return false;
};

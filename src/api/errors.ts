// by Cleyvin

import { isAxiosError } from 'axios';

export const httpStatus = (err: unknown): number | undefined =>
  isAxiosError(err) ? err.response?.status : undefined;

/** True when the server answered that the route does not exist (older RoMM). */
export const isMissingEndpoint = (err: unknown): boolean => {
  const status = httpStatus(err);
  return status === 404 || status === 405;
};

/** Human-readable message for an API failure. */
export const describeError = (err: unknown, fallback = 'Something went wrong'): string => {
  if (isAxiosError(err)) {
    if (err.response) {
      const detail = (err.response.data as { detail?: unknown } | undefined)?.detail;
      if (typeof detail === 'string' && detail) return detail;
      if (Array.isArray(detail) && typeof detail[0]?.msg === 'string') return detail[0].msg;
      if (err.response.status === 403) return 'Your account is not allowed to do this';
      if (err.response.status >= 500) return `Server error (${err.response.status})`;
      return `${fallback} (${err.response.status})`;
    }
    if (err.code === 'ECONNABORTED') return 'The server took too long to respond';
    return 'Could not reach the server. Check your connection.';
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
};

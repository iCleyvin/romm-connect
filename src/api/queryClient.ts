// by Cleyvin

import { QueryClient } from '@tanstack/react-query';
import { httpStatus } from './errors';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Retrying a 4xx only repeats the same answer; retry transport and 5xx once.
      retry: (failureCount, error) => {
        const status = httpStatus(error);
        if (status !== undefined && status < 500) return false;
        return failureCount < 1;
      },
    },
  },
});

export const queryKeys = {
  stats: ['stats'] as const,
  platforms: ['platforms'] as const,
  collections: ['collections'] as const,
  firmware: (platformId: number) => ['firmware', platformId] as const,
  rom: (romId: number) => ['rom', romId] as const,
  roms: (scope: object) => ['roms', scope] as const,
  allRoms: ['roms'] as const,
};

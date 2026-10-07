// by Cleyvin

import { useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';

/** Refetches stale data when a screen regains focus (not on first mount). */
export const useRefetchOnFocus = (refetch: () => unknown) => {
  const mounted = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (mounted.current) refetch();
      else mounted.current = true;
    }, [refetch]),
  );
};

// by Cleyvin

import { useWindowDimensions } from 'react-native';

/**
 * Column count and item width for a grid that keeps cards near `targetWidth`
 * on any screen: three covers on a phone, more on tablets or in landscape.
 */
export const useGridLayout = (targetWidth: number, padding: number, gap: number, minColumns = 2) => {
  const { width } = useWindowDimensions();
  const available = width - padding * 2;
  const columns = Math.max(minColumns, Math.floor((available + gap) / (targetWidth + gap)));
  const itemWidth = Math.floor((available - gap * (columns - 1)) / columns);
  return { columns, itemWidth };
};

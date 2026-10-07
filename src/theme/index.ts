// by Cleyvin

import type { ComponentProps } from 'react';
import type { MaterialCommunityIcons } from '@expo/vector-icons';

export { Colors, type ThemeColors, type ThemeMode } from './colors';
export { spacing, borderRadius, fontSize, fontWeight } from './spacing';

export type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

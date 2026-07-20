import { useColorScheme } from 'react-native';
import colors, { getCategoryColor, getPriorityColor, getCallTypeColor } from '@/constants/colors';

export function useColors() {
  const scheme = useColorScheme();
  const palette =
    scheme === 'dark' && 'dark' in colors
      ? (colors as Record<string, typeof colors.light>).dark
      : colors.light;
  return { ...palette, radius: colors.radius };
}

export { getCategoryColor, getPriorityColor, getCallTypeColor };

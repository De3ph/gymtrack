import { useColorScheme } from "./useColorScheme";

import { getThemeColors, type ThemeColors } from "@/constants/Colors";

/**
 * Returns the semantic color tokens for the active appearance.
 * Use this in components; never reference raw hex values.
 */
export function useThemeColors(): ThemeColors {
  const scheme = useColorScheme();
  return getThemeColors(scheme);
}

/**
 * Scheme-aware color access for inline styles.
 *
 * Thin re-export layer over `@/constants/Colors` (the single source of
 * truth for palettes) and `@/components/useThemeColors` (the hook).
 *
 *  - `useAppColors()` — hook for React components; follows the device
 *    scheme via `useColorScheme()` and returns the matching palette.
 *  - `getColors(scheme)` — pure helper for non-hook call sites.
 */
export {
  useThemeColors,
  useThemeColors as useAppColors,
} from "@/components/useThemeColors";

export {
  getThemeColors as getColors,
  type ColorScheme,
  type ThemeColors,
} from "@/constants/Colors";

import { useColorScheme as useColorSchemeCore } from "react-native";

import { useThemeStore } from "@/stores/themeStore";
import type { ColorScheme } from "@/constants/Colors";

/**
 * The appearance the app actually renders with.
 *
 * Resolves the user's stored preference (system | light | dark) against the
 * OS setting. Use this — not the raw `useColorScheme()` — for anything that
 * paints native chrome (headers, status bar, system UI background) so those
 * surfaces stay in sync with the JS theme.
 */
export function useEffectiveScheme(): ColorScheme {
  const theme = useThemeStore((s) => s.theme);
  const systemScheme = useColorSchemeCore();

  if (theme === "system") return systemScheme === "dark" ? "dark" : "light";
  return theme;
}
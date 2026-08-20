/**
 * GymTrack Mobile color system.
 *
 * Two tiers:
 *  - primitives: ramps keyed by hue + step (accent, neutral, status).
 *  - semantic: role tokens (text, bg, border, accent-solid, ...) that point
 *    at primitives and are the ONLY tier components reference.
 *
 * Components must consume the semantic tier via `useThemeColors()` so that
 * light and dark appearances swap once, here, and everywhere else follows.
 */

export const palette = {
  accent: {
    50: "#eff6ff",
    100: "#dbeafe",
    200: "#bfdbfe",
    300: "#93c5fd",
    400: "#60a5fa",
    500: "#3b82f6",
    600: "#2563eb",
    700: "#1d4ed8",
    800: "#1e40af",
    900: "#1e3a8a",
  },
  neutral: {
    50: "#f9fafb",
    100: "#f3f4f6",
    200: "#e5e7eb",
    300: "#d1d5db",
    400: "#9ca3af",
    500: "#6b7280",
    600: "#4b5563",
    700: "#374151",
    800: "#1f2937",
    900: "#111827",
  },
  danger: {
    50: "#fef2f2",
    100: "#fee2e2",
    200: "#fecaca",
    500: "#ef4444",
    600: "#dc2626",
    700: "#b91c1c",
    800: "#991b1b",
  },
  success: {
    50: "#f0fdf4",
    100: "#dcfce7",
    600: "#16a34a",
    700: "#15803d",
    800: "#166534",
  },
  warning: {
    100: "#fef9c3",
    600: "#d97706",
    700: "#b45309",
    800: "#854d0e",
  },
  invite: {
    300: "#c4b5fd",
    600: "#7c3aed",
    700: "#6d28d9",
  },
} as const;

export type Palette = typeof palette;

export interface ThemeColors {
  /** Primary text */
  text: string;
  /** Secondary text (labels, muted body) */
  textSecondary: string;
  /** Tertiary text (hints, placeholders, timestamps) */
  textTertiary: string;
  /** Body text one step above secondary */
  textBody: string;
  /** Page background */
  background: string;
  /** Subtle surface (search field, pressed rows, chart track) */
  surfaceSubtle: string;
  /** Card / component background */
  card: string;
  /** Border, separator */
  border: string;
  /** Strong border / input border */
  borderStrong: string;

  /** Brand accent — filled primary actions, links, focus */
  accent: string;
  /** Accent text on a light accent background (badges) */
  accentOnLight: string;
  /** Disabled accent fill (buttons in a disabled state) */
  accentDisabled: string;
  /** Light accent surface (selected rows, badge backgrounds) */
  accentSurface: string;

  /** Text/icon on a filled accent button */
  onAccent: string;

  /** Status */
  danger: string;
  dangerText: string;
  dangerSurface: string;
  dangerBorder: string;
  dangerOnFill: string;
  success: string;
  successText: string;
  successSurface: string;
  warning: string;
  warningText: string;
  warningSurface: string;

  /** Second accent hue — used only for the "accept invitation" action */
  invite: string;
  inviteDisabled: string;

  /** Tab bar */
  tabIconDefault: string;
  tabIconSelected: string;
}

const light: ThemeColors = {
  text: "#111827",
  textSecondary: "#4b5563",
  textTertiary: "#6b7280",
  textBody: "#374151",

  background: "#f9fafb",
  surfaceSubtle: "#f3f4f6",
  card: "#ffffff",
  border: "#e5e7eb",
  borderStrong: "#d1d5db",

  accent: "#2563eb",
  accentOnLight: "#1d4ed8",
  accentDisabled: "#93c5fd",
  accentSurface: "#eff6ff",

  onAccent: "#ffffff",

  danger: "#dc2626",
  dangerText: "#b91c1c",
  dangerSurface: "#fef2f2",
  dangerBorder: "#fecaca",
  dangerOnFill: "#ffffff",
  success: "#16a34a",
  successText: "#166534",
  successSurface: "#dcfce7",
  warning: "#d97706",
  warningText: "#854d0e",
  warningSurface: "#fef9c3",

  invite: "#7c3aed",
  inviteDisabled: "#c4b5fd",

  tabIconDefault: "#9ca3af",
  tabIconSelected: "#2563eb",
};

const dark: ThemeColors = {
  text: "#f9fafb",
  textSecondary: "#9ca3af",
  textTertiary: "#6b7280",
  textBody: "#d1d5db",

  background: "#030712",
  surfaceSubtle: "#111827",
  card: "#1f2937",
  border: "#374151",
  borderStrong: "#4b5563",

  accent: "#3b82f6",
  accentOnLight: "#bfdbfe",
  accentDisabled: "#1e40af",
  accentSurface: "#1e3a8a",

  onAccent: "#ffffff",

  danger: "#f87171",
  dangerText: "#fca5a5",
  dangerSurface: "#450a0a",
  dangerBorder: "#7f1d1d",
  dangerOnFill: "#450a0a",
  success: "#4ade80",
  successText: "#86efac",
  successSurface: "#052e16",
  warning: "#fbbf24",
  warningText: "#fde68a",
  warningSurface: "#451a03",

  invite: "#a78bfa",
  inviteDisabled: "#4c1d95",

  tabIconDefault: "#6b7280",
  tabIconSelected: "#3b82f6",
};

export const Colors = {
  light,
  dark,
} as const;

export type ColorScheme = "light" | "dark";

export type ThemeColorsKey = keyof ThemeColors;

export function getThemeColors(scheme: ColorScheme): ThemeColors {
  return Colors[scheme];
}

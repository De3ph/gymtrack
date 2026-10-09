# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# Safe area / headers

The native stack header applies the top inset **itself**. Do not add `useSafeAreaInsets`
padding to a screen that renders under a header — that double-pads it.

- **Screen has a header** (any `(tabs)` screen, or any route with `headerShown: true`)
  → add nothing. The header already clears the status bar.
- **Screen has `headerShown: false`** → the screen owns the inset. Use
  `useSafeAreaInsets()` and apply `paddingTop: insets.top + 8` (and
  `paddingBottom: insets.bottom`) to its scroll container's `contentContainerStyle`,
  not to an outer `View` — an outer view clips the scroll content.

`SafeAreaProvider` is mounted once at the root (`app/_layout.tsx`); do not add it again.

Conventions:

- Every route sets `headerShown: false` and renders its own themed back control. Do
  **not** combine a native header with an in-app back button — that yields two headers
  and two back buttons.
- Root `Stack` `screenOptions` in `app/_layout.tsx` already supply themed
  `headerStyle` / `headerTintColor`, so a route that does opt into a native header
  inherits the theme instead of a white bar that breaks in dark mode.
- For native chrome (status bar, system UI background, headers) resolve the appearance
  with `useEffectiveScheme()` from `@/hooks/useEffectiveScheme`, which honours the
  user's stored light/dark preference. Raw `useColorScheme()` only reflects the OS
  setting and ignores an explicit in-app choice.

Related: `useThemeColors()` (in `@/components/useThemeColors`) returns the same
semantic tokens for in-app components. Components must consume semantic tokens, never
raw hex.
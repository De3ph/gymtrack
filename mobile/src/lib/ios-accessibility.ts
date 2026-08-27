import { Platform } from "react-native";
import type { ModifierConfig } from "@expo/ui/swift-ui/modifiers";

type IOSMods = typeof import("@expo/ui/swift-ui/modifiers");

let iosMods: IOSMods | null | undefined;

/**
 * Load the SwiftUI accessibility modifiers lazily. They are resolved only on
 * iOS because `@expo/ui/swift-ui/modifiers` calls `requireNativeModule("ExpoUI")`
 * at module scope, which throws on web and is meaningless on Android. The
 * resulting `ModifierConfig[]` is a no-op array on every platform except iOS.
 */
function loadIOSMods(): IOSMods | null {
  if (Platform.OS !== "ios") return null;
  if (iosMods !== undefined) return iosMods;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    iosMods = require("@expo/ui/swift-ui/modifiers") as IOSMods;
  } catch {
    iosMods = null;
  }
  return iosMods;
}

/**
 * Supplies an accessible name to a control. On iOS this overrides the
 * placeholder-derived name with the real visible label; every other platform
 * keeps the platform default.
 */
export function accessibleLabel(label: string, hint?: string): ModifierConfig[] {
  const ios = loadIOSMods();
  if (!ios) return [];
  return hint
    ? [ios.accessibilityLabel(label), ios.accessibilityHint(hint)]
    : [ios.accessibilityLabel(label)];
}
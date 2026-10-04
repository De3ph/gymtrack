import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

/**
 * Single entry point for light impact feedback.
 *
 * iOS is the only platform where a light impact is meaningful; Android and
 * web no-op so callers never need platform checks of their own.
 */
export function triggerHaptic(): void {
  if (Platform.OS === "ios") {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}
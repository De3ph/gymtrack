import type React from "react";

/**
 * Visual weight of a swipe action.
 *
 * Adding a variant here is the only change required to support a new
 * appearance: the panel reads from this single registry, so colors cannot
 * drift between lists.
 */
export type SwipeActionVariant = "neutral" | "primary" | "destructive";

export interface SwipeActionVariantMeta {
  containerClass: string;
  labelClass: string;
  /** Resolved through `useThemeColors()` for the action glyph. */
  glyphColorKey: "text" | "onAccent" | "dangerOnFill";
}

export const SWIPE_ACTION_VARIANTS: Record<
  SwipeActionVariant,
  SwipeActionVariantMeta
> = {
  neutral: {
    containerClass: "bg-surface-subtle active:opacity-80",
    labelClass: "text-text",
    glyphColorKey: "text",
  },
  primary: {
    containerClass: "bg-primary active:opacity-80",
    labelClass: "text-primary-foreground",
    glyphColorKey: "onAccent",
  },
  destructive: {
    containerClass: "bg-danger active:opacity-80",
    labelClass: "text-danger-on-fill",
    glyphColorKey: "dangerOnFill",
  },
};

/** Minimum touch target width for a single action. */
export const SWIPE_ACTION_MIN_WIDTH = 84;

export interface SwipeAction {
  /** Stable identity; also used as the accessibility action name. */
  id: string;
  /** Already-translated short label rendered under the glyph. */
  label: string;
  /** Spoken label. Defaults to `label`. */
  accessibilityLabel?: string;
  /** Receives the resolved on-fill color so callers never touch the palette. */
  icon: (color: string) => React.ReactNode;
  variant: SwipeActionVariant;
  onPress: () => void;
}
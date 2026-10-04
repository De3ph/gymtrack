/**
 * Visual tone variants for {@link HistoryCard}.
 *
 * Adding a tone here is the only change required to support a new accent:
 * every consumer reads from this single registry, so colors cannot drift
 * between lists.
 */
export type HistoryCardTone = "brand" | "warning" | "success" | "neutral";

export interface HistoryCardToneMeta {
  /** Background class for the leading icon tile. */
  surfaceClass: string;
  /** Text class for the uppercase eyebrow. */
  textClass: string;
  /** Resolved through `useThemeColors()` for the icon glyph. */
  colorKey: "accent" | "warning" | "success" | "textSecondary";
}

export const HISTORY_CARD_TONES: Record<HistoryCardTone, HistoryCardToneMeta> =
  {
    brand: {
      surfaceClass: "bg-brand-surface",
      textClass: "text-brand",
      colorKey: "accent",
    },
    warning: {
      surfaceClass: "bg-warning-surface",
      textClass: "text-warning-text",
      colorKey: "warning",
    },
    success: {
      surfaceClass: "bg-success-surface",
      textClass: "text-success-text",
      colorKey: "success",
    },
    neutral: {
      surfaceClass: "bg-surface-subtle",
      textClass: "text-text-secondary",
      colorKey: "textSecondary",
    },
  };
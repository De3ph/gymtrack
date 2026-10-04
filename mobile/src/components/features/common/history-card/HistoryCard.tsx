import React, { useState } from "react";
import type { AccessibilityActionEvent } from "react-native";
import Animated, { cubicBezier } from "react-native-reanimated";

import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Pressable } from "@/components/ui/pressable";
import { useThemeColors } from "@/components/useThemeColors";
import {
  HISTORY_CARD_TONES,
  type HistoryCardTone,
} from "./history-card-tone";

const EASE_OUT = cubicBezier(0.23, 1, 0.32, 1)

const CARD_STYLE = {
  transform: [{ scale: 1 }],
  transitionProperty: "transform" as const,
  transitionDuration: 140,
  transitionTimingFunction: EASE_OUT,
}

const CARD_PRESSED_STYLE = {
  transform: [{ scale: 0.97 }],
}

export interface HistoryCardProps {
  /**
   * Leading glyph rendered at 18px. Receives the resolved tone color so
   * callers never touch the palette for icons.
   */
  icon: (color: string) => React.ReactNode;
  /** Uppercase category label, e.g. "BREAKFAST" or "WORKOUT". */
  eyebrow: string;
  /** Primary line, usually a formatted date. */
  title: string;
  /** Optional one-line context, e.g. food or exercise names. */
  preview?: string;
  /** Dot-separated facts, e.g. `["5 exercises", "12 sets"]`. */
  meta?: string[];
  /** Optional low-emphasis line, e.g. volume and reps. */
  tertiary?: string;
  /** Accent for the icon tile and eyebrow. */
  tone?: HistoryCardTone;
  /** Trailing slot, e.g. a menu button. */
  trailing?: React.ReactNode;
  onPress: () => void;
  onLongPress?: () => void;
  accessibilityLabel: string;
  accessibilityHint?: string;
  /** VoiceOver custom actions, e.g. edit / delete. */
  accessibilityActions?: readonly { name: string }[];
  onAccessibilityAction?: (event: AccessibilityActionEvent) => void;
  className?: string;
}

function DottedSeparator() {
  return <Box className="h-1 w-1 rounded-full bg-text-tertiary" />;
}

/**
 * Presentational blueprint for the tall, single-column history rows used by
 * the meals, workouts and measurements lists.
 *
 * Single responsibility: render a card's anatomy. It performs no data access,
 * owns no domain types, translates no copy and opens no alerts. Interaction
 * policy lives in `useHistoryCardActions`; swipe gestures live in
 * `HistorySwipeable`.
 */
export function HistoryCard({
  icon,
  eyebrow,
  title,
  preview,
  meta,
  tertiary,
  tone = "brand",
  trailing,
  onPress,
  onLongPress,
  accessibilityLabel,
  accessibilityHint,
  accessibilityActions,
  onAccessibilityAction,
  className,
}: HistoryCardProps) {
  const colors = useThemeColors();
  const toneMeta = HISTORY_CARD_TONES[tone];
  const [pressed, setPressed] = useState(false);

  return (
    <Pressable
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityActions={accessibilityActions}
      onAccessibilityAction={onAccessibilityAction}
      className={"w-full " + (className ?? "")}
    >
      <Animated.View
        className="min-h-[150px] w-full overflow-hidden rounded-[18px] border border-border bg-card p-3"
        style={[CARD_STYLE, pressed && CARD_PRESSED_STYLE]}
      >
        <HStack className="items-start justify-between">
          <Box
            className={
              "h-8 w-8 items-center justify-center rounded-[10px] " +
              toneMeta.surfaceClass
            }
          >
            {icon(colors[toneMeta.colorKey])}
          </Box>

          {trailing}
        </HStack>

        <Box className="flex-1" />

        <Text
          className={
            "text-[10px] font-bold uppercase tracking-[1.2px] " + toneMeta.textClass
          }
          numberOfLines={1}
        >
          {eyebrow}
        </Text>

        <Text className="mt-0.5 text-[14px] font-semibold text-text" numberOfLines={1}>
          {title}
        </Text>

        {preview ? (
          <Text
            className="mt-0.5 text-[11px] text-text-secondary"
            numberOfLines={1}
          >
            {preview}
          </Text>
        ) : null}

        {meta && meta.length > 0 ? (
          <HStack className="mt-1.5 items-center gap-1.5">
            <Text className="text-[11px] font-semibold text-text-body">
              {meta[0]}
            </Text>
            {meta.slice(1).map((entry, index) => (
              <React.Fragment key={entry + index}>
                <DottedSeparator />
                <Text className="text-[11px] text-text-tertiary">{entry}</Text>
              </React.Fragment>
            ))}
          </HStack>
        ) : null}

        {tertiary ? (
          <Text
            className="mt-0.5 text-[10px] text-text-tertiary"
            numberOfLines={1}
          >
            {tertiary}
          </Text>
        ) : null}
      </Animated.View>
    </Pressable>
  );
}
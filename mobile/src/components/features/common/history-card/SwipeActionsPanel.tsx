import { useCallback } from "react";
import {
  I18nManager,
  Pressable as RNPressable,
  View,
} from "react-native";
import Reanimated, {
  useAnimatedStyle,
  type SharedValue,
} from "react-native-reanimated";

import { Text } from "@/components/ui/text";
import { useThemeColors } from "@/components/useThemeColors";
import { triggerHaptic } from "@/lib/haptics";
import {
  SWIPE_ACTION_MIN_WIDTH,
  SWIPE_ACTION_VARIANTS,
  type SwipeAction,
} from "./swipe-action";

export interface SwipeActionsPanelProps {
  actions: SwipeAction[];
  drag: SharedValue<number>;
  /** Total panel width, used to park the row off-screen when closed. */
  panelWidth: number;
  onActionPress: (action: SwipeAction) => void;
}

/**
 * Presentational row of swipe actions.
 *
 * Owns no gesture state and no policy: it renders whatever
 * {@link SwipeAction} list it is handed and translates with the drag value.
 * Every action is tap-only — there is deliberately no drag-past-threshold
 * destructive path, because a mis-swipe must never destroy data.
 */
export function SwipeActionsPanel({
  actions,
  drag,
  panelWidth,
  onActionPress,
}: SwipeActionsPanelProps) {
  const colors = useThemeColors();
  const rtl = I18nManager.isRTL;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: drag.value + panelWidth }],
  }));

  const handlePress = useCallback(
    (action: SwipeAction) => {
      triggerHaptic();
      onActionPress(action);
    },
    [onActionPress],
  );

  return (
    <Reanimated.View
      style={[styles.row, rtl && styles.rowRtl, animatedStyle]}
    >
      {actions.map((action) => {
        const variant = SWIPE_ACTION_VARIANTS[action.variant];
        return (
          <RNPressable
            key={action.id}
            onPress={() => handlePress(action)}
            accessibilityRole="button"
            accessibilityLabel={action.accessibilityLabel ?? action.label}
            style={[styles.action, { minWidth: SWIPE_ACTION_MIN_WIDTH }]}
            className={variant.containerClass}
          >
            <View pointerEvents="none">
              {action.icon(colors[variant.glyphColorKey])}
            </View>
            <Text className={"text-[11px] font-semibold " + variant.labelClass}>
              {action.label}
            </Text>
          </RNPressable>
        );
      })}
    </Reanimated.View>
  );
}

const styles = {
  row: {
    flexDirection: "row" as const,
    height: "100%" as const,
  },
  rowRtl: {
    flexDirection: "row-reverse" as const,
  },
  action: {
    height: "100%" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 4,
  },
};
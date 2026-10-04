import { useCallback, useEffect, useMemo, useRef } from "react";
import { StyleSheet, View } from "react-native";
import type { ReactNode } from "react";
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from "react-native-gesture-handler/ReanimatedSwipeable";
import type { SharedValue } from "react-native-reanimated";

import { triggerHaptic } from "@/lib/haptics";
import { useSwipeCoordinator } from "./SwipeCoordinator";
import { SwipeActionsPanel } from "./SwipeActionsPanel";
import {
  SWIPE_ACTION_MIN_WIDTH,
  type SwipeAction,
} from "./swipe-action";

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
    borderRadius: 18,
    overflow: "hidden",
  },
  static: {
    marginBottom: 12,
  },
});

export interface HistorySwipeableProps {
  /** Revealed by swiping the row to the left (RTL-mirrored automatically). */
  rightActions?: SwipeAction[];
  /** Revealed by swiping the row to the right. */
  leftActions?: SwipeAction[];
  /** False renders the child without a gesture container (read-only rows). */
  enabled?: boolean;
  /** Stable id for cross-row coordination. Defaults to an internal id. */
  id?: string;
  children: ReactNode;
}

let autoId = 0;

/**
 * Gesture shell for {@link HistoryCard}.
 *
 * Single responsibility: own the swipeable lifecycle. It knows nothing about
 * what the actions do — that is supplied as data via {@link SwipeAction}.
 *
 * Only one row may stay open at a time, enforced by the nearest
 * `SwipeCoordinatorProvider` rather than a module-level singleton, so the
 * registry dies with the screen and cannot leak recycled rows.
 */
export function HistorySwipeable({
  rightActions,
  leftActions,
  enabled = true,
  id,
  children,
}: HistorySwipeableProps) {
  const coordinator = useSwipeCoordinator();
  const generatedId = useMemo(() => `history-row-${autoId++}`, []);
  const rowId = id ?? generatedId;

  const swipeableRef = useRef<SwipeableMethods | null>(null);
  const hasRight = (rightActions?.length ?? 0) > 0;
  const hasLeft = (leftActions?.length ?? 0) > 0;
  const active = enabled && (hasRight || hasLeft);

  useEffect(() => {
    if (!active) return;
    const methods = swipeableRef.current;
    if (!methods) return;
    return coordinator.register(rowId, methods);
  }, [active, coordinator, rowId]);

  const handleWillOpen = useCallback(() => {
    triggerHaptic();
    coordinator.requestOpen(rowId);
  }, [coordinator, rowId]);

  const handleActionPress = useCallback(
    (action: SwipeAction) => {
      // Close first: a mutation in flight must not be re-triggered by a
      // second tap on a still-open row.
      swipeableRef.current?.close();
      action.onPress();
    },
    [],
  );

  const rightWidth = (rightActions?.length ?? 0) * SWIPE_ACTION_MIN_WIDTH;
  const leftWidth = (leftActions?.length ?? 0) * SWIPE_ACTION_MIN_WIDTH;

  const renderRightActions = useCallback(
    (
      _progress: SharedValue<number>,
      drag: SharedValue<number>,
      _methods: SwipeableMethods,
    ) =>
      hasRight ? (
        <SwipeActionsPanel
          actions={rightActions ?? []}
          drag={drag}
          panelWidth={rightWidth}
          onActionPress={handleActionPress}
        />
      ) : null,
    [hasRight, rightActions, rightWidth, handleActionPress],
  );

  const renderLeftActions = useCallback(
    (
      _progress: SharedValue<number>,
      drag: SharedValue<number>,
      _methods: SwipeableMethods,
    ) =>
      hasLeft ? (
        <SwipeActionsPanel
          actions={leftActions ?? []}
          drag={drag}
          panelWidth={leftWidth}
          onActionPress={handleActionPress}
        />
      ) : null,
    [hasLeft, leftActions, leftWidth, handleActionPress],
  );

  if (!active) {
    return <View style={styles.static}>{children}</View>;
  }

  return (
    <ReanimatedSwipeable
      ref={swipeableRef}
      containerStyle={styles.container}
      friction={2}
      rightThreshold={SWIPE_ACTION_MIN_WIDTH / 2}
      leftThreshold={SWIPE_ACTION_MIN_WIDTH / 2}
      overshootRight={false}
      overshootLeft={false}
      enableTrackpadTwoFingerGesture
      renderLeftActions={renderLeftActions}
      renderRightActions={renderRightActions}
      onSwipeableWillOpen={handleWillOpen}
    >
      {children}
    </ReanimatedSwipeable>
  );
}
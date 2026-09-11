import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import {
  I18nManager,
  StyleSheet,
  View,
  type AccessibilityActionEvent,
} from "react-native";
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from "react-native-gesture-handler/ReanimatedSwipeable";
import Reanimated, {
  useAnimatedStyle,
  type SharedValue,
} from "react-native-reanimated";
import { impactAsync, ImpactFeedbackStyle } from "expo-haptics";

import { useI18n } from "@/lib/i18n";
import type { Workout } from "@/types";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Pressable } from "@/components/ui/pressable";
import { Icon, ChevronRightIcon, EditIcon, TrashIcon } from "@/components/ui/icon";
import { WorkoutIcon } from "@/components/icons";
import { useThemeColors } from "@/components/useThemeColors";

interface WorkoutCardProps {
  workout: Workout;
  editable: boolean;
  onOpen: (workout: Workout) => void;
  onEdit: (workout: Workout) => void;
  onDelete: (workout: Workout) => void;
}

const ACTION_WIDTH = 84;
const ACTIONS_WIDTH = ACTION_WIDTH * 2;

const styles = StyleSheet.create({
  swipeable: {
    marginBottom: 8,
    borderRadius: 16,
    overflow: "hidden",
  },
  plain: {
    marginBottom: 8,
  },
  actionsRow: {
    flexDirection: "row",
    height: "100%",
  },
  action: {
    width: ACTION_WIDTH,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
});

const currentlyOpenSwipeable: { current: SwipeableMethods | null } = {
  current: null,
};

interface SwipeActionsProps {
  drag: SharedValue<number>;
  methods: SwipeableMethods;
  onEdit: () => void;
  onDelete: () => void;
  editLabel: string;
  deleteLabel: string;
}

function SwipeActions({
  drag,
  methods,
  onEdit,
  onDelete,
  editLabel,
  deleteLabel,
}: SwipeActionsProps) {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: drag.value + ACTIONS_WIDTH }],
  }));

  const handleEdit = useCallback(() => {
    methods.close();
    onEdit();
  }, [methods, onEdit]);

  const handleDelete = useCallback(() => {
    methods.close();
    onDelete();
  }, [methods, onDelete]);

  return (
    <Reanimated.View style={[styles.actionsRow, animatedStyle]}>
      <Pressable
        onPress={handleEdit}
        accessibilityRole="button"
        accessibilityLabel={editLabel}
        className="bg-primary active:opacity-80"
        style={styles.action}
      >
        <Icon as={EditIcon} size="lg" className="text-primary-foreground" />
        <Text className="text-[11px] font-semibold text-primary-foreground">
          {editLabel}
        </Text>
      </Pressable>

      <Pressable
        onPress={handleDelete}
        accessibilityRole="button"
        accessibilityLabel={deleteLabel}
        className="bg-danger active:opacity-80"
        style={styles.action}
      >
        <Icon as={TrashIcon} size="lg" className="text-danger-on-fill" />
        <Text className="text-[11px] font-semibold text-danger-on-fill">
          {deleteLabel}
        </Text>
      </Pressable>
    </Reanimated.View>
  );
}

export const WorkoutCard = memo(function WorkoutCard({
  workout,
  editable,
  onOpen,
  onEdit,
  onDelete,
}: WorkoutCardProps) {
  const { t } = useI18n();
  const c = useThemeColors();
  const swipeableRef = useRef<SwipeableMethods | null>(null);

  const { exerciseCount, totalSets, formattedDate } = useMemo(() => {
    const exercises = workout.exercises ?? [];
    return {
      exerciseCount: exercises.length,
      totalSets: exercises.reduce((acc, ex) => acc + (ex.sets?.length ?? 0), 0),
      formattedDate: new Date(workout.date).toLocaleDateString(undefined, {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
    };
  }, [workout.exercises, workout.date]);

  const handlePress = useCallback(() => onOpen(workout), [onOpen, workout]);
  const handleEdit = useCallback(() => onEdit(workout), [onEdit, workout]);
  const handleDelete = useCallback(() => onDelete(workout), [onDelete, workout]);

  const handleAccessibilityAction = useCallback(
    (event: AccessibilityActionEvent) => {
      switch (event.nativeEvent.actionName) {
        case "edit":
          handleEdit();
          break;
        case "delete":
          handleDelete();
          break;
      }
    },
    [handleEdit, handleDelete],
  );

  const handleWillOpen = useCallback(() => {
    if (process.env.EXPO_OS === "ios") {
      void impactAsync(ImpactFeedbackStyle.Light);
    }
    const current = swipeableRef.current;
    const previous = currentlyOpenSwipeable.current;
    if (previous && previous !== current) {
      previous.close();
    }
    currentlyOpenSwipeable.current = current;
  }, []);

  const handleClose = useCallback(() => {
    if (currentlyOpenSwipeable.current === swipeableRef.current) {
      currentlyOpenSwipeable.current = null;
    }
  }, []);

  useEffect(
    () => () => {
      if (currentlyOpenSwipeable.current === swipeableRef.current) {
        currentlyOpenSwipeable.current = null;
      }
    },
    [],
  );

  const renderRightActions = useCallback(
    (
      _progress: SharedValue<number>,
      drag: SharedValue<number>,
      methods: SwipeableMethods,
    ) => (
      <SwipeActions
        drag={drag}
        methods={methods}
        onEdit={handleEdit}
        onDelete={handleDelete}
        editLabel={t("common.actions.edit")}
        deleteLabel={t("common.actions.delete")}
      />
    ),
    [handleEdit, handleDelete, t],
  );

  const card = (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`${formattedDate}, ${exerciseCount} ${t(
        "workout.list.exercises",
      )}, ${t("workout.list.sets_x", { sets: totalSets })}`}
      accessibilityHint={t("workout.list.view_details")}
      accessibilityActions={
        editable ? [{ name: "edit" }, { name: "delete" }] : undefined
      }
      onAccessibilityAction={editable ? handleAccessibilityAction : undefined}
      className="flex-row items-center gap-3 rounded-2xl border border-border bg-card p-3.5 active:opacity-70"
    >
      <Box className="h-11 w-11 items-center justify-center rounded-full bg-brand-surface">
        <WorkoutIcon size={22} color={c.accent} />
      </Box>

      <Box className="flex-1">
        <Text className="text-[15px] font-semibold text-text" numberOfLines={1}>
          {formattedDate}
        </Text>
        <HStack className="mt-1 items-center gap-2">
          <Text className="text-[13px] text-text-secondary">
            {exerciseCount} {t("workout.list.exercises")}
          </Text>
          <Box className="h-1 w-1 rounded-full bg-text-tertiary" />
          <Text className="text-[13px] text-text-secondary">
            {t("workout.list.sets_x", { sets: totalSets })}
          </Text>
        </HStack>
      </Box>

      <Icon
        as={ChevronRightIcon}
        size="md"
        className="shrink-0 text-text-tertiary"
        style={{ transform: [{ scaleX: I18nManager.isRTL ? -1 : 1 }] }}
      />
    </Pressable>
  );

  if (!editable) {
    return <View style={styles.plain}>{card}</View>;
  }

  return (
    <ReanimatedSwipeable
      ref={swipeableRef}
      containerStyle={styles.swipeable}
      friction={2}
      rightThreshold={40}
      overshootRight={false}
      enableTrackpadTwoFingerGesture
      renderRightActions={renderRightActions}
      onSwipeableWillOpen={handleWillOpen}
      onSwipeableClose={handleClose}
    >
      {card}
    </ReanimatedSwipeable>
  );
});

import { memo, useCallback, useMemo } from "react";

import { useI18n } from "@/lib/i18n";
import type { Workout } from "@/types";
import { WorkoutIcon, PencilIcon, BinIcon } from "@/components/icons";
import {
  HistoryCard,
  HistoryCardMenu,
  HistorySwipeable,
  useHistoryCardActions,
  type SwipeAction,
} from "@/components/features/common/history-card";

interface WorkoutCardProps {
  workout: Workout;
  editable: boolean;
  onOpen: (workout: Workout) => void;
  onEdit: (workout: Workout) => void;
  onDelete: (workout: Workout) => void;
}

export const WorkoutCard = memo(function WorkoutCard({
  workout,
  editable,
  onOpen,
  onEdit,
  onDelete,
}: WorkoutCardProps) {
  const { t } = useI18n();

  const { exerciseCount, totalSets, totalReps, totalVolume, formattedDate, preview } =
    useMemo(() => {
      const exercises = workout.exercises ?? [];
      let sets = 0;
      let reps = 0;
      let volume = 0;

      for (const ex of exercises) {
        for (const set of ex.sets ?? []) {
          sets += 1;
          reps += set.reps ?? 0;
          volume += (set.weight ?? 0) * (set.reps ?? 0);
        }
      }

      return {
        exerciseCount: exercises.length,
        totalSets: sets,
        totalReps: reps,
        totalVolume: Math.round(volume),
        preview: exercises
          .map((ex) => ex.name)
          .filter(Boolean)
          .join(", "),
        formattedDate: new Date(workout.date).toLocaleDateString(undefined, {
          weekday: "short",
          year: "numeric",
          month: "short",
          day: "numeric",
        }),
      };
    }, [workout.exercises, workout.date]);

  const handleOpen = useCallback(() => onOpen(workout), [onOpen, workout]);
  const handleEdit = useCallback(() => onEdit(workout), [onEdit, workout]);
  const handleDelete = useCallback(
    () => onDelete(workout),
    [onDelete, workout],
  );

  const actions = useHistoryCardActions({
    enabled: editable,
    alertTitle: t("workout.card.workout"),
    alertMessage: formattedDate,
    labels: {
      edit: t("common.actions.edit"),
      delete: t("common.actions.delete"),
      cancel: t("common.actions.cancel"),
    },
    onEdit: handleEdit,
    onDelete: handleDelete,
    onOpen: handleOpen,
  });

  const swipeActions = useMemo<SwipeAction[]>(
    () =>
      editable
        ? [
            {
              id: "edit",
              label: t("common.actions.edit"),
              icon: (color) => <PencilIcon size={20} color={color} />,
              variant: "primary",
              onPress: handleEdit,
            },
            {
              id: "delete",
              label: t("common.actions.delete"),
              icon: (color) => <BinIcon size={20} color={color} />,
              variant: "destructive",
              onPress: handleDelete,
            },
          ]
        : [],
    [editable, t, handleEdit, handleDelete],
  );

  const hasLoad = totalVolume > 0 || totalReps > 0;

  const tertiary = hasLoad
    ? t("workout.card.volume") +
      " " +
      String(totalVolume) +
      "kg \u00b7 " +
      t("workout.card.reps") +
      " " +
      String(totalReps)
    : undefined;

  return (
    <HistorySwipeable
      enabled={editable}
      id={"workout-" + String(workout.workoutId ?? workout.date)}
      rightActions={swipeActions}
    >
      <HistoryCard
        icon={(color) => <WorkoutIcon size={18} color={color} />}
        tone="brand"
        eyebrow={t("workout.card.workout")}
        title={formattedDate}
        preview={preview}
        meta={[
          String(exerciseCount) + " " + t("workout.list.exercises"),
          t("workout.list.sets_x", { sets: totalSets }),
        ]}
        tertiary={tertiary}
        trailing={
          actions.onLongPress ? (
            <HistoryCardMenu
              onPress={actions.onLongPress}
              accessibilityLabel={t("workout.card.more_options")}
            />
          ) : null
        }
        onPress={actions.onPress}
        onLongPress={actions.onLongPress}
        accessibilityLabel={`${formattedDate}, ${exerciseCount} ${t(
          "workout.list.exercises",
        )}, ${t("workout.list.sets_x", { sets: totalSets })}`}
        accessibilityHint={t("workout.list.view_details")}
        accessibilityActions={actions.accessibilityActions}
        onAccessibilityAction={actions.onAccessibilityAction}
      />
    </HistorySwipeable>
  );
});
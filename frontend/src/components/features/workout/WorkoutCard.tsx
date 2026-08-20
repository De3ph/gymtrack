"use client";

import { memo } from "react";
import { formatDate } from "@/lib/i18n/dayjs";
import {
  Edit2,
  Trash2,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Dumbbell,
} from "lucide-react";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Workout, WorkoutExercise, ExerciseSet } from "@/types";
import { TARGET_TYPES } from "@/lib/constants";

const CommentThread = dynamic(
  () =>
    import("@/components/features/comments/CommentThread").then(
      (m) => m.CommentThread,
    ),
  { ssr: false, loading: () => <Skeleton className="h-12 w-full" /> },
);

interface WorkoutCardProps {
  workout: Workout;
  readOnly?: boolean;
  canEdit: (workout: Workout) => boolean;
  onEdit: (workout: Workout) => void;
  onDelete: (workout: Workout) => void;
  expandedCommentsId: string | number | null;
  setExpandedCommentsId: (id: string | number | null) => void;
}

export const WorkoutCard = memo(function WorkoutCardImpl({
  workout,
  readOnly = false,
  canEdit,
  onEdit,
  onDelete,
  expandedCommentsId,
  setExpandedCommentsId,
}: WorkoutCardProps) {
  const t = useTranslations("workout.list");

  return (
    <div key={workout.workoutId}>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex flex-col">
            <CardTitle className="text-base font-semibold">
              {formatDate(workout.date, "MMMM D, YYYY")}
            </CardTitle>
            <CardDescription>
              {workout.exercises.length} {t("exercises")}
            </CardDescription>
          </div>
          {!readOnly && (
            <div className="flex space-x-2">
              {canEdit(workout) && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(workout)}
                    aria-label={t("edit")}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(workout)}
                    aria-label={t("delete")}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {workout.exercises.map((ex: WorkoutExercise, i: number) => (
              <div key={i} className="flex items-center text-sm">
                <Dumbbell className="mr-2 h-4 w-4 text-muted-foreground" />
                <span className="font-medium mr-2">{ex.name}:</span>
                <span className="text-muted-foreground">
                  {ex.sets && ex.sets.length > 0 ? (
                    <>
                      {t("sets_x", { sets: ex.sets.length })}{" "}
                      {ex.sets
                        .map((set: ExerciseSet) =>
                          t("set_detail", {
                            reps: set.reps,
                            weight: set.weight,
                            unit: set.weightUnit || "kg",
                          }),
                        )
                        .join(", ")}
                    </>
                  ) : (
                    t("no_sets")
                  )}
                </span>
              </div>
            ))}
          </div>
          <div className="border-t pt-3">
            <button
              type="button"
              className="w-full justify-start text-muted-foreground flex items-center hover:bg-accent/50 rounded-md px-2 py-2 transition-colors"
              onClick={() =>
                setExpandedCommentsId(
                  expandedCommentsId === workout.workoutId
                    ? null
                    : workout.workoutId,
                )
              }
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              {t("comments")}
              {expandedCommentsId === workout.workoutId ? (
                <ChevronUp className="ml-auto h-4 w-4" />
              ) : (
                <ChevronDown className="ml-auto h-4 w-4" />
              )}
            </button>
            {expandedCommentsId === workout.workoutId && (
              <div className="mt-3 overflow-hidden">
                <CommentThread
                  targetType={TARGET_TYPES.WORKOUT}
                  targetId={workout.workoutId}
                  readOnly={false}
                  enabled={true}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
});
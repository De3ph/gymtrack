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

import { Button, buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Workout, WorkoutExercise, ExerciseSet } from "@/types";
import { TARGET_TYPES } from "@/lib/constants";
import { cn } from "@/lib/utils";

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
    <article className="border border-border">
      <header className="flex flex-row items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex flex-col">
          <h3 className="text-base font-medium text-foreground">
            {formatDate(workout.date, "MMMM D, YYYY")}
          </h3>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {workout.exercises.length} {t("exercises")}
          </span>
        </div>
        {!readOnly && canEdit(workout) && (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onEdit(workout)}
              aria-label={t("edit")}
              className="rounded-none"
            >
              <Edit2 className="size-4" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onDelete(workout)}
              aria-label={t("delete")}
              className="rounded-none text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </Button>
          </div>
        )}
      </header>

      <div className="space-y-2 px-4 py-3 sm:px-6 sm:py-4">
        {workout.exercises.map((ex: WorkoutExercise, i: number) => (
          <div key={i} className="flex items-start gap-2 text-sm">
            <Dumbbell
              className="mt-0.5 size-4 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <span className="font-medium text-foreground">{ex.name}:</span>{" "}
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
          </div>
        ))}
      </div>

      <Separator />

      <div className="px-4 sm:px-6">
        <button
          type="button"
          className={cn(
            buttonVariants({ variant: "ghost" }),
            "w-full justify-between rounded-none px-2 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground",
          )}
          onClick={() =>
            setExpandedCommentsId(
              expandedCommentsId === workout.workoutId
                ? null
                : workout.workoutId,
            )
          }
        >
          <span className="flex items-center gap-2">
            <MessageSquare className="size-3.5" aria-hidden="true" />
            {t("comments")}
          </span>
          {expandedCommentsId === workout.workoutId ? (
            <ChevronUp className="size-4" aria-hidden="true" />
          ) : (
            <ChevronDown className="size-4" aria-hidden="true" />
          )}
        </button>
        {expandedCommentsId === workout.workoutId && (
          <div className="border-t border-border py-3">
            <CommentThread
              targetType={TARGET_TYPES.WORKOUT}
              targetId={workout.workoutId}
              readOnly={false}
              enabled={true}
            />
          </div>
        )}
      </div>
    </article>
  );
});

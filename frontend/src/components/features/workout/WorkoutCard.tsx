"use client";

import { memo } from "react";
import { formatDate } from "@/lib/i18n/dayjs";
import { MessageSquare, ChevronDown, ChevronUp } from "lucide-react";
import {
  AnimatePresence,
  motion,
  type Transition,
  useReducedMotion,
} from "motion/react";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";

import { buttonVariants } from "@/components/ui/button";
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
  isCollapsed: boolean;
  onToggle: () => void;
  expandedCommentsId: string | number | null;
  setExpandedCommentsId: (id: string | number | null) => void;
}

export const WorkoutCard = memo(function WorkoutCardImpl({
  workout,
  isCollapsed,
  onToggle,
  expandedCommentsId,
  setExpandedCommentsId,
}: WorkoutCardProps) {
  const t = useTranslations("workout.list");
  const reduce = useReducedMotion();
  const collapseTransition: Transition = reduce
    ? { duration: 0 }
    : { duration: 0.2, ease: [0.23, 1, 0.32, 1] };

  return (
    <article className="border border-border">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={!isCollapsed}
        aria-controls={`workout-card-body-${workout.workoutId}`}
        aria-label={isCollapsed ? "Expand workout" : "Collapse workout"}
        className={cn(
          "flex w-full flex-row items-center justify-between gap-3 rounded-none px-4 py-3 text-left transition-colors outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 sm:px-6 sm:py-4",
        )}
      >
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-base font-semibold text-foreground">
            {formatDate(workout.date, "MMMM D, YYYY")}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {workout.exercises.length} {t("exercises")}
          </span>
        </div>
        <motion.span
          className="flex shrink-0 text-muted-foreground"
          animate={{ rotate: isCollapsed ? 0 : 180 }}
          transition={collapseTransition}
        >
          <ChevronDown className="size-4" aria-hidden="true" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            key="body"
            id={`workout-card-body-${workout.workoutId}`}
            className="overflow-hidden border-t border-border"
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduce ? undefined : { height: 0, opacity: 0 }}
            transition={collapseTransition}
          >
          <div className="space-y-3 px-4 py-3 sm:px-6 sm:py-4">
            {workout.exercises.map((ex: WorkoutExercise, i: number) => (
              <div key={i} className="space-y-1.5">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
                  <span className="font-semibold text-foreground">
                    {ex.name}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    {t("sets_x", { sets: ex.sets?.length ?? 0 })}
                  </span>
                </div>
                {ex.sets && ex.sets.length > 0 ? (
                  <ul className="flex flex-wrap gap-2">
                    {ex.sets.map((set: ExerciseSet, s: number) => (
                      <li
                        key={set.setId ?? s}
                        className="flex items-baseline gap-1.5 border border-border px-2.5 py-1 font-mono text-xs tabular-nums text-foreground"
                      >
                        <span className="text-[10px] text-muted-foreground">
                          {String(s + 1).padStart(2, "0")}
                        </span>
                        {t("set_detail", {
                          reps: set.reps,
                          weight: set.weight,
                          unit: set.weightUnit || "kg",
                        })}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {t("no_sets")}
                  </p>
                )}
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
                <MessageSquare className="size-4" aria-hidden="true" />
                {t("comments")}
              </span>
              {expandedCommentsId === workout.workoutId ? (
                <ChevronUp className="size-4" aria-hidden="true" />
              ) : (
                <ChevronDown className="size-4" aria-hidden="true" />
              )}
            </button>
            {expandedCommentsId === workout.workoutId && (
              <div className="py-3">
                <CommentThread
                  targetType={TARGET_TYPES.WORKOUT}
                  targetId={workout.workoutId}
                  readOnly={false}
                  enabled={true}
                />
              </div>
            )}
          </div>
        </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
});

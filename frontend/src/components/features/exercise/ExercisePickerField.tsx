"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/skeleton";
import type { ExerciseLibrary } from "@/types";

/**
 * The exercise picker is lazy: it pulls in the catalog filters, the badge
 * components and the list animation, none of which are needed to render a
 * form. Loading it in one place keeps a single dynamic boundary for every
 * caller (log-workout rows and workout-plan rows) instead of a copy per form.
 */
const ExerciseSelector = dynamic(
  () =>
    import("./ExerciseSelector").then((module) => module.ExerciseSelector),
  { ssr: false, loading: () => <Skeleton className="h-9 w-28" /> },
);

interface ExercisePickerFieldProps {
  onSelect: (exercise: ExerciseLibrary) => void;
  /** Currently picked exercise, marked in the result list. */
  selectedExerciseId?: string | number;
  /** Current exercise name, shown on the trigger once one is picked. */
  selectedName?: string;
  disabled?: boolean;
  /** Controlled open state; see `ExerciseSelector`. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * Lazy exercise picker with a stable DOM hook.
 *
 * `data-exercise-selector` wraps the trigger so the forms can locate it when
 * scrolling to a row that was just added (see `ExerciseAutoScroll`), without
 * coupling that behaviour to the trigger's markup.
 */
export function ExercisePickerField({
  onSelect,
  selectedExerciseId,
  selectedName,
  disabled,
  open,
  onOpenChange,
}: ExercisePickerFieldProps) {
  return (
    <div data-exercise-selector>
      <ExerciseSelector
        onSelect={onSelect}
        selectedExerciseId={selectedExerciseId}
        selectedName={selectedName}
        disabled={disabled}
        open={open}
        onOpenChange={onOpenChange}
      />
    </div>
  );
}

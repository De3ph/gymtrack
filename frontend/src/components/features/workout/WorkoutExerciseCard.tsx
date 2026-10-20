"use client";

import dynamic from "next/dynamic";
import { memo, type ReactElement, type ReactNode } from "react";
import { ChevronDown, ChevronUp, GripVertical, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { FieldInfo } from "@/components/ui/form-field";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { SortableItemHandle } from "@/components/ui/sortable";

import { ExerciseSetInput } from "./ExerciseSetInput";
import type { ExerciseSet, WorkoutExercise } from "@/types";

const ExerciseSelector = dynamic(
  () =>
    import("@/components/features/exercise/ExerciseSelector").then(
      (m) => m.ExerciseSelector,
    ),
  { ssr: false, loading: () => <Skeleton className="h-9 w-28" /> },
);

/**
 * A row as the card sees it: the API shape plus the form's stable row id.
 *
 * The row id is the identity of the row - the array index is not, because a
 * reorder moves a row to another index - so every callback the card makes
 * carries it, and the card is keyed by it.
 */
export type CardExercise = WorkoutExercise & {
  exerciseId: string;
  rowId: string;
};

/**
 * The slice of the form api the card uses.
 *
 * `useForm` returns an extended api whose `Field` is a React component that
 * the core `FormApi` type does not describe, so the card declares the one
 * member it needs.
 */
export interface FormFieldHost {
  Field: (props: {
    name: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    children: (field: any) => ReactNode;
  }) => ReactElement | null;
}

interface WorkoutExerciseCardProps {
  /** The row this card shows. */
  exercise: CardExercise;
  /**
   * The row's position in the form's array.
   *
   * The form addresses array rows by index - that is how the field paths are
   * built - but the index is not an identity: a reorder moves the row to
   * another index while the row itself stays the same.
   */
  index: number;
  /** The form api, used to read and write the row's fields. */
  form: FormFieldHost;
  /** Whether the row's sets are hidden. */
  isCollapsed: boolean;
  /** Toggles the row's collapsed state. */
  onToggle: (rowId: string) => void;
  /**
   * Ref callback for the card's root element. The form uses these to scroll to
   * (and focus) a newly added exercise.
   */
  containerRef?: (node: HTMLElement | null) => void;
  /**
   * Controlled open state for this card's exercise picker dialog. The form
   * sets it right after adding an exercise so the picker opens automatically.
   */
  pickerOpen?: boolean;
  /** Notified when the picker dialog requests to open/close. */
  onPickerOpenChange?: (rowId: string, open: boolean) => void;
  /** Removes this row from the list. */
  onRemove?: (rowId: string) => void;
  /** Publishes the row's sets. */
  onSetsChange?: (rowId: string, sets: ExerciseSet[]) => void;
  /** Publishes the exercise picked for the row. */
  onExerciseSelect?: (
    rowId: string,
    selected: { exerciseId: number; name: string },
  ) => void;
}

/**
 * One exercise row of the log-workout form.
 *
 * Memoized on purpose: the form re-renders on every keystroke, and the rows
 * that did not change must not be re-rendered with it. That only holds while
 * every prop is either stable or the row's own data - the callbacks are
 * shared and carry the row id instead of being built per row.
 */
export const WorkoutExerciseCard = memo(function WorkoutExerciseCard({
  exercise,
  index,
  form,
  isCollapsed,
  onToggle,
  containerRef,
  pickerOpen,
  onPickerOpenChange,
  onRemove,
  onSetsChange,
  onExerciseSelect,
}: WorkoutExerciseCardProps) {
  const t = useTranslations("workout.form");
  const rowId = exercise.rowId;

  return (
    <article ref={containerRef} className="border border-border">
      <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <SortableItemHandle
            aria-label={t("exercise.reorder")}
            className="shrink-0 text-muted-foreground hover:text-foreground"
          >
            <GripVertical className="size-5" aria-hidden="true" />
          </SortableItemHandle>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => onToggle(rowId)}
            aria-label={isCollapsed ? t("expand_exercise") : t("collapse_exercise")}
            className="h-6 w-6 shrink-0 rounded-none"
          >
            {isCollapsed ? (
              <ChevronDown className="size-4" aria-hidden="true" />
            ) : (
              <ChevronUp className="size-4" aria-hidden="true" />
            )}
          </Button>
          <h3 className="truncate text-base font-semibold text-foreground">
            {exercise.name ||
              t("exercise.fallback_name", { number: index + 1 })}
          </h3>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => onRemove?.(rowId)}
          aria-label={t("exercise.sets.remove")}
          className="h-8 w-8 shrink-0 rounded-none text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="size-5" aria-hidden="true" />
        </Button>
      </header>

      <div className="space-y-4 px-4 py-3 sm:px-6 sm:py-4">
        <form.Field name={`exercises[${index}].exerciseId`}>
          {(subField) => (
            <Field>
              <ExerciseSelector
                selectedExerciseId={subField.state.value as string | number}
                open={pickerOpen}
                onOpenChange={(open) => onPickerOpenChange?.(rowId, open)}
                onSelect={(selected) =>
                  onExerciseSelect?.(rowId, {
                    exerciseId: selected.exerciseId,
                    name: selected.name,
                  })
                }
              />
              <FieldInfo field={subField} />
            </Field>
          )}
        </form.Field>
      </div>

      {!isCollapsed && (
        <>
          <Separator />
          <div className="px-4 py-3 sm:px-6 sm:py-4">
            <form.Field name={`exercises[${index}].sets`}>
              {(subField) => (
                <Field>
                  <ExerciseSetInput
                    value={subField.state.value}
                    onChange={(sets) => onSetsChange?.(rowId, sets)}
                  />
                  <FieldInfo field={subField} />
                </Field>
              )}
            </form.Field>
          </div>
        </>
      )}
    </article>
  );
});

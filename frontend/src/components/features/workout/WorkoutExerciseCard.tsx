"use client";

import dynamic from "next/dynamic";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { FieldInfo } from "@/components/ui/form-field";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

import { ExerciseSetInput } from "./ExerciseSetInput";
import type { ExerciseSet, WorkoutExercise } from "@/types";

const ExerciseSelector = dynamic(
  () =>
    import("@/components/features/exercise/ExerciseSelector").then(
      (m) => m.ExerciseSelector,
    ),
  { ssr: false, loading: () => <Skeleton className="h-9 w-28" /> },
);

export interface ExerciseArrayFieldApi {
  state: { value: WorkoutExercise[] };
  setValue: (
    updater:
      WorkoutExercise[] | ((prev: WorkoutExercise[]) => WorkoutExercise[]),
  ) => void;
  removeValue: (index: number) => void;
  pushValue: (value: WorkoutExercise) => void;
}

interface WorkoutExerciseCardProps {
  exercise: WorkoutExercise & { exerciseId: string };
  index: number;
  field: ExerciseArrayFieldApi;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: any;
  isCollapsed: boolean;
  onToggle: () => void;
}

export function WorkoutExerciseCard({
  exercise,
  index,
  field,
  form,
  isCollapsed,
  onToggle,
}: WorkoutExerciseCardProps) {
  const t = useTranslations("workout.form");

  const handleSetsChange = (sets: ExerciseSet[]) => {
    const newExercises = [...field.state.value];
    newExercises[index] = {
      ...newExercises[index],
      sets,
    };
    field.setValue(newExercises);
  };

  return (
    <article className="border border-border border-t-cyan-100">
      <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onToggle}
            aria-label={isCollapsed ? "Expand exercise" : "Collapse exercise"}
            className="h-6 w-6 shrink-0 rounded-none"
          >
            {isCollapsed ? (
              <ChevronDown className="size-4" aria-hidden="true" />
            ) : (
              <ChevronUp className="size-4" aria-hidden="true" />
            )}
          </Button>
          <h3 className="truncate text-base font-medium text-foreground">
            {exercise.name ||
              t("exercise.fallback_name", { number: index + 1 })}
          </h3>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => field.removeValue(index)}
          aria-label={t("exercise.sets.remove")}
          className="h-8 w-8 shrink-0 rounded-none text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </Button>
      </header>

      <div className="space-y-4 px-4 py-3 sm:px-6 sm:py-4">
        <form.Field name={`exercises[${index}].exerciseId`}>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {(subField: any) => (
            <Field>
              <ExerciseSelector
                selectedExerciseId={subField.state.value as string | number}
                onSelect={(selected) => {
                  field.setValue((prev) => {
                    const newExercises = [...prev];
                    newExercises[index] = {
                      ...newExercises[index],
                      exerciseId: String(
                        selected.exerciseId,
                      ) as unknown as number,
                      name: selected.name,
                    } as WorkoutExercise;
                    return newExercises;
                  });
                }}
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
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {(subField: any) => (
                <Field>
                  <ExerciseSetInput
                    value={subField.state.value}
                    onChange={(sets) => handleSetsChange(sets)}
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
}

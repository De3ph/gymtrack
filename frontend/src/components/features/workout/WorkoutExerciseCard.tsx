"use client";

import dynamic from "next/dynamic";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { FieldInfo } from "@/components/ui/form-field";
import { Skeleton } from "@/components/ui/skeleton";

import { ExerciseSetInput } from "./ExerciseSetInput";
import type { ExerciseSet, WorkoutExercise } from "@/types";

const ExerciseSelector = dynamic(
  () =>
    import("@/components/features/exercise/ExerciseSelector").then(
      (m) => m.ExerciseSelector,
    ),
  { ssr: false, loading: () => <Skeleton className="h-9 w-28" /> },
);

/** Structural subset of the TanStack Form array-field API used by this card. */
export interface ExerciseArrayFieldApi {
  state: { value: WorkoutExercise[] };
  setValue: (
    updater: WorkoutExercise[] | ((prev: WorkoutExercise[]) => WorkoutExercise[]),
  ) => void;
  removeValue: (index: number) => void;
  pushValue: (value: WorkoutExercise) => void;
}

interface WorkoutExerciseCardProps {
  exercise: WorkoutExercise & { exerciseId: string };
  index: number;
  field: ExerciseArrayFieldApi;
  // TanStack Form instance – typed as any to avoid deep generic coupling
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
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={onToggle}
              aria-label={isCollapsed ? "Expand exercise" : "Collapse exercise"}
            >
              {isCollapsed ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </Button>
            <CardTitle className="text-lg font-bold truncate">
              {exercise.name || t("exercise.fallback_name", { number: index + 1 })}
            </CardTitle>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => field.removeValue(index)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-2">
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
                        exerciseId: String(selected.exerciseId) as unknown as number,
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
      </CardHeader>
      {!isCollapsed && (
        <CardContent className="space-y-4">
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
        </CardContent>
      )}
    </Card>
  );
}

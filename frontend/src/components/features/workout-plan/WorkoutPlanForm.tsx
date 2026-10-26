"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  GripVertical,
  Loader2,
  Plus,
  Trash2,
  Dumbbell,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Sortable,
  SortableItem,
  SortableItemHandle,
} from "@/components/ui/sortable";

import { PlanSetInput } from "./PlanSetInput";
import { WorkoutPlan, WorkoutPlanExercise, WorkoutPlanSet } from "@/types";
import { workoutPlanApi } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import { ApiErrorHandler } from "@/lib/error-handler";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { revalidateWorkoutPlansCache } from "@/lib/actions/cache";
import { ExerciseAutoScroll } from "@/components/features/exercise/ExerciseAutoScroll";
import { ExercisePickerField } from "@/components/features/exercise/ExercisePickerField";

interface WorkoutPlanFormProps {
  onSuccess?: () => void;
  plan?: WorkoutPlan;
  namespace?: "trainer.workout_plans" | "athlete.workout_plans";
}

/**
 * Stable per-row id for an exercise.
 *
 * The exercise array is reorderable, so the array index is not a stable
 * identity — after a drag the same index points at a different exercise. Each
 * row carries a `rowId` that survives reordering and is used as its React key
 * and ref key. It is never sent to the API: the payload is rebuilt from
 * explicit fields on submit.
 */
let rowIdCounter = 0;
const nextRowId = () => `plan-ex-${rowIdCounter++}`;

type PlanExerciseRow = WorkoutPlanExercise & { rowId: string };

const withRowId = (exercise: WorkoutPlanExercise): PlanExerciseRow => ({
  ...exercise,
  rowId: nextRowId(),
});

const createDefaultExercise = (): PlanExerciseRow => ({
  exerciseId: 0,
  rowId: nextRowId(),
  name: "",
  sets: [{ setType: "working", weight: 0, weightUnit: "kg", reps: 10, restTime: 60 }],
  notes: "",
  order: 0,
});

export function WorkoutPlanForm({
  onSuccess,
  plan,
  namespace,
}: WorkoutPlanFormProps) {
  const queryClient = useQueryClient();
  const t = useTranslations(namespace ?? "trainer.workout_plans");

  const [name, setName] = useState(plan?.name || "");
  const [description, setDescription] = useState(plan?.description || "");
  const [exercises, setExercises] = useState<PlanExerciseRow[]>(() =>
    plan?.exercises ? plan.exercises.map(withRowId) : [createDefaultExercise()],
  );

  /** Exercise card root elements, keyed by rowId — used to scroll to a new one. */
  const exerciseCardRefs = useRef<Map<string, HTMLElement>>(new Map());
  /** Row id awaiting scroll+focus, set when "Add Exercise" is clicked. */
  const [pendingScrollRowId, setPendingScrollRowId] = useState<string | null>(
    null,
  );
  /**
   * The row whose exercise picker is open, or null when none is. Adding a row
   * opens that row's picker straight away, mirroring the log-workout form.
   *
   * Tracked by row id, not by index: a reorder moves a row to another index,
   * and an index would then point the picker at another row.
   */
  const [pickerRowId, setPickerRowId] = useState<string | null>(null);
  const pickerOpen = pickerRowId !== null;

  const isEditing = !!plan;

  const totalSets = exercises.reduce((sum, ex) => sum + ex.sets.length, 0);

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const data = {
        name,
        description,
        // Rebuilt explicitly so the row-only `rowId` never reaches the API.
        exercises: exercises.map((ex, i) => ({
          exerciseId: ex.exerciseId,
          name: ex.name,
          sets: ex.sets,
          notes: ex.notes,
          order: i,
        })),
      };
      if (plan) {
        return workoutPlanApi.update(plan.planId, data);
      }
      return workoutPlanApi.create(data);
    },
    onSuccess: async () => {
      await revalidateWorkoutPlansCache();
      await queryClient.invalidateQueries({ queryKey: qk.plans.all });
      setName("");
      setDescription("");
      setExercises([createDefaultExercise()]);
      setPendingScrollRowId(null);
      setPickerRowId(null);
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      ApiErrorHandler.handle(error);
    },
  });

  const handleExerciseSelect = (
    selected: { exerciseId: string | number; name: string },
    index: number,
  ) => {
    const newExercises = [...exercises];
    newExercises[index] = {
      ...newExercises[index],
      exerciseId: Number(selected.exerciseId),
      name: selected.name,
    };
    setExercises(newExercises);
  };

  const handleSetsChange = (sets: WorkoutPlanSet[], index: number) => {
    const newExercises = [...exercises];
    newExercises[index] = { ...newExercises[index], sets };
    setExercises(newExercises);
  };

  const removeExercise = (index: number) => {
    const removed = exercises[index];
    const newExercises = exercises.filter((_, i) => i !== index);
    setExercises(
      newExercises.length ? newExercises : [createDefaultExercise()],
    );
    // Close the picker if it belonged to the row that just went away.
    setPickerRowId((current) => (current === removed?.rowId ? null : current));
  };

  const addExercise = () => {
    const exercise = createDefaultExercise();
    setPendingScrollRowId(exercise.rowId);
    setExercises((prev) => [...prev, exercise]);
    // Auto-open the picker of the freshly added exercise.
    setPickerRowId(exercise.rowId);
  };

  const handlePickerOpenChange = (rowId: string, open: boolean) => {
    setPickerRowId(open ? rowId : null);
  };

  /** A drag reorders the rows, so the picker is closed to not point at a row. */
  const handleDragStart = () => {
    setPickerRowId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Hero — plan identity */}
      <div className="">
        <div
          className="absolute inset-y-0 left-0 w-0.5 bg-primary"
          aria-hidden
        />
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("plan_name")}
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("exercise_name_placeholder")}
              required
              className="h-11 border-transparent bg-muted/40 px-3 text-base font-semibold focus-visible:border-primary/60 focus-visible:bg-background"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("description_label")}
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("description_placeholder")}
              className="min-h-16 border-transparent bg-muted/40 px-3 focus-visible:border-primary/60 focus-visible:bg-background"
            />
          </div>
        </div>
      </div>

      {/* Exercises section */}
      <div className="space-y-6">
        <ExerciseAutoScroll
          pendingId={pendingScrollRowId}
          resolveCard={(rowId) => exerciseCardRefs.current.get(rowId)}
          onDone={() => setPendingScrollRowId(null)}
          focusSelector="[data-exercise-selector] button"
          focusEnabled={!pickerOpen}
        />
        <Sortable
          value={exercises}
          onValueChange={setExercises}
          getItemValue={(exercise) => exercise.rowId}
          onDragStart={handleDragStart}
        >
          {exercises.map((exercise, index) => (
            <SortableItem
              key={exercise.rowId}
              value={exercise.rowId}
              className="bg-background"
            >
              <div
                ref={(node) => {
                  if (node) exerciseCardRefs.current.set(exercise.rowId, node);
                  else exerciseCardRefs.current.delete(exercise.rowId);
                }}
                className="group relative overflow-hidden rounded-md border bg-card shadow-xs transition-colors hover:border-primary/40"
              >
                {/* Index chip + accent */}
                <div className="flex items-center justify-between gap-3 border-b bg-muted/30 px-4 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <SortableItemHandle
                      aria-label={t("reorder")}
                      className="shrink-0 text-muted-foreground hover:text-foreground"
                    >
                      <GripVertical className="size-5" aria-hidden="true" />
                    </SortableItemHandle>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 font-mono text-sm font-semibold tabular-nums text-primary">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="truncate font-semibold">
                      {exercise.name ||
                        t("fallback_exercise_name", { index: index + 1 })}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => removeExercise(index)}
                    disabled={exercises.length === 1}
                  >
                    <Trash2 className="size-5" />
                  </Button>
                </div>

                <div className="space-y-6 p-4">
                  <ExercisePickerField
                    selectedExerciseId={exercise.exerciseId}
                    selectedName={exercise.name}
                    open={pickerRowId === exercise.rowId}
                    onOpenChange={(open) =>
                      handlePickerOpenChange(exercise.rowId, open)
                    }
                    onSelect={(selected) =>
                      handleExerciseSelect(
                        {
                          exerciseId: selected.exerciseId,
                          name: selected.name,
                        },
                        index,
                      )
                    }
                  />

                  <PlanSetInput
                    value={exercise.sets}
                    onChange={(sets) => handleSetsChange(sets, index)}
                  />

                  <Separator />

                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {t("notes_placeholder")}
                    </label>
                    <Input
                      value={exercise.notes || ""}
                      onChange={(e) => {
                        const newExercises = [...exercises];
                        newExercises[index] = {
                          ...newExercises[index],
                          notes: e.target.value,
                        };
                        setExercises(newExercises);
                      }}
                      placeholder={t("notes_placeholder")}
                      className="text-sm"
                    />
                  </div>
                </div>
              </div>
            </SortableItem>
          ))}
        </Sortable>

        <Button
          type="button"
          variant="outline"
          onClick={addExercise}
          className="w-full border-dashed py-6 bg-background text-foreground hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
        >
          <Plus className="mr-2 size-5" /> {t("add_exercise")}
        </Button>
      </div>

      {/* Sticky action bar */}
      <div className="sticky bottom-0 -mx-6 -mb-6 border-t bg-popover/95 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-popover/80">
        <div className="flex items-center justify-between gap-4">
          <div className="text-md text-foreground sm:block">
            {exercises.length} {t("exercises").toLowerCase()} · {totalSets}{" "}
            {totalSets === 1 ? "set" : "sets"}
          </div>
          <Button type="submit" disabled={isPending} className="min-w-40 gap-2">
            {isPending ? (
              <Loader2 className="size-5 animate-spin" />
            ) : isEditing ? (
              <Save className="size-5" />
            ) : (
              <Dumbbell className="size-5" />
            )}
            {isEditing ? t("plan_update") : t("plan_create")}
          </Button>
        </div>
      </div>
    </form>
  );
}

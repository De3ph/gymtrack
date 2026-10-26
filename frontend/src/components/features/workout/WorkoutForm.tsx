"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, Plus } from "lucide-react";
import { useForm } from "@tanstack/react-form";
import { formatDate } from "@/lib/i18n/dayjs";
import { useState, useMemo, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import { FieldError } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectValue,
  SelectTrigger,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Separator } from "@/components/ui/separator";
import { Sortable, SortableItem } from "@/components/ui/sortable";
import { ExerciseAutoScroll } from "@/components/features/exercise/ExerciseAutoScroll";
import { workoutApi, workoutPlanApi } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import {
  Workout,
  WorkoutExercise,
  ExerciseSet,
  WorkoutPlan,
  SetType,
} from "@/types";
import {
  createWorkoutWithPerSetSchema,
  WorkoutWithPerSetFormData,
} from "@/lib/validations/workout";
import { combineDateTime } from "@/lib/utils/datetime";
import { ApiErrorHandler } from "@/lib/error-handler";
import { useTranslations } from "next-intl";
import {
  WorkoutExerciseCard,
  type CardExercise,
  type FormFieldHost,
} from "./WorkoutExerciseCard";

interface WorkoutFormProps {
  onSuccess?: () => void;
  onClear?: () => void;
  workout?: Workout;
  /**
   * Workout plan seeded from `?planId=`. Mapping it here (instead of
   * fabricating a Workout with `new Date()` timestamps in the RSC) keeps the
   * server output deterministic — the form already owns "now" for a new
   * workout.
   */
  plan?: WorkoutPlan;
  /**
   * Name of the plan this workout was preloaded from, when it arrived via
   * `?planId=`. Seeds the inline "loaded from X" hint, which the server-side
   * seeding path would otherwise never set. The load toast is fired by
   * WorkoutsClient, which — unlike this form — survives tab switches.
   */
  loadedPlanName?: string | null;
}

/**
 * Stable per-row id for an exercise.
 *
 * The exercise array is reorderable, so array index is not a stable identity —
 * after a drag the same index points at a different exercise. Each row carries
 * a `rowId` that survives reordering, and all index-keyed UI state (collapse
 * state, card refs) is keyed off it instead. It is not sent to the API:
 * `formatExercisesForApi` rebuilds each exercise from explicit fields.
 */
let rowIdCounter = 0;
const nextRowId = () => `ex-${rowIdCounter++}`;

type FormExercise = Omit<WorkoutExercise, "exerciseId"> & {
  exerciseId: string;
  rowId: string;
};

const createDefaultExercise = (): FormExercise => ({
  exerciseId: String(0),
  rowId: nextRowId(),
  name: "",
  sets: [
    {
      setType: "working" as const,
      weight: 0,
      weightUnit: "kg" as const,
      reps: 10,
      restTime: 60,
      completed: false,
    } as ExerciseSet,
  ],
});

const formatExercisesForApi = (exercises: WorkoutExercise[]) => {
  return exercises.map((exercise) => ({
    exerciseId: Number(exercise.exerciseId) || 0,
    name: exercise.name,
    sets: exercise.sets.map((set) => ({
      setId: set.setId ?? undefined,
      setType: set.setType || "working",
      weight: set.weight,
      weightUnit: set.weightUnit,
      reps: set.reps,
      restTime: set.restTime || 60,
      completed: false,
    })),
  }));
};

type LoadedPlanExercise = {
  exerciseId: string;
  rowId: string;
  name: string;
  notes?: string;
  sets: {
    setId?: string;
    setType?: SetType;
    weight: number;
    weightUnit: "kg" | "lbs";
    reps: number;
    restTime: number;
    completed: boolean;
  }[];
};

const planExerciseToWorkoutExercise = (
  pe: WorkoutPlan["exercises"][number],
): LoadedPlanExercise => ({
  exerciseId: String(pe.exerciseId),
  rowId: nextRowId(),
  name: pe.name,
  notes: pe.notes,
  sets: pe.sets.map((ps) => ({
    setId: ps.setId != null ? String(ps.setId) : undefined,
    setType: ps.setType || "working",
    weight: ps.weight,
    weightUnit: ps.weightUnit,
    reps: ps.reps,
    restTime: ps.restTime,
    completed: false,
  })),
});

export function WorkoutForm({
  onSuccess,
  onClear,
  workout: initialWorkout,
  plan: initialPlan,
  loadedPlanName: initialPlanName,
}: WorkoutFormProps) {
  const queryClient = useQueryClient();
  const t = useTranslations("workout.form");
  const tValidation = useTranslations("workout.form.validation");
  const tCommon = useTranslations("common.actions");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const workoutWithPerSetSchema = useMemo(
    () => createWorkoutWithPerSetSchema((key) => tValidation(key)),
    [tValidation],
  );

  /**
   * The values the form starts with.
   *
   * They are built once, and that matters: the form compares its defaults on
   * every render and rewrites its values when they changed. A fresh
   * `new Date()` and a fresh set of rows on every render would therefore
   * replace the values - and re-render every row - whenever anything else in
   * the form changed.
   */
  const defaultValues = useMemo(
    () => ({
      date: initialWorkout?.date ? new Date(initialWorkout.date) : new Date(),
      workoutTime: initialWorkout?.date
        ? formatDate(new Date(initialWorkout.date), "HH:mm")
        : formatDate(new Date(), "HH:mm"),
      exercises: initialWorkout?.exercises
        ? initialWorkout.exercises.map((ex) => ({
            ...ex,
            rowId: nextRowId(),
            exerciseId: String(ex.exerciseId),
            sets: ex.sets.map((s) => ({ ...s, setId: s.setId ?? undefined })),
          }))
        : initialPlan?.exercises
          ? initialPlan.exercises.map(planExerciseToWorkoutExercise)
          : [{ ...createDefaultExercise(), exerciseId: String(0) }],
    }),
    [initialWorkout, initialPlan],
  );

  const form = useForm({
    defaultValues,
    validators: {
      onSubmit: workoutWithPerSetSchema,
    },
    onSubmit: async ({ value }) => {
      setSubmitError(null);
      createWorkout(value as WorkoutWithPerSetFormData);
    },
    onSubmitInvalid: ({ formApi }) => {
      const fieldMeta = formApi.state.fieldMeta;
      const errors = Object.values(fieldMeta ?? {})
        .flatMap((meta) => meta?.errors ?? [])
        .filter(Boolean);
      const messages = errors
        .map((e) => (typeof e === "string" ? e : e.message))
        .filter(Boolean);
      if (messages.length > 0) {
        setSubmitError(messages.join(". "));
      }
    },
  });

  const { mutate: createWorkout, isPending } = useMutation({
    mutationFn: async (data: WorkoutWithPerSetFormData) => {
      const combinedDate = combineDateTime(data.date, data.workoutTime);
      const exercises = formatExercisesForApi(
        data.exercises as unknown as WorkoutExercise[],
      );

      return workoutApi.create({
        date: combinedDate,
        exercises: exercises,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.workouts.all });
      form.reset();
      setPickerRowId(null);
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      const errorMessage = ApiErrorHandler.handle(error);
      setSubmitError(errorMessage);
      console.error("Failed to log workout:", errorMessage);
    },
  });

  /**
   * Collapse state per exercise, keyed by `rowId` rather than array index —
   * after a reorder the same index refers to a different exercise, so index
   * keys would leave the wrong cards collapsed.
   */
  const [collapsedMap, setCollapsedMap] = useState<Record<string, boolean>>({});
  const toggleCollapsed = useCallback(
    (rowId: string) => {
      setCollapsedMap((prev) => ({ ...prev, [rowId]: !prev[rowId] }));
    },
    [setCollapsedMap],
  );

  /** Exercise card root elements, by index — used to scroll to a new one. */
  const exerciseCardRefs = useRef<Array<HTMLElement | null>>([]);
  const exerciseCardRefCallbacks = useRef<
    Array<((n: HTMLElement | null) => void) | undefined>
  >([]);
  /** Index awaiting scroll+focus, set when "Add exercise" is clicked. */
  const [pendingScrollIndex, setPendingScrollIndex] = useState<number | null>(
    null,
  );
  /**
   * The row whose exercise picker dialog is open, or null when none is. When
   * "Add exercise" is clicked we push the new row and immediately open that
   * row's exercise picker so the user can pick an exercise straight away.
   *
   * The row is tracked by its id, not by its index: a reorder moves a row to
   * another index, and an index would then point the picker at another row.
   */
  const [pickerRowId, setPickerRowId] = useState<string | null>(null);
  const pickerOpen = pickerRowId !== null;

  // Cached per index so React doesn't detach/reattach refs on every render.
  const setExerciseCardRef = useCallback((index: number) => {
    let cb = exerciseCardRefCallbacks.current[index];
    if (!cb) {
      cb = (node: HTMLElement | null) => {
        exerciseCardRefs.current[index] = node;
      };
      exerciseCardRefCallbacks.current[index] = cb;
    }
    return cb;
  }, []);

  const { data: ownPlansData } = useQuery({
    queryKey: qk.plans.own,
    queryFn: () => workoutPlanApi.getAll(),
  });
  const { data: assignedPlansData } = useQuery({
    queryKey: qk.plans.assigned,
    queryFn: () => workoutPlanApi.getMyPlans(),
  });
  const plans = useMemo(() => {
    const seen = new Set<number>();
    const merged: WorkoutPlan[] = [];
    for (const plan of [
      ...(ownPlansData?.plans ?? []),
      ...(assignedPlansData?.plans ?? []),
    ]) {
      if (!seen.has(plan.planId)) {
        seen.add(plan.planId);
        merged.push(plan);
      }
    }
    return merged;
  }, [ownPlansData, assignedPlansData]);

  const seededPlanId = initialWorkout?.planId ?? initialPlan?.planId;
  const [selectedPlanId, setSelectedPlanId] = useState<string>(
    seededPlanId != null ? String(seededPlanId) : "",
  );
  const [loadedPlanName, setLoadedPlanName] = useState<string | null>(
    initialPlanName ?? null,
  );

  const handleLoadPlan = (plan: WorkoutPlan) => {
    form.setFieldValue(
      "exercises",
      plan.exercises.map(planExerciseToWorkoutExercise),
    );
    setCollapsedMap({});
    setSelectedPlanId(String(plan.planId));
    setLoadedPlanName(plan.name);
    setPickerRowId(null);
  };

  /**
   * Writes the row list into the form.
   *
   * The form's array type is the union of the shapes the rows can start as
   * (a saved workout, a plan, a blank row), so the list is written through
   * the updater: the cast then targets the field's own type instead of
   * guessing it.
   */
  const setExercises = useCallback(
    (exercises: FormExercise[]) => {
      form.setFieldValue(
        "exercises",
        (_prev) => exercises as unknown as typeof _prev,
      );
    },
    [form],
  );

  /** Replaces one row, leaving the other rows untouched. */
  const updateExercise = useCallback(
    (rowId: string, update: (exercise: FormExercise) => FormExercise) => {
      form.setFieldValue("exercises", (prev) => {
        const exercises = prev as unknown as FormExercise[];
        const index = exercises.findIndex((ex) => ex.rowId === rowId);
        if (index === -1) return prev;
        const next = [...exercises];
        next[index] = update(exercises[index]);
        return next as unknown as typeof prev;
      });
    },
    [form],
  );

  const handleSetsChange = useCallback(
    (rowId: string, sets: ExerciseSet[]) => {
      updateExercise(rowId, (exercise) => ({ ...exercise, sets }));
    },
    [updateExercise],
  );

  const handleExerciseSelect = useCallback(
    (rowId: string, selected: { exerciseId: number; name: string }) => {
      updateExercise(rowId, (exercise) => ({
        ...exercise,
        exerciseId: String(selected.exerciseId),
        name: selected.name,
      }));
    },
    [updateExercise],
  );

  /** Removes a row and closes the picker that belonged to it. */
  const removeExercise = useCallback(
    (rowId: string) => {
      form.setFieldValue("exercises", (prev) => {
        const exercises = prev as unknown as FormExercise[];
        return exercises.filter(
          (ex) => ex.rowId !== rowId,
        ) as unknown as typeof prev;
      });
      setPickerRowId((current) => (current === rowId ? null : current));
    },
    [form],
  );

  const handlePickerOpenChange = useCallback((rowId: string, open: boolean) => {
    setPickerRowId(open ? rowId : null);
  }, []);

  /** A drag reorders the rows, so the picker is closed to not point at a row. */
  const handleDragStart = useCallback(() => {
    setPickerRowId(null);
  }, []);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    form.handleSubmit();
  };

  return (
    <form
      onSubmit={handleFormSubmit}
      className="max-h-[80vh] space-y-6 overflow-y-auto"
    >
      {submitError && (
        <div
          role="alert"
          className="border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          {submitError}
        </div>
      )}

      <Field>
        <div className="flex flex-wrap gap-3">
          <form.Field name="date">
            {(field) => (
              <DatePicker
                value={field.state.value}
                onChange={(d) => {
                  if (d) field.handleChange(d);
                }}
                onBlur={field.handleBlur}
                id="date"
                className="w-full md:w-[180px]"
                required
              />
            )}
          </form.Field>
          <form.Field name="workoutTime">
            {(field) => (
              <Input
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                type="time"
                id="workoutTime"
                data-testid="workout-time"
                className="w-full md:w-[120px]"
              />
            )}
          </form.Field>
        </div>
        <FieldError
          errors={
            form.state.fieldMeta.date?.errors?.map((e) => ({
              message: typeof e === "string" ? e : e.message,
            })) as Array<{ message?: string } | undefined> | undefined
          }
        />
      </Field>

      <Separator />

      <Field>
        <FieldLabel className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {t("plan.label")}
        </FieldLabel>
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={selectedPlanId}
            onValueChange={(value) => {
              const plan = plans.find((p) => String(p.planId) === value);
              if (plan) handleLoadPlan(plan);
            }}
          >
            <SelectTrigger className="w-full rounded-none shadow-none md:w-72">
              <SelectValue>
                {plans.find((p) => String(p.planId) === selectedPlanId)?.name}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="rounded-none border border-border shadow-none ring-0">
              {plans.length === 0 ? (
                <div className="px-2 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {t("plan.empty")}
                </div>
              ) : (
                plans.map((plan) => (
                  <SelectItem
                    key={plan.planId}
                    value={String(plan.planId)}
                    className="rounded-none font-mono text-[10px] uppercase tracking-[0.18em]"
                  >
                    {plan.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {loadedPlanName && (
            <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              <ClipboardList className="size-5" aria-hidden="true" />
              {t("plan.loaded", { name: loadedPlanName })}
            </span>
          )}
        </div>
      </Field>

      <Separator />

      <form.Field name="exercises" mode="array">
        {(field) => {
          const exercises = field.state.value as unknown as FormExercise[];
          return (
            <div className="space-y-4">
              {/*
                Inside the field render prop on purpose: this is the reactive
                boundary that re-runs whenever the exercise array grows.
              */}
              <ExerciseAutoScroll
                pendingId={pendingScrollIndex}
                resolveCard={(index) => exerciseCardRefs.current[index]}
                onDone={() => setPendingScrollIndex(null)}
                focusEnabled={!pickerOpen}
              />
              <Sortable
                value={exercises}
                onValueChange={(next) => setExercises(next)}
                getItemValue={(exercise) => exercise.rowId}
                onDragStart={handleDragStart}
              >
                {exercises.map((exercise, index) => (
                  <SortableItem
                    key={exercise.rowId}
                    value={exercise.rowId}
                    className="bg-background"
                  >
                    <WorkoutExerciseCard
                      exercise={exercise as unknown as CardExercise}
                      index={index}
                      form={form as unknown as FormFieldHost}
                      isCollapsed={!!collapsedMap[exercise.rowId]}
                      onToggle={toggleCollapsed}
                      containerRef={setExerciseCardRef(index)}
                      pickerOpen={pickerRowId === exercise.rowId}
                      onPickerOpenChange={handlePickerOpenChange}
                      onRemove={removeExercise}
                      onSetsChange={handleSetsChange}
                      onExerciseSelect={handleExerciseSelect}
                    />
                  </SortableItem>
                ))}
              </Sortable>
              <Button
                type="button"
                onClick={() => {
                  const newIndex = exercises.length;
                  const exercise = createDefaultExercise();
                  setPendingScrollIndex(newIndex);
                  form.setFieldValue("exercises", (prev) => {
                    const list = prev as unknown as FormExercise[];
                    return [...list, exercise] as unknown as typeof prev;
                  });
                  // Auto-open the picker of the freshly added exercise.
                  setPickerRowId(exercise.rowId);
                }}
                variant="outline"
                className="w-full rounded-none font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
              >
                <Plus className="size-5" aria-hidden="true" />{" "}
                {t("add_exercise")}
              </Button>
            </div>
          );
        }}
      </form.Field>

      <Separator />

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            form.reset();
            setPickerRowId(null);
            onClear?.();
          }}
          className="w-full rounded-none font-mono text-[10px] uppercase tracking-[0.18em] md:w-auto"
        >
          {tCommon("clear")}
        </Button>
        <Button
          type="submit"
          disabled={isPending}
          className="w-full rounded-none font-mono text-[10px] uppercase tracking-[0.18em] md:ml-auto md:w-auto"
        >
          {isPending ? (
            <>
              <Spinner className="size-5" />
              {t("submitting")}
            </>
          ) : (
            t("submit")
          )}
        </Button>
      </div>
    </form>
  );
}

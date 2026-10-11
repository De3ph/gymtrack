"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, Plus } from "lucide-react";
import { useForm } from "@tanstack/react-form";
import { formatDate } from "@/lib/i18n/dayjs";
import { useState, useMemo, useRef, useEffect, useCallback } from "react";
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
import { workoutApi, workoutPlanApi } from "@/lib/api";
import { Workout, WorkoutExercise, ExerciseSet, WorkoutPlan } from "@/types";
import {
  createWorkoutWithPerSetSchema,
  WorkoutWithPerSetFormData,
} from "@/lib/validations/workout";
import { combineDateTime } from "@/lib/utils/datetime";
import { ApiErrorHandler } from "@/lib/error-handler";
import { useTranslations } from "next-intl";
import {
  WorkoutExerciseCard,
  type ExerciseArrayFieldApi,
} from "./WorkoutExerciseCard";

interface WorkoutFormProps {
  onSuccess?: () => void;
  onClear?: () => void;
  workout?: Workout;
  /**
   * Name of the plan this workout was preloaded from, when it arrived via
   * `?planId=`. Seeds the inline "loaded from X" hint, which the server-side
   * seeding path would otherwise never set. The load toast is fired by
   * WorkoutsClient, which — unlike this form — survives tab switches.
   */
  loadedPlanName?: string | null;
}

const createDefaultExercise = (): WorkoutExercise => ({
  exerciseId: 0,
  name: "",
  sets: [
    {
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
  name: string;
  notes?: string;
  sets: {
    setId?: string;
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
  name: pe.name,
  notes: pe.notes,
  sets: pe.sets.map((ps) => ({
    setId: ps.setId != null ? String(ps.setId) : undefined,
    weight: ps.weight,
    weightUnit: ps.weightUnit,
    reps: ps.reps,
    restTime: ps.restTime,
    completed: false,
  })),
});

/**
 * Scrolls a newly added exercise into view and focuses its search input.
 *
 * Split out of `WorkoutForm` on purpose: `form.state` is a plain getter, not a
 * store subscription, so reading the exercise count in `WorkoutForm`'s body
 * would never re-render it and an effect there could never observe the array
 * growing. This component is rendered *inside* the `Field` render prop (a real
 * reactive boundary), so it re-renders whenever the array changes and the
 * effect fires on every add.
 */
function ExerciseAutoScroll({
  pendingIndex,
  cardRefs,
  onDone,
}: {
  /** Index to scroll to, or null when there's nothing pending. */
  pendingIndex: number | null;
  cardRefs: React.MutableRefObject<Array<HTMLElement | null>>;
  onDone: () => void;
}) {
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  });

  /**
   * The search input lives inside a client-only dynamic import, so it may not
   * be mounted yet on the first attempt — hence the short retry loop.
   */
  const focusExerciseCard = useCallback(
    (index: number) => {
      const card = cardRefs.current[index];
      if (!card) {
        onDoneRef.current();
        return;
      }

      card.scrollIntoView({ behavior: "smooth", block: "center" });

      const tryFocus = (attempt: number) => {
        const input = card.querySelector<HTMLInputElement>(
          "input:not([type='hidden'])",
        );
        if (input) {
          input.focus({ preventScroll: true });
          onDoneRef.current();
          return;
        }
        if (attempt < 10) {
          requestAnimationFrame(() => tryFocus(attempt + 1));
        } else {
          // Give up on the input but still treat the card as handled.
          onDoneRef.current();
        }
      };

      tryFocus(0);
    },
    [cardRefs],
  );

  useEffect(() => {
    if (pendingIndex == null) return;

    const card = cardRefs.current[pendingIndex];
    if (!card) {
      // Ref not attached yet — retry on the next frame.
      const raf = requestAnimationFrame(() => focusExerciseCard(pendingIndex));
      return () => cancelAnimationFrame(raf);
    }

    focusExerciseCard(pendingIndex);
  }, [pendingIndex, cardRefs, focusExerciseCard]);

  return null;
}

export function WorkoutForm({
  onSuccess,
  onClear,
  workout: initialWorkout,
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

  const form = useForm({
    defaultValues: {
      date: initialWorkout?.date ? new Date(initialWorkout.date) : new Date(),
      workoutTime: initialWorkout?.date
        ? formatDate(new Date(initialWorkout.date), "HH:mm")
        : formatDate(new Date(), "HH:mm"),
      exercises: initialWorkout?.exercises
        ? initialWorkout.exercises.map((ex) => ({
            ...ex,
            exerciseId: String(ex.exerciseId),
            sets: ex.sets.map((s) => ({ ...s, setId: s.setId ?? undefined })),
          }))
        : [{ ...createDefaultExercise(), exerciseId: String(0) }],
    },
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
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
      form.reset();
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      const errorMessage = ApiErrorHandler.handle(error);
      setSubmitError(errorMessage);
      console.error("Failed to log workout:", errorMessage);
    },
  });

  const [collapsedMap, setCollapsedMap] = useState<Record<number, boolean>>({});
  const toggleCollapsed = (index: number) => {
    setCollapsedMap((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  /** Exercise card root elements, by index — used to scroll to a new one. */
  const exerciseCardRefs = useRef<Array<HTMLElement | null>>([]);
  const exerciseCardRefCallbacks = useRef<
    Array<((n: HTMLElement | null) => void) | undefined>
  >([]);
  /** Index awaiting scroll+focus, set when "Add exercise" is clicked. */
  const [pendingScrollIndex, setPendingScrollIndex] = useState<number | null>(
    null,
  );

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
    queryKey: ["workout-plans"],
    queryFn: () => workoutPlanApi.getAll(),
  });
  const { data: assignedPlansData } = useQuery({
    queryKey: ["my-workout-plans"],
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

  const [selectedPlanId, setSelectedPlanId] = useState<string>(
    initialWorkout?.planId != null ? String(initialWorkout.planId) : "",
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
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    form.handleSubmit();
  };

  return (
    <form onSubmit={handleFormSubmit} className="space-y-6">
      {submitError && (
        <div
          role="alert"
          className="border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          {submitError}
        </div>
      )}

      <Field>
        <FieldLabel
          htmlFor="date"
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground"
        >
          {t("date.label")}
        </FieldLabel>
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
          const arrayField = field as unknown as ExerciseArrayFieldApi;
          return (
            <div className="space-y-4">
              <ExerciseAutoScroll
                pendingIndex={pendingScrollIndex}
                cardRefs={exerciseCardRefs}
                onDone={() => setPendingScrollIndex(null)}
              />
              {field.state.value.map((exercise, index) => (
                <WorkoutExerciseCard
                  key={`${exercise.exerciseId || "new"}-${index}`}
                  exercise={
                    exercise as unknown as WorkoutExercise & {
                      exerciseId: string;
                    }
                  }
                  index={index}
                  field={arrayField}
                  form={form}
                  isCollapsed={!!collapsedMap[index]}
                  onToggle={() => toggleCollapsed(index)}
                  containerRef={setExerciseCardRef(index)}
                />
              ))}
              <Button
                type="button"
                onClick={() => {
                  setPendingScrollIndex(arrayField.state.value.length);
                  arrayField.pushValue(
                    createDefaultExercise() as unknown as WorkoutExercise,
                  );
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

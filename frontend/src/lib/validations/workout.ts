import { z } from "zod";

type ValidationTranslator = (key: string) => string;

// ===== PER-SET TRACKING VALIDATION =====
const createExerciseSetSchema = (t: ValidationTranslator) =>
  z.object({
    weight: z.number().min(0, t("weight_non_negative")),
    weightUnit: z.enum(["kg", "lbs"]),
    reps: z.number().int().min(1, t("reps_min_one")),
    restTime: z.number().int().min(0, t("rest_time_non_negative")).optional(),
    completed: z.boolean().optional(),
  });

const createWorkoutExerciseSchema = (t: ValidationTranslator) =>
  z.object({
    exerciseId: z.string().min(1, t("exercise_selection_required")),
    name: z.string().min(1, t("exercise_name_required")),
    notes: z.string().optional(),
    sets: z
      .array(createExerciseSetSchema(t))
      .min(1, t("sets_min_one")),
  });

export const createWorkoutWithPerSetSchema = (t: ValidationTranslator) =>
  z.object({
    date: z.date(),
    workoutTime: z
      .string()
      .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, t("invalid_time_format")),
    exercises: z
      .array(createWorkoutExerciseSchema(t))
      .min(1, t("exercises_min_one")),
  });

export type WorkoutWithPerSetFormData = z.infer<
  ReturnType<typeof createWorkoutWithPerSetSchema>
>;

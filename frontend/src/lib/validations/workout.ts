import { z } from "zod";

type ValidationTranslator = (key: string) => string;

// ===== LEGACY VALIDATION (for backward compatibility) =====
export const exerciseSchema = z.object({
  name: z.string().min(1, "Exercise name is required"),
  weight: z.number().min(0, "Weight must be positive"),
  weightUnit: z.enum(["kg", "lbs"]),
  sets: z.number().int().min(1, "Must have at least 1 set"),
  reps: z
    .array(z.number().int().min(1, "Reps must be at least 1"))
    .min(1, "At least one set of reps is required"),
  restTime: z.number().int().min(0, "Rest time cannot be negative"),
});

export const workoutSchema = z.object({
  date: z.date(),
  workoutTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
  exercises: z
    .array(exerciseSchema)
    .min(1, "At least one exercise is required"),
});

export type ExerciseFormData = z.infer<typeof exerciseSchema>;
export type WorkoutFormData = z.infer<typeof workoutSchema>;

// ===== PHASE 4: PER-SET TRACKING VALIDATION =====
export const createExerciseSetSchema = (t: ValidationTranslator) =>
  z.object({
    weight: z.number().min(0, t("weight_non_negative")),
    weightUnit: z.enum(["kg", "lbs"]),
    reps: z.number().int().min(1, t("reps_min_one")),
    restTime: z.number().int().min(0, t("rest_time_non_negative")).optional(),
    completed: z.boolean().optional(),
  });

export const createWorkoutExerciseSchema = (t: ValidationTranslator) =>
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

export type ExerciseSetFormData = z.infer<
  ReturnType<typeof createExerciseSetSchema>
>;
export type WorkoutExerciseFormData = z.infer<
  ReturnType<typeof createWorkoutExerciseSchema>
>;
export type WorkoutWithPerSetFormData = z.infer<
  ReturnType<typeof createWorkoutWithPerSetSchema>
>;

import { z } from "zod";

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
export const exerciseSetSchema = z.object({
  weight: z.number().min(0, "Weight must be positive"),
  weightUnit: z.enum(["kg", "lbs"]),
  reps: z.number().int().min(1, "Reps must be at least 1"),
  restTime: z.number().int().min(0, "Rest time cannot be negative").optional(),
  completed: z.boolean().optional(),
});

export const workoutExerciseSchema = z.object({
  exerciseId: z.string().min(1, "Exercise selection is required"),
  name: z.string().min(1, "Exercise name is required"),
  notes: z.string().optional(),
  sets: z
    .array(exerciseSetSchema)
    .min(1, "At least one set is required"),
});

export const workoutWithPerSetSchema = z.object({
  date: z.date(),
  workoutTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
  exercises: z
    .array(workoutExerciseSchema)
    .min(1, "At least one exercise is required"),
});

export type ExerciseSetFormData = z.infer<typeof exerciseSetSchema>;
export type WorkoutExerciseFormData = z.infer<typeof workoutExerciseSchema>;
export type WorkoutWithPerSetFormData = z.infer<typeof workoutWithPerSetSchema>;

import { z } from "zod";

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

import { z } from "zod";

export const workoutPlanSetSchema = z.object({
  weight: z.number().min(0, "Weight must be positive"),
  weightUnit: z.enum(["kg", "lbs"]),
  reps: z.number().int().min(1, "Reps must be at least 1"),
  restTime: z.number().int().min(0, "Rest time cannot be negative"),
});

export const workoutPlanExerciseSchema = z.object({
  exerciseId: z.string().min(1, "Exercise selection is required"),
  name: z.string().min(1, "Exercise name is required"),
  sets: z
    .array(workoutPlanSetSchema)
    .min(1, "At least one set is required"),
  notes: z.string().optional(),
  order: z.number().int().min(0).optional(),
});

export const workoutPlanSchema = z.object({
  name: z.string().min(1, "Plan name is required"),
  description: z.string().optional(),
  exercises: z
    .array(workoutPlanExerciseSchema)
    .min(1, "At least one exercise is required"),
});

export type WorkoutPlanFormData = z.infer<typeof workoutPlanSchema>;

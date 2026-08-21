// Re-export generated API types from openapi-typescript
// Run: pnpm codegen:types
import type { components } from "./generated";

// User (matches GET /api/users/me and login response user field)
export type User = components["schemas"]["handlers.UserResponse"];

// Register response
export type RegisterResponse = { message: string; userId: number };

// Login response
export type LoginResponse = { message: string; accessToken: string; refreshToken: string; user: User };

// Profile
export type UserProfile = components["schemas"]["models.UserProfile"];
export type UserRole = components["schemas"]["models.UserRole"];

// Models
export type Workout = components["schemas"]["models.Workout"];
export type WorkoutExercise = components["schemas"]["models.WorkoutExercise"];
export type ExerciseSet = components["schemas"]["models.ExerciseSet"];
export type Meal = components["schemas"]["models.Meal"];
export type MealItem = components["schemas"]["models.FoodItem"];
export type BodyMeasurement = components["schemas"]["models.BodyMeasurement"];
export type Comment = components["schemas"]["models.Comment"];
export type Exercise = components["schemas"]["models.Exercise"];
export type TrainerAvailability = components["schemas"]["models.TrainerAvailability"];
export type Relationship = components["schemas"]["models.Relationship"];
export type TrainerReview = components["schemas"]["models.TrainerReview"];
// CoachingRequest is not in the generated types, using the request type instead
export type CoachingRequest = components["schemas"]["handlers.CreateCoachingRequestRequest"] & {
  requestId?: number;
  athleteId?: number;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
};

// WorkoutPlan is not in the generated types, so we define it manually
export interface WorkoutPlan {
  type?: string; // Always "workout_plan"
  planId?: number;
  creatorId: number;
  name: string;
  description?: string;
  exercises: WorkoutPlanExercise[];
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkoutPlanExercise {
  exerciseId: number;
  name: string;
  sets: WorkoutPlanSet[];
  notes?: string;
  order: number;
}

export interface WorkoutPlanSet {
  setId?: string;
  weight: number;
  weightUnit: string;
  reps: number;
  restTime: number; // in seconds
}

// List response wrappers
export interface WorkoutListResponse {
  workouts: Workout[];
  count: number;
}

export interface MealListResponse {
  meals: Meal[];
  count: number;
}

// Mobile-specific UI types
export type ToastPosition = "top" | "bottom";

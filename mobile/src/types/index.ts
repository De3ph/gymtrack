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

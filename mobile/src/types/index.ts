// Run: pnpm codegen:types
import type { components } from "./generated";

// User (matches GET /api/users/me and login response user field)
export type User = components["schemas"]["handlers.UserResponse"];

export type RegisterResponse = { message: string; userId: number };

export type LoginResponse = { message: string; accessToken: string; refreshToken: string; user: User };

export type UserProfile = components["schemas"]["models.UserProfile"];
export type UserRole = components["schemas"]["models.UserRole"];

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

export type MuscleGroup = components["schemas"]["models.MuscleGroupDefinition"];
export type Equipment = components["schemas"]["models.EquipmentDefinition"];

export type ExerciseMediaType = "gif" | "video" | "image";

/**
 * Exercise catalog entry with populated relations (UI convenience).
 * Mirrors frontend `ExerciseLibrary` in `frontend/src/types/index.ts`: the
 * backend rows carry only foreign keys, so screens resolve labels once via
 * lookup Maps rather than per-card scans.
 */
export interface ExerciseLibrary {
  exerciseId: number;
  name: string;
  category?: string;
  muscleGroupId?: number;
  equipmentId?: number;
  instructions?: string;
  createdBy?: number;
  createdAt?: string;
  isVerified?: boolean;
  muscleGroup?: MuscleGroup;
  equipment?: Equipment;
  /**
   * Absolute https URL of a demonstration asset. Absent or empty means the
   * exercise has no media and the UI renders a placeholder tile.
   */
  mediaUrl?: string;
  /** Renderer hint for `mediaUrl`. Absent means `gif`. */
  mediaType?: ExerciseMediaType;
}
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

export interface WorkoutListResponse {
  workouts: Workout[];
  count: number;
}

export interface MealListResponse {
  meals: Meal[];
  count: number;
}

/**
 * GymTrack Frontend Types
 *
 * API model types are auto-generated from the Go backend via openapi-typescript.
 * This file re-exports them under the names expected by 66+ consumer files,
 * and defines UI-only types that don't exist in the API spec.
 */

import type { components } from "./generated";

// ============================================================
// Re-exported API types (source of truth: backend/docs/swagger.json)
// ============================================================

// --- Enums ---
export type UserRole = components["schemas"]["models.UserRole"];
export type UserStatus = components["schemas"]["models.UserStatus"];
export type WeightUnit = components["schemas"]["models.WeightUnit"];
export type MealType = components["schemas"]["models.MealType"];
export type RelationshipStatus = components["schemas"]["models.RelationshipStatus"];
export type CommentTargetType = components["schemas"]["models.TargetType"];
export type CommentAuthorRole = components["schemas"]["models.AuthorRole"];

// --- Domain models ---
export type Workout = components["schemas"]["models.Workout"];
export type WorkoutExercise = components["schemas"]["models.WorkoutExercise"];
export type ExerciseSet = components["schemas"]["models.ExerciseSet"];
export type Meal = components["schemas"]["models.Meal"];
export type FoodItem = components["schemas"]["models.FoodItem"];
export type Macros = components["schemas"]["models.Macros"];
export type User = components["schemas"]["models.User"];
export type UserProfile = components["schemas"]["models.UserProfile"];
export type Relationship = components["schemas"]["models.Relationship"];
export type Comment = components["schemas"]["models.Comment"];
export type TrainerProfile = components["schemas"]["models.TrainerProfile"];
export type TrainerAvailability = components["schemas"]["models.TrainerAvailability"];
export type TrainerReview = components["schemas"]["models.TrainerReview"];

// TrainerWithProfile uses a manual definition because the generated type has a
// different structure: generated nests trainer fields under `profile`, but the
// frontend code accesses `trainerProfile` and flattens user fields.
export interface TrainerWithProfile {
  userId: number;
  email: string;
  role: UserRole;
  profile: UserProfile;
  createdAt: string;
  updatedAt: string;
  trainerProfile: TrainerProfile;
  averageRating?: number;
  reviewCount?: number;
}

export type BodyMeasurement = components["schemas"]["models.BodyMeasurement"];
export type BodyMeasurementPart = components["schemas"]["models.BodyMeasurementPart"];

// Aliases for backend names that differ from frontend convention
export type MuscleGroup = components["schemas"]["models.MuscleGroupDefinition"];
export type Equipment = components["schemas"]["models.EquipmentDefinition"];

// --- Request types ---
export type CreateWorkoutRequest = components["schemas"]["handlers.CreateWorkoutRequest"];
export type UpdateWorkoutRequest = components["schemas"]["handlers.UpdateWorkoutRequest"];
export type CreateMealRequest = components["schemas"]["handlers.CreateMealRequest"];
export type UpdateMealRequest = components["schemas"]["handlers.UpdateMealRequest"];
export type LoginRequest = components["schemas"]["handlers.LoginRequest"];
export type RegisterRequest = components["schemas"]["handlers.RegisterRequest"];
export type UpdateProfileRequest = components["schemas"]["handlers.UpdateProfileRequest"];
export type CreateCommentRequest = components["schemas"]["handlers.CreateCommentRequest"];
export type UpdateCommentRequest = components["schemas"]["handlers.UpdateCommentRequest"];
export type CreateExerciseRequest = components["schemas"]["handlers.CreateExerciseRequest"];
export type CreateBodyMeasurementRequest = components["schemas"]["handlers.CreateBodyMeasurementRequest"];
export type UpdateBodyMeasurementRequest = components["schemas"]["handlers.UpdateBodyMeasurementRequest"];

// --- Response / handler types ---
export type UserResponse = components["schemas"]["handlers.UserResponse"];
export type ClientStats = components["schemas"]["handlers.ClientStats"];
export type GetClientDetailsResponse = components["schemas"]["handlers.GetClientDetailsResponse"];
export type GetClientStatsResponse = components["schemas"]["handlers.GetClientStatsResponse"];

// WorkoutStats and MealStats use manual definitions because the generated types
// mark all fields as optional, but consumer code (chart components) expects required fields.
export interface WorkoutStats {
  totalVolume: number;
  weeklyVolume: { week: string; volume: number; workouts: number }[];
  exerciseBreakdown: { name: string; totalSets: number; totalReps: number; maxWeight: number }[];
  consistency: number;
}

export interface MealStats {
  averageCalories: number;
  averageProtein: number;
  averageCarbs: number;
  averageFats: number;
  weeklyAverages: { week: string; calories: number; protein: number; carbs: number; fats: number }[];
  mealTypeBreakdown: { mealType: string; count: number }[];
}

// Ad-hoc response wrappers (not in swagger — used by API client modules)
export interface RegisterResponse {
  message: string;
  userId: number;
}

export interface LoginResponse {
  message: string;
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface WorkoutListResponse {
  workouts: Workout[];
  count: number;
}

export interface MealListResponse {
  meals: Meal[];
  count: number;
}

export interface ClientListResponse {
  clients: Relationship[];
  count: number;
}

export interface CommentListResponse {
  comments: Comment[];
}

export interface BodyMeasurementListResponse {
  measurements: BodyMeasurement[];
  count: number;
}

// --- Admin types ---
// AdminUserListItem and AdminComment use manual definitions because the
// generated types have different field types (number | undefined vs string).
export interface AdminUserListItem {
  userId: string;
  username: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  profile: UserProfile;
  createdAt: string;
  updatedAt: string;
}

export type AdminUserListResponse = components["schemas"]["handlers.AdminUserListResponse"];
export type AdminDashboardStats = components["schemas"]["services.DashboardStats"];

export interface AdminComment {
  commentId: number;
  targetType: string;
  targetId: number;
  authorId: number;
  authorRole: string;
  content: string;
  parentCommentId?: number | null;
  createdAt: string;
  editedAt?: string | null;
}

// ============================================================
// UI-only types (not in API spec)
// ============================================================

/** Flattened exercise type used in workout forms (UI convenience). */
export interface Exercise {
  exerciseId?: number;
  name: string;
  weight: number;
  weightUnit: WeightUnit;
  sets: number;
  reps: number[];
  restTime: number; // in seconds
}

/** Client-side auth state (Zustand store shape). */
export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

/** Filters for trainer search/browse UI. */
export interface TrainerFilters {
  specialization?: string;
  location?: string;
  minRating?: number;
  availableForNewClients?: boolean;
}

/** Response shape for trainer search endpoint. */
export interface TrainerSearchResponse {
  trainers: TrainerWithProfile[];
  total: number;
  limit: number;
  offset: number;
}

// --- Coaching request types (not yet in swagger) ---

export type CoachingRequestStatus = "pending" | "accepted" | "rejected";

export interface CoachingRequest {
  requestId: number;
  athleteId: number;
  trainerId: number;
  message: string;
  status: CoachingRequestStatus;
  type: string;
  createdAt: string;
  updatedAt: string;
}

export interface CoachingRequestWithDetails {
  requestId: number;
  athleteId: number;
  trainerId: number;
  message: string;
  status: CoachingRequestStatus;
  type: string;
  createdAt: string;
  updatedAt: string;
  athlete?: User;
  trainer?: User;
}

// --- Exercise library types (UI-enriched) ---

/** Exercise catalog entry with populated relations (UI convenience). */
export interface ExerciseLibrary {
  exerciseId: number;
  name: string;
  category: string;
  muscleGroupId: number;
  equipmentId: number;
  instructions?: string;
  createdBy?: number;
  createdAt: string;
  muscleGroup?: MuscleGroup;
  equipment?: Equipment;
}

export interface ExerciseListResponse {
  exercises: ExerciseLibrary[];
  count: number;
}

export interface MuscleGroupListResponse {
  muscleGroups: MuscleGroup[];
}

export interface EquipmentTypeListResponse {
  equipment: Equipment[];
}

export interface ExerciseSearchParams {
  query?: string;
  muscleGroupId?: number;
  equipmentId?: number;
  limit?: number;
  offset?: number;
}

// --- Workout plan types (not yet in swagger) ---

export interface WorkoutPlanSet {
  setId?: number;
  weight: number;
  weightUnit: WeightUnit;
  reps: number;
  restTime: number;
}

export interface WorkoutPlanExercise {
  exerciseId: number;
  name: string;
  sets: WorkoutPlanSet[];
  notes?: string;
  order: number;
}

export interface WorkoutPlan {
  planId: number;
  trainerId: number;
  name: string;
  description?: string;
  exercises: WorkoutPlanExercise[];
  status?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkoutPlanAssignment {
  assignmentId: number;
  planId: number;
  athleteId: number;
  trainerId: number;
  status: string;
  createdAt: string;
}

export interface CreateWorkoutPlanRequest {
  name: string;
  description?: string;
  exercises: WorkoutPlanExercise[];
}

export interface UpdateWorkoutPlanRequest {
  name: string;
  description?: string;
  exercises: WorkoutPlanExercise[];
}

export interface AssignPlanRequest {
  athleteIds: number[];
}

export interface WorkoutPlanListResponse {
  plans: WorkoutPlan[];
  count: number;
}

export interface AssignmentListResponse {
  assignments: WorkoutPlanAssignment[];
  count: number;
}

// --- Legacy per-set workout types (for migration) ---

export interface WorkoutWithPerSet {
  workoutId: number;
  athleteId: number;
  date: string;
  exercises: WorkoutExercise[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkoutWithPerSetRequest {
  date: string;
  exercises: WorkoutExercise[];
}

export interface UpdateWorkoutWithPerSetRequest {
  date: string;
  exercises: WorkoutExercise[];
}

// --- Body measurement UI types ---

/** String union of valid body part keys for measurement forms. */
export type BodyPartKey =
  | "chest"
  | "waist"
  | "hips"
  | "neck"
  | "shoulders"
  | "bicepLeft"
  | "bicepRight"
  | "forearmLeft"
  | "forearmRight"
  | "thighLeft"
  | "thighRight"
  | "calfLeft"
  | "calfRight";

// ============================================================
// Utility types (moved from api-types.ts)
// ============================================================

export interface PaginationParams {
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
}

export interface ApiResponse<T> {
  data: T;
}

export interface MessageResponse {
  message: string;
}

export interface DateRangeParams {
  startDate?: string;
  endDate?: string;
}

export interface PaginationOnlyParams {
  limit?: number;
  offset?: number;
}

export interface ListParams extends DateRangeParams, PaginationOnlyParams {}

export interface ClientListParams extends ListParams {
  clientId: string;
}

export interface ClientWithAthlete {
  relationship: Relationship;
  athlete: User;
}

export interface GenerateInvitationResponse {
  message: string;
  invitation: {
    code: string;
    expiresAt: string;
  };
}

export interface AcceptInvitationResponse {
  message: string;
  relationship: Relationship;
}

export interface GetMyTrainerResponse {
  pendingInvitations: Relationship[];
  activeTrainer?: {
    relationship: Relationship;
    trainer: User;
  };
}

export interface TerminateRelationshipResponse {
  message: string;
  relationship: Relationship;
}

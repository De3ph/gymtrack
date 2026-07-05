export type UserRole = "trainer" | "athlete" | "admin";

export type WeightUnit = "kg" | "lbs";

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export interface Exercise {
  exerciseId?: number;
  name: string;
  weight: number;
  weightUnit: WeightUnit;
  sets: number;
  reps: number[];
  restTime: number; // in seconds
}

export interface Workout {
  workoutId: number;
  athleteId: number;
  date: string;
  exercises: WorkoutExercise[];
  planId?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkoutRequest {
  date: string;
  exercises: WorkoutExercise[];
}

export interface UpdateWorkoutRequest {
  date: string;
  exercises: WorkoutExercise[];
}

export interface Macros {
  protein: number;
  carbs: number;
  fats: number;
}

export interface FoodItem {
  food: string;
  quantity: string;
  calories?: number;
  macros?: Macros;
}

export interface Meal {
  mealId: number;
  athleteId: number;
  date: string;
  mealType: MealType;
  items: FoodItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateMealRequest {
  date: string;
  mealType: MealType;
  items: FoodItem[];
}

export interface UpdateMealRequest {
  date: string;
  mealType: MealType;
  items: FoodItem[];
}

export interface UserProfile {
  name: string;
  age?: number;
  weight?: number;
  height?: number;
  fitnessGoals?: string;
  trainerAssignment?: number;
  certifications?: string;
  specializations?: string;
  clientList?: number[];
}

export interface User {
  userId: number;
  username: string;
  email: string;
  role: UserRole;
  profile: UserProfile;
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  role: UserRole;
  profile: UserProfile;
}

export interface UpdateProfileRequest {
  profile: UserProfile;
}

export type RelationshipStatus = "pending" | "active" | "terminated";

export interface Relationship {
  type: string;
  relationshipId: number;
  trainerId: number;
  athleteId: number;
  status: RelationshipStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ClientStats {
  workoutsThisWeek: number;
  mealsThisWeek: number;
}

export type CommentTargetType = "workout" | "meal";

export type CommentAuthorRole = "trainer" | "athlete" | "admin";

export interface Comment {
  type: string;
  commentId: number;
  targetType: CommentTargetType;
  targetId: number;
  authorId: number;
  authorRole: CommentAuthorRole;
  content: string;
  parentCommentId?: number | null;
  createdAt: string;
  editedAt?: string | null;
}

export interface CreateCommentRequest {
  targetType: CommentTargetType;
  targetId: number;
  content: string;
  parentCommentId?: number | null;
}

export interface UpdateCommentRequest {
  content: string;
}

export interface TrainerProfile {
  bio?: string;
  profilePhotoUrl?: string;
  hourlyRate?: number;
  yearsOfExperience?: number;
  isAvailableForNewClients?: boolean;
  location?: string;
  languages?: string[];
}

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

export interface TrainerAvailability {
  availabilityId: number;
  trainerId: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isBooked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TrainerReview {
  reviewId: number;
  trainerId: number;
  athleteId: number;
  rating: number;
  comment?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TrainerFilters {
  specialization?: string;
  location?: string;
  minRating?: number;
  availableForNewClients?: boolean;
}

export interface TrainerSearchResponse {
  trainers: TrainerWithProfile[];
  total: number;
  limit: number;
  offset: number;
}

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

// ===== PHASE 4: EXERCISE MANAGEMENT TYPES =====

// Lookup table types
export interface MuscleGroup {
  id: number;
  code: string;
  description: string;
}

export interface Equipment {
  id: number;
  code: string;
  description: string;
}

// Enhanced exercise types for per-set tracking
export interface ExerciseSet {
  setId?: number;
  weight: number;
  weightUnit: WeightUnit;
  reps: number;
  restTime?: number; // seconds
  completed?: boolean;
}

export interface WorkoutExercise {
  exerciseId: number;
  name: string;
  sets: ExerciseSet[];
  notes?: string;
}

// Exercise library types
export interface ExerciseLibrary {
  exerciseId: number;
  name: string;
  category: string;
  muscleGroupId: number;
  equipmentId: number;
  instructions?: string;
  createdBy?: number;
  createdAt: string;
  muscleGroup?: MuscleGroup; // populated by API
  equipment?: Equipment; // populated by API
}

// API response types for exercise endpoints
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

export interface CreateExerciseRequest {
  name: string;
  category: string;
  muscleGroupId: number;
  equipmentId: number;
  instructions?: string;
}

// ===== WORKOUT PLAN TYPES =====

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

// Updated workout types for new structure (for future migration)
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

// ===== BODY MEASUREMENTS TYPES =====

export interface BodyMeasurementPart {
  value: number;
}

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

export interface BodyMeasurement {
  measurementId: number;
  athleteId: number;
  date: string;
  weight: number;
  weightUnit: WeightUnit;
  bodyFatPct?: number;
  parts?: Record<string, BodyMeasurementPart>;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBodyMeasurementRequest {
  date: string;
  weight: number;
  weightUnit: WeightUnit;
  bodyFatPct?: number;
  parts?: Record<string, BodyMeasurementPart>;
  notes?: string;
}

export interface UpdateBodyMeasurementRequest {
  date: string;
  weight: number;
  weightUnit: WeightUnit;
  bodyFatPct?: number;
  parts?: Record<string, BodyMeasurementPart>;
  notes?: string;
}

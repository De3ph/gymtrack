export type UserRole = "trainer" | "athlete";

export type WeightUnit = "kg" | "lbs";

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export interface Exercise {
  exerciseId?: string;
  name: string;
  weight: number;
  weightUnit: WeightUnit;
  sets: number;
  reps: number[];
  restTime: number; // in seconds
}

export interface Workout {
  workoutId: string;
  athleteId: string;
  date: string;
  exercises: Exercise[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkoutRequest {
  date: string;
  exercises: Exercise[];
}

export interface UpdateWorkoutRequest {
  date: string;
  exercises: Exercise[];
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
  mealId: string;
  athleteId: string;
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
  trainerAssignment?: string;
  certifications?: string;
  specializations?: string;
  clientList?: string[];
}

export interface User {
  userId: string;
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
  email: string;
  password: string;
}

export interface RegisterRequest {
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
  relationshipId: string;
  trainerId: string;
  athleteId: string;
  status: RelationshipStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ClientStats {
  totalWorkouts: number;
  totalMeals: number;
  workoutsThisWeek: number;
  mealsThisWeek: number;
}

export type CommentTargetType = "workout" | "meal";

export type CommentAuthorRole = "trainer" | "athlete";

export interface Comment {
  type: string;
  commentId: string;
  targetType: CommentTargetType;
  targetId: string;
  authorId: string;
  authorRole: CommentAuthorRole;
  content: string;
  parentCommentId?: string | null;
  createdAt: string;
  editedAt?: string | null;
}

export interface CreateCommentRequest {
  targetType: CommentTargetType;
  targetId: string;
  content: string;
  parentCommentId?: string | null;
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
  userId: string;
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
  availabilityId: string;
  trainerId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isBooked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TrainerReview {
  reviewId: string;
  trainerId: string;
  athleteId: string;
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

/**
 * Common types used across API endpoints
 * Reduces code duplication and improves type safety
 */

/**
 * Standard pagination parameters for list endpoints
 */
export interface PaginationParams {
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

/**
 * Standard API response format for paginated data
 */
export interface PaginatedResponse<T> {
  data: T[];
  count: number;
}

/**
 * Workout list response (matches backend format)
 */
export interface WorkoutListResponse {
  workouts: import('@/types').Workout[];
  count: number;
}

/**
 * Meal list response (matches backend format)
 */
export interface MealListResponse {
  meals: import('@/types').Meal[];
  count: number;
}

/**
 * Client list response (matches backend format)
 */
export interface ClientListResponse {
  clients: import('@/types').Relationship[];
  count: number;
}

/**
 * Standard API response format for single item
 */
export interface ApiResponse<T> {
  data: T;
}

/**
 * Authentication responses
 */
export interface RegisterResponse {
  message: string;
  userId: string;
}

export interface LoginResponse {
  message: string;
  accessToken: string;
  refreshToken: string;
  user: import('@/types').User;
}

/**
 * User responses
 */
export interface UserResponse {
  userId: string;
  email: string;
  role: import('@/types').UserRole;
  profile: import('@/types').UserProfile;
  createdAt: string;
  updatedAt: string;
}

/**
 * Relationship responses
 */
export interface GenerateInvitationResponse {
  message: string;
  invitation: {
    code: string;
    expiresAt: string;
  };
}

export interface AcceptInvitationResponse {
  message: string;
  relationship: import('@/types').Relationship;
}

export interface GetMyTrainerResponse {
  pendingInvitations: import('@/types').Relationship[];
  activeTrainer?: {
    relationship: import('@/types').Relationship;
    trainer: import('@/types').User;
  };
}

export interface TerminateRelationshipResponse {
  message: string;
  relationship: import('@/types').Relationship;
}

/**
 * Standard API response format for messages
 */
export interface MessageResponse {
  message: string;
}

/**
 * Parameters for filtering by date range
 */
export interface DateRangeParams {
  startDate?: string;
  endDate?: string;
}

/**
 * Parameters for pagination
 */
export interface PaginationOnlyParams {
  limit?: number;
  offset?: number;
}

/**
 * Common workout/meal list parameters
 */
export interface ListParams extends DateRangeParams, PaginationOnlyParams { }

/**
 * Client-specific parameters (used by trainers)
 */
export interface ClientListParams extends ListParams {
  clientId: string;
}

/**
 * Client with athlete details (for trainer client list)
 */
export interface ClientWithAthlete {
  relationship: import('@/types').Relationship;
  athlete: import('@/types').User;
}

/**
 * Client stats for dashboard
 */
export interface ClientStats {
  totalWorkouts: number;
  totalMeals: number;
  workoutsThisWeek: number;
  mealsThisWeek: number;
}

/**
 * Response for getting client details
 */
export interface GetClientDetailsResponse {
  relationship: import('@/types').Relationship;
  athlete: import('@/types').User;
  stats: ClientStats;
}

/**
 * Workout stats for charts
 */
export interface WorkoutStats {
  totalVolume: number;
  weeklyVolume: { week: string; volume: number; workouts: number }[];
  exerciseBreakdown: { name: string; totalSets: number; totalReps: number; maxWeight: number }[];
  consistency: number;
}

/**
 * Meal stats for charts
 */
export interface MealStats {
  averageCalories: number;
  averageProtein: number;
  averageCarbs: number;
  averageFats: number;
  weeklyAverages: { week: string; calories: number; protein: number; carbs: number; fats: number }[];
  mealTypeBreakdown: { mealType: string; count: number }[];
}

/**
 * Response for getting client stats
 */
export interface GetClientStatsResponse {
  workoutStats: WorkoutStats;
  mealStats: MealStats;
}

/**
 * Comment list response (matches backend format)
 */
export interface CommentListResponse {
  comments: import('@/types').Comment[];
}

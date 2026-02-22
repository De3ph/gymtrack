import {
  AcceptInvitationResponse,
  CommentListResponse,
  GenerateInvitationResponse,
  GetClientDetailsResponse,
  GetClientStatsResponse,
  GetMyTrainerResponse,
  LoginResponse,
  MealListResponse,
  MessageResponse,
  PaginationParams,
  RegisterResponse,
  TerminateRelationshipResponse,
  UserResponse,
  WorkoutListResponse
} from "@/lib/api-types"
import { TokenService } from "@/lib/token-service"
import {
  Comment,
  CreateCommentRequest,
  CreateMealRequest,
  CreateWorkoutRequest,
  LoginRequest,
  Meal,
  RegisterRequest,
  UpdateCommentRequest,
  UpdateMealRequest,
  UpdateProfileRequest,
  UpdateWorkoutRequest,
  Workout
} from "@/types"

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api"

type FetchOptions = RequestInit & {
  params?: Record<string, unknown> | PaginationParams
  timeout?: number
}

async function request<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { params, headers, timeout, ...rest } = options

  const defaultHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...((headers as Record<string, string>) || {})
  }

  const authHeader = TokenService.getAuthHeader()
  if (authHeader) {
    defaultHeaders.Authorization = authHeader
  }

  let url = `${API_BASE_URL}${endpoint}`
  console.log('API Request URL:', url) // Debug log
  if (params) {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value))
      }
    })
    url += `?${searchParams.toString()}`
  }

  const controller = timeout !== undefined ? new AbortController() : undefined;
  const timeoutId = timeout !== undefined ? setTimeout(() => controller?.abort(), timeout) : undefined;

  const response = await fetch(url, {
    ...rest,
    headers: {
      ...defaultHeaders,
      ...(controller !== undefined && { 'X-Abbreviate': 'true' })
    },
    signal: controller?.signal
  })

  // Clear timeout immediately to prevent memory leaks
  if (controller) {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    let errorMessage = `HTTP error! status: ${response.status}`
    try {
      const errorData = await response.json()
      if (errorData && errorData.error) {
        errorMessage = errorData.error
      } else if (errorData && errorData.message) {
        errorMessage = errorData.message
      }
    } catch {
      // Ignored
    }

    throw new Error(errorMessage)
  }

  if (response.status === 204) {
    return {} as T
  }

  return response.json().catch(error => {
    // Re-throw abort errors with specific message
    if (error instanceof Error && error.message.includes('AbortError')) {
      throw new Error('Request timed out');
    }
    throw error;
  })
}

const api = {
  get: <T>(
    url: string,
    config?: { params?: Record<string, unknown> | PaginationParams } & FetchOptions
  ) => {
    return request<T>(url, { method: "GET", params: config?.params, ...config })
  },
  post: <T>(url: string, data: unknown, config?: FetchOptions) => {
    return request<T>(url, { method: "POST", body: JSON.stringify(data), ...config })
  },
  put: <T>(url: string, data: unknown, config?: FetchOptions) => {
    return request<T>(url, { method: "PUT", body: JSON.stringify(data), ...config })
  },
  delete: <T>(url: string, config?: FetchOptions) => {
    return request<T>(url, { method: "DELETE", ...config })
  }
}

// Auth API
export const authApi = {
  register: async (data: RegisterRequest) => {
    return api.post<RegisterResponse>("/auth/register", data)
  },

  login: async (data: LoginRequest) => {
    return api.post<LoginResponse>("/auth/login", data)
  },

  refreshToken: async (refreshToken: string) => {
    return api.post<{ message: string; accessToken: string }>("/auth/refresh", { refreshToken })
  },

  logout: async () => {
    return api.post<{ message: string }>("/auth/logout", {})
  }
}

// User API
export const userApi = {
  getCurrentUser: async () => {
    return api.get<UserResponse>("/users/me")
  },

  updateCurrentUser: async (data: UpdateProfileRequest) => {
    return api.put<UserResponse>("/users/me", data)
  }
}

// Workout API
export const workoutApi = {
  create: async (data: CreateWorkoutRequest) => {
    return api.post<Workout>("/workouts", data)
  },

  getAll: async (params?: PaginationParams) => {
    return api.get<WorkoutListResponse>("/workouts", {
      params
    })
  },

  getById: async (id: string) => {
    return api.get<Workout>(`/workouts/${id}`)
  },

  update: async (id: string, data: UpdateWorkoutRequest) => {
    return api.put<Workout>(`/workouts/${id}`, data)
  },

  delete: async (id: string) => {
    return api.delete<MessageResponse>(`/workouts/${id}`)
  }
}

// Meal API
export const mealApi = {
  create: async (data: CreateMealRequest) => {
    return api.post<Meal>("/meals", data)
  },

  getAll: async (params?: PaginationParams) => {
    return api.get<MealListResponse>("/meals", {
      params
    })
  },

  getById: async (id: string) => {
    return api.get<Meal>(`/meals/${id}`)
  },

  update: async (id: string, data: UpdateMealRequest) => {
    return api.put<Meal>(`/meals/${id}`, data)
  },

  delete: async (id: string) => {
    return api.delete<MessageResponse>(`/meals/${id}`)
  },

  // Get meals by specific date
  getByDate: async (date: string, config?: FetchOptions) => {
    return api.get<MealListResponse>("/meals", {
      params: { date },
      ...config
    })
  },

  // Trainer view
  getClientMeals: async (clientId: string, params?: PaginationParams) => {
    return api.get<MealListResponse>(`/clients/${clientId}/meals`, {
      params
    })
  }
}

// Comment API
export const commentApi = {
  getByTarget: async (
    targetType: "workout" | "meal",
    targetId: string
  ) => {
    return api.get<CommentListResponse>("/comments", {
      params: { targetType, targetId }
    })
  },

  create: async (data: CreateCommentRequest) => {
    return api.post<Comment>("/comments", data)
  },

  update: async (id: string, data: UpdateCommentRequest) => {
    return api.put<Comment>(`/comments/${id}`, data)
  },

  delete: async (id: string) => {
    return api.delete<MessageResponse>(`/comments/${id}`)
  }
}

// Relationship API
export const relationshipApi = {
  // Trainer endpoints
  generateInvitation: async () => {
    return api.post<GenerateInvitationResponse>("/relationships/invite", {})
  },

  getMyClients: async () => {
    return api.get<{
      clients: import("@/lib/api-types").ClientWithAthlete[]
      count: number
    }>("/relationships/my-clients")
  },

  getClientDetails: async (clientId: string) => {
    return api.get<GetClientDetailsResponse>(
      `/relationships/client/${clientId}`
    )
  },

  // Athlete endpoints
  acceptInvitation: async (code: string) => {
    return api.post<AcceptInvitationResponse>("/relationships/accept", { code })
  },

  getMyTrainer: async () => {
    return api.get<GetMyTrainerResponse>("/relationships/my-trainer")
  },

  // Shared endpoints
  terminateRelationship: async (relationshipId: string) => {
    return api.delete<TerminateRelationshipResponse>(
      `/relationships/${relationshipId}`
    )
  }
}

// Trainer Client View API
export const trainerClientApi = {
  getClientWorkouts: async (
    clientId: string,
    params?: PaginationParams & { exerciseType?: string }
  ) => {
    return api.get<WorkoutListResponse>(`/clients/${clientId}/workouts`, {
      params
    })
  },

  getClientMeals: async (
    clientId: string,
    params?: PaginationParams & { mealType?: string }
  ) => {
    return api.get<MealListResponse>(`/clients/${clientId}/meals`, {
      params
    })
  },

  getClientStats: async (clientId: string) => {
    return api.get<GetClientStatsResponse>(
      `/relationships/client/${clientId}/stats`
    )
  }
}

// Trainer Catalog API
export const trainerCatalogApi = {
  searchTrainers: async (params?: {
    specialization?: string
    location?: string
    minRating?: number
    availableForNewClients?: boolean
    limit?: number
    offset?: number
  }) => {
    return api.get<{
      trainers: import("@/types").TrainerWithProfile[]
      total: number
      limit: number
      offset: number
    }>("/trainers", { params })
  },

  getTrainerProfile: async (id: string) => {
    return api.get<import("@/types").TrainerWithProfile>(`/trainers/${id}`)
  },

  updateTrainerProfile: async (data: import("@/types").TrainerProfile) => {
    return api.put<{ message: string }>("/trainers/me/profile", data)
  }
}

// Availability API
export const availabilityApi = {
  getMyAvailability: async () => {
    return api.get<{ slots: import("@/types").TrainerAvailability[] }>(
      "/trainers/me/availability"
    )
  },

  setMyAvailability: async (slots: import("@/types").TrainerAvailability[]) => {
    return api.put<{ message: string }>("/trainers/me/availability", slots)
  },

  getTrainerAvailability: async (trainerId: string) => {
    return api.get<{ slots: import("@/types").TrainerAvailability[] }>(
      `/trainers/${trainerId}/availability`
    )
  },

  deleteSlot: async (slotId: string) => {
    return api.delete<{ message: string }>(`/trainers/me/availability/${slotId}`)
  }
}

// Review API
export const reviewApi = {
  createReview: async (
    trainerId: string,
    data: { rating: number; comment?: string }
  ) => {
    return api.post<import("@/types").TrainerReview>(
      `/trainers/${trainerId}/reviews`,
      data
    )
  },

  getTrainerReviews: async (trainerId: string) => {
    return api.get<{ reviews: import("@/types").TrainerReview[] }>(
      `/trainers/${trainerId}/reviews`
    )
  },

  updateReview: async (
    reviewId: string,
    data: { rating: number; comment?: string }
  ) => {
    return api.put<{ message: string }>(`/reviews/${reviewId}`, data)
  },

  deleteReview: async (reviewId: string) => {
    return api.delete<{ message: string }>(`/reviews/${reviewId}`)
  }
}

// Coaching Request API
export const coachingRequestApi = {
  createCoachingRequest: async (data: {
    trainerId: string
    message?: string
  }) => {
    return api.post<import("@/types").CoachingRequest>(
      "/coaching-requests",
      data
    )
  },

  getMyRequests: async () => {
    return api.get<{ requests: import("@/types").CoachingRequestWithDetails[] }>(
      "/coaching-requests/my"
    )
  },

  getPendingRequests: async () => {
    return api.get<{ requests: import("@/types").CoachingRequestWithDetails[] }>(
      "/coaching-requests/pending"
    )
  },

  acceptRequest: async (requestId: string) => {
    return api.put<{ message: string; relationship: any }>(
      `/coaching-requests/${requestId}/accept`,
      {}
    )
  },

  rejectRequest: async (requestId: string) => {
    return api.put<{ message: string }>(
      `/coaching-requests/${requestId}/reject`,
      {}
    )
  }
}

export default api

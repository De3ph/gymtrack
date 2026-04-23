import api from "./index"
import { PaginationParams, WorkoutListResponse, MealListResponse, GetClientStatsResponse } from "./api-types"

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

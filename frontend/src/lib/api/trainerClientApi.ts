import api from "./index"
import { PaginationParams, WorkoutListResponse, MealListResponse, GetClientStatsResponse } from "./api-types"

export const trainerClientApi = {
  getClientWorkouts: async (
    username: string,
    params?: PaginationParams & { exerciseType?: string }
  ) => {
    return api.get<WorkoutListResponse>(`/clients/${username}/workouts`, {
      params
    })
  },

  getClientMeals: async (
    username: string,
    params?: PaginationParams & { mealType?: string }
  ) => {
    return api.get<MealListResponse>(`/clients/${username}/meals`, {
      params
    })
  },

  getClientStats: async (username: string) => {
    return api.get<GetClientStatsResponse>(
      `/relationships/client/${username}/stats`
    )
  }
}

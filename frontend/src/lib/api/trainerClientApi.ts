import api from "./api-client"
import {
  PaginationParams,
  WorkoutListResponse,
  MealListResponse,
  BodyMeasurementListResponse,
  GetClientStatsResponse
} from "./api-types"

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

  getClientMeasurements: async (
    username: string,
    params?: PaginationParams
  ) => {
    return api.get<BodyMeasurementListResponse>(
      `/clients/${username}/measurements`,
      { params }
    )
  },

  getClientStats: async (username: string) => {
    return api.get<GetClientStatsResponse>(
      `/relationships/client/${username}/stats`
    )
  }
}

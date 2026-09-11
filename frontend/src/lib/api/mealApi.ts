import { CreateMealRequest, PaginationParams, MealListResponse, Meal } from "@/types"
import api from "./api-client"

type FetchOptions = RequestInit & {
  params?: Record<string, unknown> | PaginationParams
  timeout?: number
}

export const mealApi = {
  create: async (data: CreateMealRequest) => {
    return api.post<Meal>("/meals", data)
  },

  getAll: async (params?: PaginationParams) => {
    return api.get<MealListResponse>("/meals", {
      params
    })
  },

  getById: async (id: string | number) => {
    return api.get<Meal>(`/meals/${id}`)
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

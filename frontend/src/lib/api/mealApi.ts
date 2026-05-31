import { CreateMealRequest, UpdateMealRequest } from "@/types"
import api from "./index"
import { MessageResponse, PaginationParams, MealListResponse } from "./api-types"
import { Meal } from "@/types"

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

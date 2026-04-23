import { CreateWorkoutRequest, UpdateWorkoutRequest } from "@/types"
import api from "./index"
import { MessageResponse, PaginationParams, WorkoutListResponse } from "./api-types"
import { Workout } from "@/types"

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

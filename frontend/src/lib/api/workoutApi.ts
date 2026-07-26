import { CreateWorkoutRequest, UpdateWorkoutRequest, MessageResponse, PaginationParams, WorkoutListResponse, Workout } from "@/types"
import api from "./api-client"

export const workoutApi = {
  create: async (data: CreateWorkoutRequest) => {
    return api.post<Workout>("/workouts", data)
  },

  getAll: async (params?: PaginationParams) => {
    return api.get<WorkoutListResponse>("/workouts", {
      params
    })
  },

  getById: async (id: string | number) => {
    return api.get<Workout>(`/workouts/${id}`)
  },

  update: async (id: string | number, data: UpdateWorkoutRequest) => {
    return api.put<Workout>(`/workouts/${id}`, data)
  },

  delete: async (id: string | number) => {
    return api.delete<MessageResponse>(`/workouts/${id}`)
  }
}

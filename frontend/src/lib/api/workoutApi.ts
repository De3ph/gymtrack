import { CreateWorkoutRequest, PaginationParams, WorkoutListResponse, Workout } from "@/types"
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
}

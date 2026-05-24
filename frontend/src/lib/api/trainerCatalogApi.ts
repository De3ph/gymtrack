import api from "./index"
import { MessageResponse } from "./api-types"

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

  getMyProfile: async () => {
    return api.get<import("@/types").TrainerWithProfile>("/trainers/me/profile")
  },

  updateTrainerProfile: async (data: import("@/types").TrainerProfile) => {
    return api.put<MessageResponse>("/trainers/me/profile", data)
  }
}

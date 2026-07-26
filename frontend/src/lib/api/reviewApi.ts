import api from "./api-client"
import { MessageResponse } from "@/types"

export const reviewApi = {
  createReview: async (
    trainerId: string | number,
    data: { rating: number; comment?: string }
  ) => {
    return api.post<import("@/types").TrainerReview>(
      `/trainers/${trainerId}/reviews`,
      data
    )
  },

  getTrainerReviews: async (trainerId: string | number) => {
    return api.get<{ reviews: import("@/types").TrainerReview[] }>(
      `/trainers/${trainerId}/reviews`
    )
  },

  updateReview: async (
    reviewId: string | number,
    data: { rating: number; comment?: string }
  ) => {
    return api.put<MessageResponse>(`/reviews/${reviewId}`, data)
  },

  deleteReview: async (reviewId: string | number) => {
    return api.delete<MessageResponse>(`/reviews/${reviewId}`)
  }
}

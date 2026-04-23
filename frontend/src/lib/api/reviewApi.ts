import api from "./index"
import { MessageResponse } from "./api-types"

export const reviewApi = {
  createReview: async (
    trainerId: string,
    data: { rating: number; comment?: string }
  ) => {
    return api.post<import("@/types").TrainerReview>(
      `/trainers/${trainerId}/reviews`,
      data
    )
  },

  getTrainerReviews: async (trainerId: string) => {
    return api.get<{ reviews: import("@/types").TrainerReview[] }>(
      `/trainers/${trainerId}/reviews`
    )
  },

  updateReview: async (
    reviewId: string,
    data: { rating: number; comment?: string }
  ) => {
    return api.put<MessageResponse>(`/reviews/${reviewId}`, data)
  },

  deleteReview: async (reviewId: string) => {
    return api.delete<MessageResponse>(`/reviews/${reviewId}`)
  }
}

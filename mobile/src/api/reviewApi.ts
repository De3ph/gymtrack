import { apiRequest } from "./client";

export const reviewApi = {
  createReview: (
    trainerId: string | number,
    data: { rating: number; comment?: string }
  ) =>
    apiRequest(`/trainers/${trainerId}/reviews`, {
      method: "POST",
      body: data,
    }),

  getTrainerReviews: (trainerId: string | number) =>
    apiRequest(`/trainers/${trainerId}/reviews`),

  updateReview: (
    reviewId: string | number,
    data: { rating: number; comment?: string }
  ) =>
    apiRequest(`/reviews/${reviewId}`, { method: "PUT", body: data }),

  deleteReview: (reviewId: string | number) =>
    apiRequest(`/reviews/${reviewId}`, { method: "DELETE" }),
};
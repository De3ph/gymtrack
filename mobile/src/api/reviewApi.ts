import { apiRequest } from "./client";
import type { TrainerReview } from "@/types";

export const reviewApi = {
  createReview: (
    trainerId: string | number,
    data: Omit<TrainerReview, "reviewId" | "createdAt" | "updatedAt" | "trainerId" | "athleteId">
  ) =>
    apiRequest<TrainerReview>(`/trainers/${trainerId}/reviews`, {
      method: "POST",
      body: data,
    }),

  getTrainerReviews: (trainerId: string | number) =>
    apiRequest<{ reviews: TrainerReview[] }>(`/trainers/${trainerId}/reviews`),

  updateReview: (
    reviewId: string | number,
    data: Partial<Omit<TrainerReview, "reviewId" | "createdAt" | "updatedAt" | "trainerId" | "athleteId">>
  ) =>
    apiRequest<TrainerReview>(`/reviews/${reviewId}`, { method: "PUT", body: data }),

  deleteReview: (reviewId: string | number) =>
    apiRequest<void>(`/reviews/${reviewId}`, { method: "DELETE" }),
};
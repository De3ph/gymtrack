import { apiRequest } from "./client";
import type { CoachingRequest } from "@/types";

export const coachingRequestApi = {
  createCoachingRequest: (data: Omit<CoachingRequest, "requestId" | "createdAt" | "updatedAt" | "status" | "athleteId">) =>
    apiRequest<CoachingRequest>("/coaching-requests", { method: "POST", body: data }),

  getMyRequests: () =>
    apiRequest<{ requests: CoachingRequest[] }>("/coaching-requests/my"),

  getPendingRequests: () =>
    apiRequest<{ requests: CoachingRequest[] }>("/coaching-requests/pending"),

  acceptRequest: (requestId: number) =>
    apiRequest<CoachingRequest>(`/coaching-requests/${requestId}/accept`, {
      method: "PUT",
      body: {},
    }),

  rejectRequest: (requestId: number) =>
    apiRequest<CoachingRequest>(`/coaching-requests/${requestId}/reject`, {
      method: "PUT",
      body: {},
    }),
};
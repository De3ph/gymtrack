import { apiRequest } from "./client";

export const coachingRequestApi = {
  createCoachingRequest: (data: { trainerId: number; message?: string }) =>
    apiRequest("/coaching-requests", { method: "POST", body: data }),

  getMyRequests: () =>
    apiRequest("/coaching-requests/my"),

  getPendingRequests: () =>
    apiRequest("/coaching-requests/pending"),

  acceptRequest: (requestId: number) =>
    apiRequest(`/coaching-requests/${requestId}/accept`, {
      method: "PUT",
      body: {},
    }),

  rejectRequest: (requestId: number) =>
    apiRequest(`/coaching-requests/${requestId}/reject`, {
      method: "PUT",
      body: {},
    }),
};
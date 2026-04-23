import api from "./index"
import { MessageResponse } from "./api-types"

export const coachingRequestApi = {
  createCoachingRequest: async (data: {
    trainerId: string
    message?: string
  }) => {
    return api.post<import("@/types").CoachingRequest>(
      "/coaching-requests",
      data
    )
  },

  getMyRequests: async () => {
    return api.get<{ requests: import("@/types").CoachingRequestWithDetails[] }>(
      "/coaching-requests/my"
    )
  },

  getPendingRequests: async () => {
    return api.get<{ requests: import("@/types").CoachingRequestWithDetails[] }>(
      "/coaching-requests/pending"
    )
  },

  acceptRequest: async (requestId: string) => {
    return api.put<{ message: string; relationship: any }>(
      `/coaching-requests/${requestId}/accept`,
      {}
    )
  },

  rejectRequest: async (requestId: string) => {
    return api.put<MessageResponse>(
      `/coaching-requests/${requestId}/reject`,
      {}
    )
  }
}

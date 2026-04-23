import api from "./index"
import {
  AcceptInvitationResponse,
  GenerateInvitationResponse,
  GetClientDetailsResponse,
  GetMyTrainerResponse,
  TerminateRelationshipResponse
} from "./api-types"

export const relationshipApi = {
  // Trainer endpoints
  generateInvitation: async () => {
    return api.post<GenerateInvitationResponse>("/relationships/invite", {})
  },

  getMyClients: async () => {
    return api.get<{
      clients: import("@/lib/api/api-types").ClientWithAthlete[]
      count: number
    }>("/relationships/my-clients")
  },

  getClientDetails: async (clientId: string) => {
    return api.get<GetClientDetailsResponse>(
      `/relationships/client/${clientId}`
    )
  },

  // Athlete endpoints
  acceptInvitation: async (code: string) => {
    return api.post<AcceptInvitationResponse>("/relationships/accept", { code })
  },

  getMyTrainer: async () => {
    return api.get<GetMyTrainerResponse>("/relationships/my-trainer")
  },

  // Shared endpoints
  terminateRelationship: async (relationshipId: string) => {
    return api.delete<TerminateRelationshipResponse>(
      `/relationships/${relationshipId}`
    )
  }
}

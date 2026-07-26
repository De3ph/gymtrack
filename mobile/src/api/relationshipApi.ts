import { apiRequest } from "./client";

export const relationshipApi = {
  generateInvitation: () =>
    apiRequest("/relationships/invite", { method: "POST", body: {} }),

  getMyClients: () =>
    apiRequest("/relationships/my-clients"),

  getClientDetails: (username: string) =>
    apiRequest(`/relationships/client/${username}`),

  acceptInvitation: (code: string) =>
    apiRequest("/relationships/accept", { method: "POST", body: { code } }),

  getMyTrainer: () =>
    apiRequest("/relationships/my-trainer"),

  terminateRelationship: (relationshipId: string | number) =>
    apiRequest(`/relationships/${relationshipId}`, { method: "DELETE" }),
};
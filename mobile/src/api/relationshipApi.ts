import { apiRequest } from "./client";
import type { Relationship } from "@/types";

export const relationshipApi = {
  generateInvitation: () =>
    apiRequest<{ code: string; expiresAt: string }>("/relationships/invite", { method: "POST", body: {} }),

  getMyClients: () =>
    apiRequest<{ clients: Relationship[] }>("/relationships/my-clients"),

  acceptInvitation: (code: string) =>
    apiRequest<Relationship>("/relationships/accept", { method: "POST", body: { code } }),

  getMyTrainer: () =>
    apiRequest<Relationship>("/relationships/my-trainer"),

  terminateRelationship: (relationshipId: string | number) =>
    apiRequest<void>(`/relationships/${relationshipId}`, { method: "DELETE" }),
};
import { apiRequest } from "./client";
import type { User } from "@/types";

export const trainerCatalogApi = {
  searchTrainers: (params?: Record<string, string>) =>
    apiRequest<{ trainers: User[] }>("/trainers", { params }),

  getTrainerProfile: (id: string) =>
    apiRequest<User>(`/trainers/${id}`),

  getMyProfile: () =>
    apiRequest<User>("/trainers/me/profile"),

  updateTrainerProfile: (data: Partial<Omit<User, "userId" | "createdAt" | "updatedAt" | "role">>) =>
    apiRequest<User>("/trainers/me/profile", { method: "PUT", body: data }),
};
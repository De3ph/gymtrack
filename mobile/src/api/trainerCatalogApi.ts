import { apiRequest } from "./client";

export const trainerCatalogApi = {
  searchTrainers: (params?: Record<string, string>) =>
    apiRequest("/trainers", { params }),

  getTrainerProfile: (id: string) =>
    apiRequest(`/trainers/${id}`),

  getMyProfile: () =>
    apiRequest("/trainers/me/profile"),

  updateTrainerProfile: (data: Record<string, unknown>) =>
    apiRequest("/trainers/me/profile", { method: "PUT", body: data }),
};
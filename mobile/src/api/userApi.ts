import { apiRequest } from "./client";

export const userApi = {
  getCurrentUser: () => apiRequest("/users/me"),

  updateCurrentUser: (data: Record<string, unknown>) =>
    apiRequest("/users/me", { method: "PUT", body: data }),
};
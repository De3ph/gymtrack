import { apiRequest } from "./client";

export const workoutApi = {
  create: (data: Record<string, unknown>) =>
    apiRequest("/workouts", { method: "POST", body: data }),

  getAll: (params?: Record<string, string>) =>
    apiRequest("/workouts", { params }),

  getById: (id: string | number) =>
    apiRequest(`/workouts/${id}`),

  update: (id: string | number, data: Record<string, unknown>) =>
    apiRequest(`/workouts/${id}`, { method: "PUT", body: data }),

  delete: (id: string | number) =>
    apiRequest(`/workouts/${id}`, { method: "DELETE" }),
};
import { apiRequest } from "./client";

export const workoutPlanApi = {
  create: (data: Record<string, unknown>) =>
    apiRequest("/workout-plans", { method: "POST", body: data }),

  getAll: () => apiRequest("/workout-plans"),

  getById: (id: string | number) =>
    apiRequest(`/workout-plans/${id}`),

  update: (id: string | number, data: Record<string, unknown>) =>
    apiRequest(`/workout-plans/${id}`, { method: "PUT", body: data }),

  delete: (id: string | number) =>
    apiRequest(`/workout-plans/${id}`, { method: "DELETE" }),

  assign: (id: string | number, data: Record<string, unknown>) =>
    apiRequest(`/workout-plans/${id}/assign`, { method: "POST", body: data }),

  getAssignments: (id: string | number) =>
    apiRequest(`/workout-plans/${id}/assignments`),

  getMyPlans: () => apiRequest("/workout-plans/assigned"),

  startWorkout: (id: string | number) =>
    apiRequest(`/workout-plans/${id}/start`, { method: "POST", body: {} }),

  getClientPlans: (username: string) =>
    apiRequest(`/clients/${username}/workout-plans`),
};
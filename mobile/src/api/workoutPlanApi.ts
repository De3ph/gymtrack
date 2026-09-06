import { apiRequest } from "./client";
import type { WorkoutPlan } from "@/types";

export const workoutPlanApi = {
  create: (data: Omit<WorkoutPlan, "planId" | "createdAt" | "updatedAt">) =>
    apiRequest<WorkoutPlan>("/workout-plans", { method: "POST", body: data }),

  getAll: () => apiRequest<{ plans: WorkoutPlan[] }>("/workout-plans"),

  getById: (id: string | number) =>
    apiRequest<WorkoutPlan>(`/workout-plans/${id}`),

  update: (id: string | number, data: Partial<Omit<WorkoutPlan, "planId" | "createdAt" | "updatedAt">>) =>
    apiRequest<WorkoutPlan>(`/workout-plans/${id}`, { method: "PUT", body: data }),

  delete: (id: string | number) =>
    apiRequest<void>(`/workout-plans/${id}`, { method: "DELETE" }),

  assign: (id: string | number, data: { athleteId: number; startDate?: string; endDate?: string }) =>
    apiRequest<void>(`/workout-plans/${id}/assign`, { method: "POST", body: data }),

  getMyPlans: () => apiRequest<{ plans: WorkoutPlan[] }>("/workout-plans/assigned"),
};
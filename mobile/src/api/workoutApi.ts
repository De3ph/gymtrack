import { apiRequest } from "./client";
import type { Workout } from "@/types";

export const workoutApi = {
  create: (data: Record<string, unknown>) =>
    apiRequest<Workout>("/workouts", { method: "POST", body: data }),

  getAll: (params?: Record<string, string>) =>
    apiRequest<{ workouts: Workout[] }>("/workouts", { params }),

  getById: (id: string | number) =>
    apiRequest<Workout>(`/workouts/${id}`),

  update: (id: string | number, data: Record<string, unknown>) =>
    apiRequest<Workout>(`/workouts/${id}`, { method: "PUT", body: data }),

  delete: (id: string | number) =>
    apiRequest<void>(`/workouts/${id}`, { method: "DELETE" }),
};
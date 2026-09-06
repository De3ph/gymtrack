import { apiRequest } from "./client";
import type { Meal } from "@/types";

export const mealApi = {
  create: (data: Record<string, unknown>) =>
    apiRequest<Meal>("/meals", { method: "POST", body: data }),

  getAll: (params?: Record<string, string>) =>
    apiRequest<{ meals: Meal[] }>("/meals", { params }),

  getById: (id: string | number) =>
    apiRequest<Meal>(`/meals/${id}`),

  update: (id: string | number, data: Record<string, unknown>) =>
    apiRequest<Meal>(`/meals/${id}`, { method: "PUT", body: data }),

  delete: (id: string | number) =>
    apiRequest<void>(`/meals/${id}`, { method: "DELETE" }),
};

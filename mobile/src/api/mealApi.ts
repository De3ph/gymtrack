import { apiRequest } from "./client";
import type { Meal } from "@/types";

export const mealApi = {
  create: (data: Record<string, unknown>) =>
    apiRequest<Meal>("/meals", { method: "POST", body: data as Record<string, unknown> }),

  getAll: (params?: Record<string, string>) =>
    apiRequest<{ meals: Meal[] }>("/meals", { params }),

  getById: (id: string | number) =>
    apiRequest<Meal>(`/meals/${id}`),

  update: (id: string | number, data: Record<string, unknown>) =>
    apiRequest<Meal>(`/meals/${id}`, { method: "PUT", body: data as Record<string, unknown> }),

  delete: (id: string | number) =>
    apiRequest<void>(`/meals/${id}`, { method: "DELETE" }),

  getByDate: (date: string) =>
    apiRequest<{ meals: Meal[] }>("/meals", { params: { date } }),

  getClientMeals: (clientId: string, params?: Record<string, string>) =>
    apiRequest<{ meals: Meal[] }>(`/clients/${clientId}/meals`, { params }),
};
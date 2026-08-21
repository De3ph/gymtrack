import { apiRequest } from "./client";
import type { Meal } from "@/types";

export const mealApi = {
  create: (data: Omit<Meal, "mealId" | "createdAt" | "updatedAt">) =>
    apiRequest<Meal>("/meals", { method: "POST", body: data }),

  getAll: (params?: Record<string, string>) =>
    apiRequest<{ meals: Meal[] }>("/meals", { params }),

  getById: (id: string | number) =>
    apiRequest<Meal>(`/meals/${id}`),

  update: (id: string | number, data: Partial<Omit<Meal, "mealId" | "createdAt" | "updatedAt">>) =>
    apiRequest<Meal>(`/meals/${id}`, { method: "PUT", body: data }),

  delete: (id: string | number) =>
    apiRequest<void>(`/meals/${id}`, { method: "DELETE" }),

  getByDate: (date: string) =>
    apiRequest<{ meals: Meal[] }>("/meals", { params: { date } }),

  getClientMeals: (clientId: string, params?: Record<string, string>) =>
    apiRequest<{ meals: Meal[] }>(`/clients/${clientId}/meals`, { params }),
};
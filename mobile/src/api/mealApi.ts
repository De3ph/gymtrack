import { apiRequest } from "./client";

export const mealApi = {
  create: (data: Record<string, unknown>) =>
    apiRequest("/meals", { method: "POST", body: data }),

  getAll: (params?: Record<string, string>) =>
    apiRequest("/meals", { params }),

  getById: (id: string | number) =>
    apiRequest(`/meals/${id}`),

  update: (id: string | number, data: Record<string, unknown>) =>
    apiRequest(`/meals/${id}`, { method: "PUT", body: data }),

  delete: (id: string | number) =>
    apiRequest(`/meals/${id}`, { method: "DELETE" }),

  getByDate: (date: string) =>
    apiRequest("/meals", { params: { date } }),

  getClientMeals: (clientId: string, params?: Record<string, string>) =>
    apiRequest(`/clients/${clientId}/meals`, { params }),
};
import { apiRequest } from "./client";

export const bodyMeasurementApi = {
  create: (data: Record<string, unknown>) =>
    apiRequest("/measurements", { method: "POST", body: data }),

  getAll: (params?: Record<string, string>) =>
    apiRequest("/measurements", { params }),

  getById: (id: number) =>
    apiRequest(`/measurements/${id}`),

  getLatest: async (athleteId?: number) =>
    (await apiRequest("/measurements/latest", {
      params: athleteId ? { athleteId: String(athleteId) } : undefined,
    })) ?? null,

  update: (id: number, data: Record<string, unknown>) =>
    apiRequest(`/measurements/${id}`, { method: "PUT", body: data }),

  delete: (id: number) =>
    apiRequest(`/measurements/${id}`, { method: "DELETE" }),
};
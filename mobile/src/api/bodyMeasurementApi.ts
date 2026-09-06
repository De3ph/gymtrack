import { apiRequest } from "./client";
import type { BodyMeasurement } from "@/types";

export const bodyMeasurementApi = {
  create: (data: Record<string, unknown>) =>
    apiRequest<BodyMeasurement>("/measurements", { method: "POST", body: data }),

  getAll: (params?: Record<string, string>) =>
    apiRequest<{ measurements: BodyMeasurement[] }>("/measurements", { params }),

  getLatest: async (athleteId?: number) =>
    (await apiRequest<BodyMeasurement | null>("/measurements/latest", {
      params: athleteId ? { athleteId: String(athleteId) } : undefined,
    })) ?? null,

  update: (id: number, data: Record<string, unknown>) =>
    apiRequest<BodyMeasurement>(`/measurements/${id}`, { method: "PUT", body: data }),

  delete: (id: number) =>
    apiRequest<void>(`/measurements/${id}`, { method: "DELETE" }),
};

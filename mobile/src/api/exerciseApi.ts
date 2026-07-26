import { apiRequest } from "./client";

export const exerciseApi = {
  getMuscleGroups: () => apiRequest("/muscle-groups"),

  getEquipment: () => apiRequest("/equipment"),

  getAll: (params?: Record<string, string>) =>
    apiRequest("/exercises", { params }),

  getById: (id: string) => apiRequest(`/exercises/${id}`),

  search: (params: Record<string, string>) =>
    apiRequest("/exercises/search", { params }),

  getByMuscleGroup: (muscleGroupId: number) =>
    apiRequest(`/exercises/muscle-group/${muscleGroupId}`),

  getByEquipment: (equipmentId: number) =>
    apiRequest(`/exercises/equipment/${equipmentId}`),

  create: (data: Record<string, unknown>) =>
    apiRequest("/exercises", { method: "POST", body: data }),

  update: (id: string, data: Record<string, unknown>) =>
    apiRequest(`/exercises/${id}`, { method: "PUT", body: data }),

  delete: (id: string) =>
    apiRequest(`/exercises/${id}`, { method: "DELETE" }),
};
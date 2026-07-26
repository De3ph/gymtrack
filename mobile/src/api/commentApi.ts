import { apiRequest } from "./client";

export const commentApi = {
  getByTarget: (
    targetType: "workout" | "meal",
    targetId: string | number
  ) =>
    apiRequest("/comments", {
      params: { targetType, targetId: String(targetId) },
    }),

  create: (data: Record<string, unknown>) =>
    apiRequest("/comments", { method: "POST", body: data }),

  update: (id: string | number, data: Record<string, unknown>) =>
    apiRequest(`/comments/${id}`, { method: "PUT", body: data }),

  delete: (id: string | number) =>
    apiRequest(`/comments/${id}`, { method: "DELETE" }),
};
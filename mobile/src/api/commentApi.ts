import { apiRequest } from "./client";
import type { Comment } from "@/types";

export const commentApi = {
  getByTarget: (
    targetType: "workout" | "meal",
    targetId: string | number
  ) =>
    apiRequest<{ comments: Comment[] }>("/comments", {
      params: { targetType, targetId: String(targetId) },
    }),

  create: (data: Record<string, unknown>) =>
    apiRequest<Comment>("/comments", { method: "POST", body: data }),

  delete: (id: string | number) =>
    apiRequest<void>(`/comments/${id}`, { method: "DELETE" }),
};

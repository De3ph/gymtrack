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

  create: (data: Omit<Comment, "commentId" | "createdAt" | "updatedAt">) =>
    apiRequest<Comment>("/comments", { method: "POST", body: data }),

  update: (id: string | number, data: Partial<Omit<Comment, "commentId" | "createdAt" | "updatedAt">>) =>
    apiRequest<Comment>(`/comments/${id}`, { method: "PUT", body: data }),

  delete: (id: string | number) =>
    apiRequest<void>(`/comments/${id}`, { method: "DELETE" }),
};
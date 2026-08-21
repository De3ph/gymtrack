import { apiRequest } from "./client";
import type { User, Comment } from "@/types";

export const adminApi = {
  getDashboardStats: () => apiRequest<{ userCount: number; workoutCount: number; mealCount: number }>("/admin/stats"),

  getUsers: (params?: Record<string, string>) =>
    apiRequest<{ users: User[] }>("/admin/users", { params }),

  getUserDetail: (userId: string) =>
    apiRequest<User>(`/admin/users/${userId}`),

  changePassword: (oldPassword: string, newPassword: string) =>
    apiRequest<void>("/admin/profile/password", {
      method: "PUT",
      body: { oldPassword, newPassword },
    }),

  updateUserRole: (userId: string, role: string) =>
    apiRequest<User>(`/admin/users/${userId}/role`, {
      method: "PUT",
      body: { role },
    }),

  updateUserStatus: (userId: string, status: string) =>
    apiRequest<User>(`/admin/users/${userId}/status`, {
      method: "PUT",
      body: { status },
    }),

  getComments: (params?: Record<string, string>) =>
    apiRequest<{ comments: Comment[] }>("/admin/comments", { params }),

  deleteComment: (commentId: number) =>
    apiRequest<void>(`/admin/comments/${commentId}`, { method: "DELETE" }),
};
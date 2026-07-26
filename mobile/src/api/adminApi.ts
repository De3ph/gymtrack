import { apiRequest } from "./client";

export const adminApi = {
  getDashboardStats: () => apiRequest("/admin/stats"),

  getUsers: (params?: Record<string, string>) =>
    apiRequest("/admin/users", { params }),

  getUserDetail: (userId: string) =>
    apiRequest(`/admin/users/${userId}`),

  changePassword: (oldPassword: string, newPassword: string) =>
    apiRequest("/admin/profile/password", {
      method: "PUT",
      body: { oldPassword, newPassword },
    }),

  updateUserRole: (userId: string, role: string) =>
    apiRequest(`/admin/users/${userId}/role`, {
      method: "PUT",
      body: { role },
    }),

  updateUserStatus: (userId: string, status: string) =>
    apiRequest(`/admin/users/${userId}/status`, {
      method: "PUT",
      body: { status },
    }),

  getComments: (params?: Record<string, string>) =>
    apiRequest("/admin/comments", { params }),

  deleteComment: (commentId: number) =>
    apiRequest(`/admin/comments/${commentId}`, { method: "DELETE" }),
};
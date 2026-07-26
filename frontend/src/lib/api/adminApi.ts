import api from "./api-client";
import type { UserRole, UserStatus, UserProfile } from "@/types";

export interface AdminUserListItem {
  userId: string;
  username: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  profile: UserProfile;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUserListResponse {
  users: AdminUserListItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface AdminDashboardStats {
  totalUsers: number;
  totalTrainers: number;
  totalAthletes: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  activeUsersToday: number;
  totalWorkouts: number;
  totalMeals: number;
}

export interface AdminComment {
  commentId: number;
  targetType: string;
  targetId: number;
  authorId: number;
  authorRole: string;
  content: string;
  parentCommentId?: number | null;
  createdAt: string;
  editedAt?: string | null;
}

export const adminApi = {
  getDashboardStats: async (): Promise<AdminDashboardStats> => {
    return api.get<AdminDashboardStats>("/admin/stats");
  },

  getUsers: async (params?: {
    limit?: number;
    offset?: number;
    role?: UserRole | "all";
    search?: string;
  }): Promise<AdminUserListResponse> => {
    return api.get<AdminUserListResponse>("/admin/users", {
      params: params as unknown as Record<string, unknown>,
    });
  },

  getUserDetail: async (
    userId: string,
  ): Promise<AdminUserListItem> => {
    return api.get<AdminUserListItem>(`/admin/users/${userId}`);
  },

  changePassword: async (
    oldPassword: string,
    newPassword: string,
  ): Promise<{ message: string }> => {
    return api.put<{ message: string }>("/admin/profile/password", {
      oldPassword,
      newPassword,
    });
  },

  updateUserRole: async (
    userId: string,
    role: UserRole,
  ): Promise<{ message: string }> => {
    return api.put<{ message: string }>(`/admin/users/${userId}/role`, { role });
  },

  updateUserStatus: async (
    userId: string,
    status: UserStatus,
  ): Promise<{ message: string }> => {
    return api.put<{ message: string }>(`/admin/users/${userId}/status`, { status });
  },

  getComments: async (params?: {
    limit?: number;
    offset?: number;
    targetType?: string;
  }): Promise<{ comments: AdminComment[]; total: number; limit: number; offset: number }> => {
    return api.get("/admin/comments", { params });
  },

  deleteComment: async (commentId: number): Promise<{ message: string }> => {
    return api.delete(`/admin/comments/${commentId}`);
  },
};

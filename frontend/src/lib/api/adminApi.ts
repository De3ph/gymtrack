import api from "./api-client";
import type { UserRole, UserProfile } from "@/types";

export interface AdminUserListItem {
  userId: string;
  username: string;
  email: string;
  role: UserRole;
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
};

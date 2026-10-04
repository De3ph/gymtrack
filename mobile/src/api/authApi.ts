import { apiRequest } from "./client";
import type { User, RegisterResponse, LoginResponse } from "@/types";

export const authApi = {
  login: (data: { identifier: string; password: string }) =>
    apiRequest<LoginResponse>("/auth/login", {
      method: "POST",
      body: data,
      skipSessionRefresh: true,
    }),

  register: (data: {
    username: string;
    email: string;
    password: string;
    role: string;
    profile?: Record<string, unknown>;
  }) =>
    apiRequest<RegisterResponse>("/auth/register", {
      method: "POST",
      body: data,
      skipSessionRefresh: true,
    }),

  logout: () =>
    apiRequest<void>("/auth/logout", { method: "POST" }),

  requestPasswordReset: (data: { email: string }) =>
    apiRequest<{ message: string }>("/auth/password-reset/request", {
      method: "POST",
      body: data,
      skipSessionRefresh: true,
    }),

  confirmPasswordReset: (data: { token: string; newPassword: string }) =>
    apiRequest<{ message: string }>("/auth/password-reset/confirm", {
      method: "POST",
      body: data,
      skipSessionRefresh: true,
    }),

  getMe: () => apiRequest<User>("/users/me"),
};

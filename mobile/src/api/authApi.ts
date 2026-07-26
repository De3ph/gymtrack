import { apiRequest } from "./client";
import type { User, RegisterResponse, LoginResponse } from "@/types";

export const authApi = {
  login: (data: { identifier: string; password: string }) =>
    apiRequest<LoginResponse>("/auth/login", {
      method: "POST",
      body: data,
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
    }),

  logout: () =>
    apiRequest<void>("/auth/logout", { method: "POST" }),

  refresh: (refreshToken: string) =>
    apiRequest<{ accessToken: string }>("/auth/refresh", {
      method: "POST",
      body: { refreshToken },
    }),

  getMe: () => apiRequest<User>("/users/me"),
};

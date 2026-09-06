import { apiRequest } from "./client";
import type { User } from "@/types";

export const userApi = {
  updateCurrentUser: (data: Partial<Omit<User, "userId" | "createdAt" | "updatedAt">>) =>
    apiRequest<User>("/users/me", { method: "PUT", body: data }),
};
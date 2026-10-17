import { CurrentUser, UpdateProfileRequest, User, UserResponse } from "@/types"
import api from "./api-client"

export const userApi = {
  // Typed as CurrentUser, not UserResponse: the Go handler populates every field
  // unconditionally (user_handler.go), swag just can't express that.
  getCurrentUser: async () => {
    return api.get<CurrentUser>("/users/me")
  },

  updateCurrentUser: async (data: UpdateProfileRequest) => {
    return api.put<CurrentUser>("/users/me", data)
  },

  deleteAccount: async (password: string) => {
    return api.delete("/users/me", { body: JSON.stringify({ password }) })
  }
}

/**
 * Normalizes an all-optional user payload into the `User` shape the app relies on.
 *
 * Callers that already hold a known-good user should pass it as `fallback` so a
 * partial response reuses known values instead of inventing identity data. `role`
 * in particular drives role-gated nav and route guards, so it must never be
 * guessed from a response that is missing it.
 */
export function toUser(data: UserResponse, fallback?: User | null): User {
  return {
    ...data,
    email: data.email ?? fallback?.email ?? "",
    role: data.role ?? fallback?.role ?? "athlete",
    username: data.username ?? fallback?.username ?? "user",
    profile: data.profile ?? fallback?.profile ?? {},
  }
}

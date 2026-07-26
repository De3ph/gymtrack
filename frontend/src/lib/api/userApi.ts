import { UpdateProfileRequest, UserResponse } from "@/types"
import api from "./api-client"

export const userApi = {
  getCurrentUser: async () => {
    return api.get<UserResponse>("/users/me")
  },

  updateCurrentUser: async (data: UpdateProfileRequest) => {
    return api.put<UserResponse>("/users/me", data)
  }
}

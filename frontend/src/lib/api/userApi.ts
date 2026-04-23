import { UpdateProfileRequest } from "@/types"
import api from "./index"
import { UserResponse } from "./api-types"

export const userApi = {
  getCurrentUser: async () => {
    return api.get<UserResponse>("/users/me")
  },

  updateCurrentUser: async (data: UpdateProfileRequest) => {
    return api.put<UserResponse>("/users/me", data)
  }
}

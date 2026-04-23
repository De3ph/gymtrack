import { LoginRequest, RegisterRequest } from "@/types";
import api from "./index";
import { MessageResponse, RegisterResponse, LoginResponse } from "./api-types";

export const authApi = {
    register: async (data: RegisterRequest) => {
        return api.post<RegisterResponse>("/auth/register", data)
    },

    login: async (data: LoginRequest) => {
        return api.post<LoginResponse>("/auth/login", data)
    },

    refreshToken: async (refreshToken: string) => {
        return api.post<{ message: string; accessToken: string }>("/auth/refresh", { refreshToken })
    },

    logout: async () => {
        return api.post<MessageResponse>("/auth/logout", {})
    }
}
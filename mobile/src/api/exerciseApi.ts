import { apiRequest } from "./client";

export const exerciseApi = {
  getAll: (params?: Record<string, string>) =>
    apiRequest("/exercises", { params }),
};

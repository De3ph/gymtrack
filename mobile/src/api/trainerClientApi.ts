import { apiRequest } from "./client";

export const trainerClientApi = {
  getClientWorkouts: (
    username: string,
    params?: Record<string, string>
  ) =>
    apiRequest(`/clients/${username}/workouts`, { params }),

  getClientMeals: (
    username: string,
    params?: Record<string, string>
  ) =>
    apiRequest(`/clients/${username}/meals`, { params }),

  getClientMeasurements: (
    username: string,
    params?: Record<string, string>
  ) =>
    apiRequest(`/clients/${username}/measurements`, { params }),

  getClientStats: (username: string) =>
    apiRequest(`/relationships/client/${username}/stats`),
};
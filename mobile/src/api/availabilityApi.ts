import { apiRequest } from "./client";

export const availabilityApi = {
  getMyAvailability: () =>
    apiRequest("/trainers/me/availability"),

  setMyAvailability: (slots: Record<string, unknown>[]) =>
    apiRequest("/trainers/me/availability", {
      method: "PUT",
      body: slots,
    }),

  getTrainerAvailability: (trainerId: string) =>
    apiRequest(`/trainers/${trainerId}/availability`),

  deleteSlot: (slotId: string) =>
    apiRequest(`/trainers/me/availability/${slotId}`, { method: "DELETE" }),
};
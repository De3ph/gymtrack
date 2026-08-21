import { apiRequest } from "./client";
import type { TrainerAvailability } from "@/types";

export const availabilityApi = {
  getMyAvailability: () =>
    apiRequest<{ slots: TrainerAvailability[] }>("/trainers/me/availability"),

  setMyAvailability: (slots: TrainerAvailability[]) =>
    apiRequest<{ slots: TrainerAvailability[] }>("/trainers/me/availability", {
      method: "PUT",
      body: slots,
    }),

  getTrainerAvailability: (trainerId: string) =>
    apiRequest<{ slots: TrainerAvailability[] }>(`/trainers/${trainerId}/availability`),

  deleteSlot: (slotId: string) =>
    apiRequest<void>(`/trainers/me/availability/${slotId}`, { method: "DELETE" }),
};
import api from "./index"
import { MessageResponse } from "./api-types"

export const availabilityApi = {
  getMyAvailability: async () => {
    return api.get<{ slots: import("@/types").TrainerAvailability[] }>(
      "/trainers/me/availability"
    )
  },

  setMyAvailability: async (slots: import("@/types").TrainerAvailability[]) => {
    return api.put<MessageResponse>("/trainers/me/availability", slots)
  },

  getTrainerAvailability: async (trainerId: string) => {
    return api.get<{ slots: import("@/types").TrainerAvailability[] }>(
      `/trainers/${trainerId}/availability`
    )
  },

  deleteSlot: async (slotId: string) => {
    return api.delete<MessageResponse>(`/trainers/me/availability/${slotId}`)
  }
}

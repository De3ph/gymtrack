import {
  BodyMeasurement,
  CreateBodyMeasurementRequest,
  UpdateBodyMeasurementRequest
, BodyMeasurementListResponse, MessageResponse, PaginationParams
} from "@/types"
import api from "./api-client"

export const bodyMeasurementApi = {
  create: async (data: CreateBodyMeasurementRequest) => {
    return api.post<BodyMeasurement>("/measurements", data)
  },

  getAll: async (params?: PaginationParams) => {
    return api.get<BodyMeasurementListResponse>("/measurements", { params })
  },

  getById: async (id: number) => {
    return api.get<BodyMeasurement>(`/measurements/${id}`)
  },

  // The backend answers 204 when the athlete has no measurements yet (see the
  // `@Success 204` annotation on GET /measurements/latest). That "or null" cannot
  // be expressed in the generated OpenAPI types, so it is declared here by hand.
  getLatest: async (athleteId?: number): Promise<BodyMeasurement | null> => {
    return api.get<BodyMeasurement | null>("/measurements/latest", {
      params: athleteId ? { athleteId } : undefined
    })
  },

  update: async (id: number, data: UpdateBodyMeasurementRequest) => {
    return api.put<BodyMeasurement>(`/measurements/${id}`, data)
  },

  delete: async (id: number) => {
    return api.delete<MessageResponse>(`/measurements/${id}`)
  }
}

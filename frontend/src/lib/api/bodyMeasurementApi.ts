import {
  BodyMeasurement,
  CreateBodyMeasurementRequest,
  UpdateBodyMeasurementRequest
} from "@/types"
import api from "./api-client"
import {
  BodyMeasurementListResponse,
  MessageResponse,
  PaginationParams
} from "./api-types"

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

  getLatest: async (athleteId?: number) => {
    return api.get<BodyMeasurement>("/measurements/latest", {
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

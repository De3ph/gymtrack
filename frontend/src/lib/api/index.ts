import { TokenService } from "@/lib/token-service"
import { PaginationParams } from "@/lib/api/api-types"

import { authApi } from "./authApi"
import { userApi } from "./userApi"
import { workoutApi } from "./workoutApi"
import { mealApi } from "./mealApi"
import { commentApi } from "./commentApi"
import { relationshipApi } from "./relationshipApi"
import { trainerClientApi } from "./trainerClientApi"
import { trainerCatalogApi } from "./trainerCatalogApi"
import { availabilityApi } from "./availabilityApi"
import { reviewApi } from "./reviewApi"
import { coachingRequestApi } from "./coachingRequestApi"
import { exerciseApi } from "./exerciseApi"


const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api"

type FetchOptions = RequestInit & {
  params?: Record<string, unknown> | PaginationParams
  timeout?: number
}

async function request<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { params, headers, timeout, ...rest } = options

  const defaultHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...((headers as Record<string, string>) || {})
  }

  const authHeader = TokenService.getAuthHeader()
  if (authHeader) {
    defaultHeaders.Authorization = authHeader
  }

  let url = `${API_BASE_URL}${endpoint}`
  console.log('API Request URL:', url) // Debug log
  if (params) {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value))
      }
    })
    url += `?${searchParams.toString()}`
  }

  const controller = timeout !== undefined ? new AbortController() : undefined;
  const timeoutId = timeout !== undefined ? setTimeout(() => controller?.abort(), timeout) : undefined;

  const response = await fetch(url, {
    ...rest,
    headers: {
      ...defaultHeaders,
      ...(controller !== undefined && { 'X-Abbreviate': 'true' })
    },
    signal: controller?.signal
  })

  // Clear timeout immediately to prevent memory leaks
  if (controller) {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    let errorMessage = `HTTP error! status: ${response.status}`
    try {
      const errorData = await response.json()
      if (errorData && errorData.error) {
        errorMessage = errorData.error
      } else if (errorData && errorData.message) {
        errorMessage = errorData.message
      }
    } catch {
      // Ignored
    }

    throw new Error(errorMessage)
  }

  if (response.status === 204) {
    return {} as T
  }

  return response.json().catch(error => {
    // Re-throw abort errors with specific message
    if (error instanceof Error && error.message.includes('AbortError')) {
      throw new Error('Request timed out');
    }
    throw error;
  })
}

const api = {
  get: <T>(
    url: string,
    config?: { params?: Record<string, unknown> | PaginationParams } & FetchOptions
  ) => {
    return request<T>(url, { method: "GET", params: config?.params, ...config })
  },
  post: <T>(url: string, data: unknown, config?: FetchOptions) => {
    return request<T>(url, { method: "POST", body: JSON.stringify(data), ...config })
  },
  put: <T>(url: string, data: unknown, config?: FetchOptions) => {
    return request<T>(url, { method: "PUT", body: JSON.stringify(data), ...config })
  },
  delete: <T>(url: string, config?: FetchOptions) => {
    return request<T>(url, { method: "DELETE", ...config })
  }
}



export {
  authApi,
  userApi,
  commentApi,
  trainerClientApi,
  relationshipApi,
  workoutApi,
  trainerCatalogApi,
  mealApi,
  availabilityApi,
  reviewApi,
  coachingRequestApi,
  exerciseApi
}

export default api

import { tokenService } from "@/lib/token-service"
import { API_URL } from "@/lib/env"
import { API } from "@/lib/constants"
import { notifySessionExpired } from "@/lib/session-expiry"
import { refreshTokens } from "@/lib/auth-refresh"
import type { PaginationParams } from "@/types"

const API_BASE_URL = API_URL
const DEFAULT_TIMEOUT_MS = API.DEFAULT_TIMEOUT_MS

/**
 * An HTTP error that keeps the status code.
 *
 * The backend always answers with `{ "error": "..." }`, so before this class
 * existed the status code was thrown away and callers had to string-match
 * the message to tell a 401 from a 404. `status` makes that reliable.
 */
export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

/**
 * Endpoints that legitimately answer 401 without the session being dead
 * (wrong password, an expired refresh token, logging out with a token that
 * is already gone). They must never raise the session-expiry signal, or
 * logging out would re-open the modal it just dismissed.
 */
function isAuthEndpoint(endpoint: string): boolean {
  return endpoint.startsWith("/auth/")
}

type FetchOptions = RequestInit & {
  params?: Record<string, unknown> | PaginationParams
  timeout?: number
  /**
   * Internal: the request already failed with a 401 and was replayed once
   * after a token refresh. Guards against an endless refresh/retry loop.
   */
  _retriedAfterRefresh?: boolean
}

async function request<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const {
    params,
    headers,
    timeout = DEFAULT_TIMEOUT_MS,
    signal: externalSignal,
    _retriedAfterRefresh = false,
    ...rest
  } = options

  const defaultHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...((headers as Record<string, string>) || {})
  }

  const authHeader = tokenService.getAuthHeader()
  if (authHeader) {
    defaultHeaders.Authorization = authHeader
  }

  let url = `${API_BASE_URL}${endpoint}`
  if (params) {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value))
      }
    })
    url += `?${searchParams.toString()}`
  }

  // Every request gets a timeout so hung connections abort instead of hanging
  // forever. Callers can override via `timeout`, or opt out with `timeout: 0`.
  // An externally passed AbortSignal still aborts independently.
  const controller = new AbortController()
  const onExternalAbort = () => controller.abort()
  externalSignal?.addEventListener("abort", onExternalAbort, { once: true })
  const timeoutId =
    timeout > 0 ? setTimeout(() => controller.abort(), timeout) : undefined

  let response: Response
  try {
    // Intentionally omit the X-Abbreviate header. The backend allows it in CORS,
    // but no handler consumes it, so it is not required for this client flow.
    response = await fetch(url, {
      ...rest,
      headers: {
        ...defaultHeaders
      },
      signal: controller.signal
    })
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Request timed out")
    }
    throw error
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId)
    }
    externalSignal?.removeEventListener("abort", onExternalAbort)
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

    // A 401 on a request that carried an Authorization header means the
    // access token is no longer accepted. The access token is short-lived
    // while the session lasts days, so try one silent refresh first and
    // replay the request. Only when the refresh token is rejected too is
    // the session really over.
    if (response.status === 401 && authHeader && !isAuthEndpoint(endpoint)) {
      if (!_retriedAfterRefresh) {
        const outcome = await refreshTokens()
        if (outcome === "refreshed") {
          return request<T>(endpoint, { ...options, _retriedAfterRefresh: true })
        }
        if (outcome === "unavailable") {
          // The refresh could not be carried out (offline, server error).
          // The session may well still be alive, so surface the error
          // instead of ending the session.
          throw new ApiError(errorMessage, response.status)
        }
      }
      // The refresh token was rejected — nothing left to try, so tell the
      // app the session is dead and the user has to log out.
      notifySessionExpired()
    }

    throw new ApiError(errorMessage, response.status)
  }

  // A 204 carries no body, so there is nothing to parse. Returning `{}` here used
  // to fabricate an empty object that callers typed as their real response model,
  // so an "absent" resource silently arrived as a valid-looking value with every
  // field undefined. `null` states the truth and forces callers to handle it.
  if (response.status === 204) {
    return null as T
  }

  return response.json()
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

export default api

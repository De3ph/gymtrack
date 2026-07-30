import * as authLib from "@/lib/auth";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || "http://localhost:8080/api";

type SessionExpiredHandler = () => void;

let onSessionExpired: SessionExpiredHandler = () => {};

/** Register handler called when session expires and cannot be refreshed. */
export function setSessionExpiredHandler(handler: SessionExpiredHandler) {
  onSessionExpired = handler;
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  params?: Record<string, string>;
  headers?: Record<string, string>;
  timeout?: number;
}

export async function apiRequest<T = unknown>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = "GET", body, params, headers = {}, timeout = 15000 } = options;

  const url = new URL(`${API_BASE_URL}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }

  const token = await authLib.getAccessToken();
  const authHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...headers,
  };
  if (token) {
    authHeaders["Authorization"] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url.toString(), {
      method,
      headers: authHeaders,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    if (response.status === 401) {
      const refreshed = await tryRefreshToken();
      if (refreshed) {
        return apiRequest<T>(endpoint, options);
      }
      authLib.clearTokens();
      onSessionExpired();
      throw new Error("Session expired. Please login again.");
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: `HTTP ${response.status}`,
      }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    if (response.status === 204) return undefined as T;
    return response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

async function tryRefreshToken(): Promise<boolean> {
  try {
    const refreshToken = await authLib.getRefreshToken();
    if (!refreshToken) return false;

    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      await authLib.clearTokens();
      return false;
    }

    const { accessToken } = await response.json();
    await authLib.setAccessToken(accessToken);
    return true;
  } catch {
    await authLib.clearTokens();
    return false;
  }
}

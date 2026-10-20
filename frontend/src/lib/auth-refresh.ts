"use client";

import { tokenService } from "@/lib/token-service";
import { API_URL } from "@/lib/env";

/**
 * Why a refresh attempt ended the way it did.
 *
 * - "refreshed"   the access token was renewed and is in memory.
 * - "rejected"   the refresh token is no longer accepted — the session is
 *                 genuinely over and the user has to log in again.
 * - "unavailable" the refresh could not be carried out (offline, timeout,
 *                 5xx, malformed answer). The session may well still be
 *                 alive, so the caller must NOT end the session.
 */
export type RefreshOutcome = "refreshed" | "rejected" | "unavailable";

const SESSION_API = "/api/auth/session";

/**
 * Single-flight refresh: concurrent 401s must share ONE in-flight refresh.
 * Without this, N parallel requests each POST /auth/refresh with the same
 * refresh token — wasteful at best, and with rotation the losers would
 * redeem an already-consumed token and log the user out.
 */
let refreshInFlight: Promise<RefreshOutcome> | null = null;

type TokenRefreshedListener = (accessToken: string) => void;

const tokenListeners = new Set<TokenRefreshedListener>();

/**
 * Subscribe to renewed access tokens.
 *
 * The refresh lives outside the auth store so that the API client can call
 * it without importing the store (that would be a module cycle). This
 * listener is how the store learns about a token it did not fetch itself.
 */
export function onTokenRefreshed(listener: TokenRefreshedListener): () => void {
  tokenListeners.add(listener);
  return () => {
    tokenListeners.delete(listener);
  };
}

function announceToken(accessToken: string) {
  for (const listener of Array.from(tokenListeners)) {
    try {
      listener(accessToken);
    } catch (error) {
      console.error("Token refresh listener failed:", error);
    }
  }
}

interface RefreshResponse {
  accessToken?: string;
  refreshToken?: string;
}

async function performRefresh(): Promise<RefreshOutcome> {
  const refreshToken = tokenService.getRefreshToken();

  if (!refreshToken) {
    // Nothing to renew the session with — the session is over.
    return "rejected";
  }

  let response: Response;
  try {
    // Raw fetch on purpose: going through the API client would create a
    // cycle (api-client -> auth-refresh -> api-client).
    response = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
    // Offline / DNS / connection reset. The session may still be alive.
    return "unavailable";
  }

  if (response.status === 401 || response.status === 403) {
    // The refresh token itself is gone — the session is genuinely over.
    return "rejected";
  }

  if (!response.ok) {
    // Server error: the session may still be alive.
    return "unavailable";
  }

  let data: RefreshResponse;
  try {
    data = (await response.json()) as RefreshResponse;
  } catch {
    return "unavailable";
  }

  if (!data?.accessToken) {
    return "unavailable";
  }

  // Handle refresh-token rotation: if the backend issues a new refresh
  // token, use it; otherwise reuse the existing one.
  const effectiveRefreshToken = data.refreshToken || refreshToken;

  // Update both in-memory tokens
  tokenService.setTokens(data.accessToken, effectiveRefreshToken);

  // Update the HttpOnly cookies with the refreshed tokens. The server
  // derives userId/role from the backend, so they are not sent here.
  //
  // A failure here must NOT invalidate the refresh that just succeeded: the
  // in-memory access token is already usable, so this is best-effort.
  try {
    await fetch(SESSION_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accessToken: data.accessToken,
        refreshToken: effectiveRefreshToken,
      }),
    });
  } catch (error) {
    console.error("Failed to sync the refreshed session cookie:", error);
  }

  announceToken(data.accessToken);

  return "refreshed";
}

/**
 * Renew the access token, at most once at a time.
 */
export function refreshTokens(): Promise<RefreshOutcome> {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = performRefresh().finally(() => {
    // Clear only this attempt so the next expiry starts a fresh one.
    // Concurrent callers that awaited the same promise are unaffected.
    refreshInFlight = null;
  });

  return refreshInFlight;
}

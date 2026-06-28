"use client";

/**
 * Centralized token management service
 * Handles token storage, retrieval, and validation
 *
 * Tokens are stored in-memory only — no localStorage/XSS surface.
 * On page refresh, authStore.initializeAuth() recovers tokens from
 * the HttpOnly session cookie via GET /api/auth/session.
 *
 * Client-only: do not import from server components, route handlers,
 * or middleware — server code must read tokens from the encrypted
 * session cookie via the request context.
 */

class TokenService {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  /** Get the stored access token */
  getAccessToken(): string | null {
    return this.accessToken;
  }

  /** Get the stored refresh token */
  getRefreshToken(): string | null {
    return this.refreshToken;
  }

  /** Backward-compat alias for getAccessToken() */
  get(): string | null {
    return this.getAccessToken();
  }

  /** Store both access and refresh tokens in memory */
  setTokens(accessToken: string, refreshToken: string): void {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
  }

  /** Store the access token only (backward-compat alias) */
  set(token: string): void {
    this.accessToken = token;
  }

  /** Clear both tokens from memory */
  remove(): void {
    this.accessToken = null;
    this.refreshToken = null;
  }

  /** Check if access token exists and is not empty */
  exists(): boolean {
    return this.accessToken !== null && this.accessToken.trim().length > 0;
  }

  /** Check if refresh token exists and is not empty */
  hasRefreshToken(): boolean {
    return this.refreshToken !== null && this.refreshToken.trim().length > 0;
  }

  /** Validate token format (basic validation) */
  isValid(token: string): boolean {
    return typeof token === "string" && token.trim().length > 0;
  }

  /** Get the Authorization header value for API requests */
  getAuthHeader(): string | undefined {
    const token = this.getAccessToken();
    if (!token || !this.isValid(token)) {
      return undefined;
    }
    return `Bearer ${token}`;
  }
}

// Module-level singleton — instance state shared by all client callers
// in the same JS context (single tab, single user).
export const tokenService = new TokenService();

/**
 * Centralized token management service
 * Handles token storage, retrieval, and validation
 *
 * Tokens are stored in-memory only — no localStorage/XSS surface.
 * On page refresh, authStore.initializeAuth() recovers tokens from
 * the HttpOnly session cookie via GET /api/auth/session.
 */

export class TokenService {
  private static accessToken: string | null = null
  private static refreshToken: string | null = null

  /**
   * Get the stored access token
   */
  static getAccessToken(): string | null {
    return this.accessToken
  }

  /**
   * Get the stored refresh token
   */
  static getRefreshToken(): string | null {
    return this.refreshToken
  }

  /**
   * Get the stored access token (for backward compatibility)
   */
  static get(): string | null {
    return this.getAccessToken()
  }

  /**
   * Store both access and refresh tokens in memory
   */
  static setTokens(accessToken: string, refreshToken: string): void {
    this.accessToken = accessToken
    this.refreshToken = refreshToken
  }

  /**
   * Store the access token only (for backward compatibility)
   */
  static set(token: string): void {
    this.accessToken = token
  }

  /**
   * Clear both tokens from memory
   */
  static remove(): void {
    this.accessToken = null
    this.refreshToken = null
  }

  /**
   * Check if access token exists and is not empty
   */
  static exists(): boolean {
    return this.accessToken !== null && this.accessToken.trim().length > 0
  }

  /**
   * Check if refresh token exists and is not empty
   */
  static hasRefreshToken(): boolean {
    return this.refreshToken !== null && this.refreshToken.trim().length > 0
  }

  /**
   * Validate token format (basic validation)
   */
  static isValid(token: string): boolean {
    return typeof token === 'string' && token.trim().length > 0
  }

  /**
   * Get the Authorization header value for API requests
   */
  static getAuthHeader(): string | undefined {
    const token = this.getAccessToken()
    if (!token || !this.isValid(token)) {
      return undefined
    }

    return `Bearer ${token}`
  }
}

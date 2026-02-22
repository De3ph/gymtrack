/**
 * Centralized token management service
 * Handles token storage, retrieval, and validation
 */

export class TokenService {
  private static readonly ACCESS_TOKEN_KEY = 'accessToken';
  private static readonly REFRESH_TOKEN_KEY = 'refreshToken';

  /**
   * Get the stored access token
   * @returns The access token string or null if not found
   */
  static getAccessToken(): string | null {
    if (typeof window === 'undefined') {
      return null;
    }
    
    try {
      return localStorage.getItem(this.ACCESS_TOKEN_KEY);
    } catch (error) {
      console.error('Failed to retrieve access token from localStorage:', error);
      return null;
    }
  }

  /**
   * Get the stored refresh token
   * @returns The refresh token string or null if not found
   */
  static getRefreshToken(): string | null {
    if (typeof window === 'undefined') {
      return null;
    }
    
    try {
      return localStorage.getItem(this.REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error('Failed to retrieve refresh token from localStorage:', error);
      return null;
    }
  }

  /**
   * Get the stored access token (for backward compatibility)
   * @returns The token string or null if not found
   */
  static get(): string | null {
    return this.getAccessToken();
  }

  /**
   * Store both access and refresh tokens
   * @param accessToken - The access token string to store
   * @param refreshToken - The refresh token string to store
   */
  static setTokens(accessToken: string, refreshToken: string): void {
    if (typeof window === 'undefined') {
      return;
    }
    
    try {
      localStorage.setItem(this.ACCESS_TOKEN_KEY, accessToken);
      localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
    } catch (error) {
      console.error('Failed to store tokens in localStorage:', error);
    }
  }

  /**
   * Store the access token only (for backward compatibility)
   * @param token - The token string to store
   */
  static set(token: string): void {
    this.setTokens(token, '');
  }

  /**
   * Remove both stored tokens
   */
  static remove(): void {
    if (typeof window === 'undefined') {
      return;
    }
    
    try {
      localStorage.removeItem(this.ACCESS_TOKEN_KEY);
      localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error('Failed to remove tokens from localStorage:', error);
    }
  }

  /**
   * Check if access token exists and is not empty
   * @returns True if a valid access token exists
   */
  static exists(): boolean {
    const token = this.getAccessToken();
    return token !== null && token.trim().length > 0;
  }

  /**
   * Check if refresh token exists and is not empty
   * @returns True if a valid refresh token exists
   */
  static hasRefreshToken(): boolean {
    const token = this.getRefreshToken();
    return token !== null && token.trim().length > 0;
  }

  /**
   * Validate token format (basic validation)
   * @param token - The token to validate
   * @returns True if token appears to be in valid format
   */
  static isValid(token: string): boolean {
    // Basic validation - token should be a non-empty string
    // More sophisticated validation can be added based on JWT structure
    return typeof token === 'string' && token.trim().length > 0;
  }

  /**
   * Get the Authorization header value for API requests
   * @returns The Authorization header value or undefined if no token
   */
  static getAuthHeader(): string | undefined {
    const token = this.getAccessToken();
    if (!token || !this.isValid(token)) {
      return undefined;
    }
    
    return `Bearer ${token}`;
  }
}

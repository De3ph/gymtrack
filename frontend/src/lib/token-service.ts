/**
 * Centralized token management service
 * Handles token storage, retrieval, and validation
 */

export class TokenService {
  private static readonly TOKEN_KEY = 'token';

  /**
   * Get the stored authentication token
   * @returns The token string or null if not found
   */
  static get(): string | null {
    if (typeof window === 'undefined') {
      return null;
    }
    
    try {
      return localStorage.getItem(this.TOKEN_KEY);
    } catch (error) {
      console.error('Failed to retrieve token from localStorage:', error);
      return null;
    }
  }

  /**
   * Store the authentication token
   * @param token - The token string to store
   */
  static set(token: string): void {
    if (typeof window === 'undefined') {
      return;
    }
    
    try {
      localStorage.setItem(this.TOKEN_KEY, token);
    } catch (error) {
      console.error('Failed to store token in localStorage:', error);
    }
  }

  /**
   * Remove the stored authentication token
   */
  static remove(): void {
    if (typeof window === 'undefined') {
      return;
    }
    
    try {
      localStorage.removeItem(this.TOKEN_KEY);
    } catch (error) {
      console.error('Failed to remove token from localStorage:', error);
    }
  }

  /**
   * Check if a token exists and is not empty
   * @returns True if a valid token exists
   */
  static exists(): boolean {
    const token = this.get();
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
    const token = this.get();
    if (!token || !this.isValid(token)) {
      return undefined;
    }
    
    return `Bearer ${token}`;
  }
}

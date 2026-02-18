/**
 * Centralized error handling utility for API errors
 * Provides consistent error message formatting and logging
 */

export class ApiErrorHandler {
  /**
   * Handle API errors and return user-friendly messages
   * @param error - The error object from API calls
   * @returns User-friendly error message
   */
  static handle(error: unknown): string {
    // Log the full error for debugging
    console.error('API Error:', error);

    if (error instanceof Error) {
      const message = error.message;
      
      // Handle specific HTTP error patterns
      if (message.includes('401') || message.includes('403')) {
        return 'Authentication required. Please log in again.';
      }
      
      if (message.includes('400')) {
        return 'Invalid request. Please check your input and try again.';
      }
      
      if (message.includes('404')) {
        return 'The requested resource was not found.';
      }
      
      if (message.includes('500')) {
        return 'Server error. Please try again later.';
      }
      
      if (message.includes('network') || message.includes('fetch')) {
        return 'Network error. Please check your connection and try again.';
      }
      
      // Return the original message if it's a user-friendly format
      if (message.length < 100 && !message.includes('HTTP error!')) {
        return message;
      }
      
      // Fallback for technical error messages
      return 'An error occurred. Please try again.';
    }
    
    // Handle non-Error objects
    if (typeof error === 'string') {
      return error.length < 100 ? error : 'An error occurred. Please try again.';
    }
    
    return 'An unexpected error occurred. Please try again.';
  }

  /**
   * Check if an error is an authentication error
   * @param error - The error object
   * @returns True if this is an auth-related error
   */
  static isAuthError(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return message.includes('401') || 
             message.includes('403') || 
             message.includes('unauthorized') ||
             message.includes('token');
    }
    return false;
  }

  /**
   * Check if an error is a network error
   * @param error - The error object
   * @returns True if this is a network-related error
   */
  static isNetworkError(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return message.includes('network') || 
             message.includes('fetch') ||
             message.includes('failed to fetch');
    }
    return false;
  }
}

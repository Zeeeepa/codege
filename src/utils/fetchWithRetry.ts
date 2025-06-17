/**
 * Utility for making fetch requests with automatic retry
 */

interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  retryStatusCodes?: number[];
  timeout?: number;
}

/**
 * Check if the browser is online
 * 
 * @returns True if the browser is online, false otherwise
 */
function isOnline(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean' 
    ? navigator.onLine 
    : true; // Assume online if we can't determine
}

/**
 * Create a fetch request with timeout
 * 
 * @param url The URL to fetch
 * @param options Fetch options
 * @param timeout Timeout in milliseconds
 * @returns Promise with the fetch response
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout: number = 30000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    // Check if we're online before attempting fetch
    if (!isOnline()) {
      throw new Error('No internet connection. Please check your network and try again.');
    }
    
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    
    return response;
  } catch (error) {
    // Enhance error message for specific error types
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeout}ms`);
    }
    
    // Enhance network error messages
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      if (!isOnline()) {
        throw new Error('No internet connection. Please check your network and try again.');
      } else {
        throw new Error('Network error. This could be due to CORS restrictions, an incorrect API URL, or server unavailability.');
      }
    }
    
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetch with automatic retry for transient errors
 * 
 * @param url The URL to fetch
 * @param options Fetch options
 * @param retryOptions Retry configuration
 * @returns Promise with the fetch response
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retryOptions: RetryOptions = {}
): Promise<Response> {
  const {
    maxRetries = 2,
    retryDelay = 500,
    retryStatusCodes = [408, 429, 500, 502, 503, 504],
    timeout = 30000
  } = retryOptions;

  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Check if we're online before attempting fetch
      if (!isOnline()) {
        throw new Error('No internet connection. Please check your network and try again.');
      }
      
      // Make the fetch request with timeout
      const response = await fetchWithTimeout(url, options, timeout);
      
      // If the response is ok or it's not a retryable status code, return it
      if (response.ok || !retryStatusCodes.includes(response.status)) {
        return response;
      }
      
      // Log retry for retryable status codes
      console.warn(`🔄 Retrying fetch due to status ${response.status} (attempt ${attempt + 1}/${maxRetries + 1})`);
      
      // Wait before retrying
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry for certain errors
      if (
        lastError.message.includes('No internet connection') ||
        lastError.message.includes('CORS') ||
        lastError.message.includes('incorrect API URL')
      ) {
        throw lastError;
      }
      
      // Log retry for network errors
      console.warn(`🔄 Retrying fetch due to error: ${lastError.message} (attempt ${attempt + 1}/${maxRetries + 1})`);
      
      // Wait before retrying
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
      }
    }
  }
  
  // If we've exhausted all retries, throw the last error
  throw lastError || new Error('Failed to fetch after multiple retries');
}


/**
 * Utility for making fetch requests with automatic retry
 */

interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  retryStatusCodes?: number[];
  timeout?: number;
  exponentialBackoff?: boolean;
  retryOnNetworkError?: boolean;
  onRetry?: (attempt: number, error: Error | null, response?: Response) => void;
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
    
    // Add signal to options if not already present
    const fetchOptions = {
      ...options,
      signal: options.signal || controller.signal
    };
    
    console.log(`🌐 Fetching ${url} with timeout ${timeout}ms`);
    const response = await fetch(url, fetchOptions);
    
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
    maxRetries = 3,
    retryDelay = 500,
    retryStatusCodes = [408, 429, 500, 502, 503, 504],
    timeout = 30000,
    exponentialBackoff = true,
    retryOnNetworkError = true,
    onRetry = undefined
  } = retryOptions;

  let lastError: Error | null = null;
  let lastResponse: Response | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Check if we're online before attempting fetch
      if (!isOnline()) {
        const offlineError = new Error('No internet connection. Please check your network and try again.');
        if (onRetry) onRetry(attempt, offlineError);
        throw offlineError;
      }
      
      // Calculate current timeout with exponential increase for retries
      const currentTimeout = attempt > 0 && exponentialBackoff 
        ? timeout * (1 + (attempt * 0.5)) 
        : timeout;
      
      // Make the fetch request with timeout
      const response = await fetchWithTimeout(url, options, currentTimeout);
      lastResponse = response;
      
      // If the response is ok or it's not a retryable status code, return it
      if (response.ok || !retryStatusCodes.includes(response.status)) {
        return response;
      }
      
      // Log retry for retryable status codes
      console.warn(`🔄 Retrying fetch due to status ${response.status} (attempt ${attempt + 1}/${maxRetries + 1})`);
      
      // Call onRetry callback if provided
      if (onRetry) onRetry(attempt, null, response);
      
      // Wait before retrying
      if (attempt < maxRetries) {
        const delay = exponentialBackoff 
          ? retryDelay * Math.pow(2, attempt) 
          : retryDelay;
        
        console.log(`⏱️ Waiting ${delay}ms before retry ${attempt + 1}`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry for certain errors unless explicitly enabled
      const isNetworkError = 
        lastError.message.includes('Failed to fetch') ||
        lastError.message.includes('Network error') ||
        lastError.message.includes('timeout');
      
      if (
        lastError.message.includes('No internet connection') ||
        lastError.message.includes('CORS') ||
        lastError.message.includes('incorrect API URL') ||
        (isNetworkError && !retryOnNetworkError)
      ) {
        throw lastError;
      }
      
      // Log retry for network errors
      console.warn(`🔄 Retrying fetch due to error: ${lastError.message} (attempt ${attempt + 1}/${maxRetries + 1})`);
      
      // Call onRetry callback if provided
      if (onRetry) onRetry(attempt, lastError);
      
      // Wait before retrying
      if (attempt < maxRetries) {
        const delay = exponentialBackoff 
          ? retryDelay * Math.pow(2, attempt) 
          : retryDelay;
        
        console.log(`⏱️ Waiting ${delay}ms before retry ${attempt + 1}`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // If we've exhausted all retries, throw the last error or create one from the response
  if (lastError) {
    throw lastError;
  } else if (lastResponse) {
    throw new Error(`Failed to fetch after ${maxRetries} retries. Last status: ${lastResponse.status}`);
  } else {
    throw new Error('Failed to fetch after multiple retries');
  }
}


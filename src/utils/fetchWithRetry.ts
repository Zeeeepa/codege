/**
 * Utility for making fetch requests with automatic retry
 */

interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  retryStatusCodes?: number[];
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
    retryStatusCodes = [408, 429, 500, 502, 503, 504]
  } = retryOptions;

  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Make the fetch request
      const response = await fetch(url, options);
      
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


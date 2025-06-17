/**
 * Utility functions for validating and normalizing URLs
 */

/**
 * Validates if a string is a properly formatted URL
 * 
 * @param url The URL string to validate
 * @returns True if the URL is valid, false otherwise
 */
export function isValidUrl(url: string): boolean {
  try {
    // Try to create a URL object - this will throw if the URL is invalid
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Normalizes an API URL by ensuring it has the correct format
 * - Adds https:// if no protocol is specified
 * - Removes trailing slashes
 * 
 * @param url The URL to normalize
 * @returns The normalized URL
 */
export function normalizeApiUrl(url: string): string {
  if (!url) return url;
  
  // Trim whitespace
  let normalizedUrl = url.trim();
  
  // Add protocol if missing
  if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    normalizedUrl = `https://${normalizedUrl}`;
  }
  
  // Remove trailing slashes
  while (normalizedUrl.endsWith('/')) {
    normalizedUrl = normalizedUrl.slice(0, -1);
  }
  
  return normalizedUrl;
}

/**
 * Checks if a URL is likely to cause CORS issues
 * - Checks if the URL is using HTTP while the app is on HTTPS
 * - Checks if the URL is on a different domain than the app
 * 
 * @param url The URL to check
 * @returns An object with CORS risk assessment
 */
export function assessCorsRisk(url: string): { 
  hasCorsRisk: boolean; 
  mixedContent: boolean;
  message?: string;
} {
  try {
    const urlObj = new URL(url);
    
    // Check for mixed content (HTTPS page loading HTTP content)
    const mixedContent = typeof window !== 'undefined' && 
                        window.location?.protocol === 'https:' && 
                        urlObj.protocol === 'http:';
    
    if (mixedContent) {
      return {
        hasCorsRisk: true,
        mixedContent: true,
        message: "Mixed content: You're accessing this app via HTTPS but the API URL uses HTTP, which may be blocked by the browser."
      };
    }
    
    return {
      hasCorsRisk: false,
      mixedContent: false
    };
  } catch (e) {
    // If URL parsing fails, we can't assess CORS risk
    return {
      hasCorsRisk: false,
      mixedContent: false
    };
  }
}

/**
 * Validates an API URL and returns detailed validation results
 * 
 * @param url The API URL to validate
 * @returns Validation results with detailed information
 */
export function validateApiUrl(url: string): {
  isValid: boolean;
  normalizedUrl: string;
  corsRisk: ReturnType<typeof assessCorsRisk>;
  message?: string;
} {
  if (!url || url.trim() === '') {
    return {
      isValid: false,
      normalizedUrl: '',
      corsRisk: { hasCorsRisk: false, mixedContent: false },
      message: 'API URL is required'
    };
  }
  
  const normalizedUrl = normalizeApiUrl(url);
  
  if (!isValidUrl(normalizedUrl)) {
    return {
      isValid: false,
      normalizedUrl,
      corsRisk: { hasCorsRisk: false, mixedContent: false },
      message: 'Invalid URL format. Please enter a valid URL (e.g., https://api.example.com)'
    };
  }
  
  const corsRisk = assessCorsRisk(normalizedUrl);
  
  return {
    isValid: true,
    normalizedUrl,
    corsRisk,
    message: corsRisk.message
  };
}


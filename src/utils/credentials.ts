/**
 * Credentials utility for managing API tokens and credentials
 */

import { LocalStorage } from './webStorage';

// Storage keys
const STORAGE_KEYS = {
  API_TOKEN: 'codegen_api_token',
  ORG_ID: 'codegen_org_id',
  API_BASE_URL: 'codegen_api_base_url',
};

// Default API base URL
const DEFAULT_API_BASE_URL = 'https://api.codegen.com';

// Credentials interface
export interface CodegenCredentials {
  apiToken: string | null;
  organizationId: number | null;
  apiBaseUrl: string | null;
}

/**
 * Get stored credentials from localStorage
 */
export async function getCredentials(): Promise<CodegenCredentials> {
  try {
    const apiToken = await LocalStorage.getItem(STORAGE_KEYS.API_TOKEN) || null;
    const orgIdStr = await LocalStorage.getItem(STORAGE_KEYS.ORG_ID) || null;
    const apiBaseUrl = await LocalStorage.getItem(STORAGE_KEYS.API_BASE_URL) || DEFAULT_API_BASE_URL;
    
    // Parse organization ID as number
    let organizationId: number | null = null;
    if (orgIdStr) {
      try {
        organizationId = parseInt(orgIdStr, 10);
        if (isNaN(organizationId)) {
          organizationId = null;
        }
      } catch (e) {
        console.error('Failed to parse organization ID:', e);
      }
    }
    
    return {
      apiToken,
      organizationId,
      apiBaseUrl,
    };
  } catch (error) {
    console.error('Failed to get credentials from storage:', error);
    return {
      apiToken: null,
      organizationId: null,
      apiBaseUrl: DEFAULT_API_BASE_URL,
    };
  }
}

/**
 * Save credentials to localStorage
 */
export async function saveCredentials(credentials: Partial<CodegenCredentials>): Promise<void> {
  try {
    if (credentials.apiToken !== undefined) {
      await LocalStorage.setItem(STORAGE_KEYS.API_TOKEN, credentials.apiToken || '');
    }
    
    if (credentials.organizationId !== undefined) {
      await LocalStorage.setItem(STORAGE_KEYS.ORG_ID, credentials.organizationId?.toString() || '');
    }
    
    if (credentials.apiBaseUrl !== undefined) {
      await LocalStorage.setItem(STORAGE_KEYS.API_BASE_URL, credentials.apiBaseUrl || DEFAULT_API_BASE_URL);
    }
  } catch (error) {
    console.error('Failed to save credentials to storage:', error);
    throw error;
  }
}

/**
 * Clear all stored credentials
 */
export async function clearCredentials(): Promise<void> {
  try {
    await LocalStorage.removeItem(STORAGE_KEYS.API_TOKEN);
    await LocalStorage.removeItem(STORAGE_KEYS.ORG_ID);
    await LocalStorage.removeItem(STORAGE_KEYS.API_BASE_URL);
  } catch (error) {
    console.error('Failed to clear credentials from storage:', error);
    throw error;
  }
}

/**
 * Validate API token format
 */
export function validateApiToken(token: string | null): boolean {
  if (!token) return false;
  
  // Simple validation - token should be at least 32 characters
  return token.length >= 32;
}

/**
 * Validate organization ID
 */
export function validateOrganizationId(orgId: number | null): boolean {
  if (!orgId) return false;
  
  // Simple validation - organization ID should be a positive integer
  return Number.isInteger(orgId) && orgId > 0;
}

/**
 * Validate API base URL
 */
export function validateApiBaseUrl(url: string | null): boolean {
  if (!url) return false;
  
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'https:' || urlObj.protocol === 'http:';
  } catch (e) {
    return false;
  }
}


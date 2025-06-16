/**
 * Web-compatible preferences system that matches Raycast's getPreferenceValues API
 */

import { LocalStorage } from "./webStorage";

export interface PreferenceValues {
  [key: string]: any;
}

const PREFERENCES_KEY = 'app_preferences';

// Default preferences that can be overridden by environment variables or user settings
const DEFAULT_PREFERENCES = {
  apiToken: '',
  defaultOrganization: '',
  userId: '',
  apiBaseUrl: 'https://api.codegen.com',
};

class WebPreferences {
  private cachedPreferences: PreferenceValues | null = null;

  /**
   * Get preference values with environment variable and localStorage support
   */
  async getPreferenceValues<T extends PreferenceValues = PreferenceValues>(): Promise<T> {
    if (this.cachedPreferences) {
      return this.cachedPreferences as T;
    }

    // Load from localStorage
    const storedPreferences = await LocalStorage.getItem<PreferenceValues>(PREFERENCES_KEY) || {};
    
    // Merge with defaults and environment variables
    const preferences: PreferenceValues = {
      ...DEFAULT_PREFERENCES,
      ...storedPreferences,
    };

    // Override with environment variables if available
    if (typeof window !== 'undefined') {
      // Check for environment variables in various ways
      const envVars = this.getEnvironmentVariables();
      Object.assign(preferences, envVars);
    }

    this.cachedPreferences = preferences;
    return preferences as T;
  }

  /**
   * Set preference values
   */
  async setPreferenceValues(preferences: Partial<PreferenceValues>): Promise<void> {
    const currentPreferences = await this.getPreferenceValues();
    const updatedPreferences = { ...currentPreferences, ...preferences };
    
    await LocalStorage.setItem(PREFERENCES_KEY, JSON.stringify(updatedPreferences));
    this.cachedPreferences = updatedPreferences;
    
    // Emit change event
    this.emitPreferencesChange(updatedPreferences);
  }

  /**
   * Get a specific preference value
   */
  async getPreference<T = any>(key: string, defaultValue?: T): Promise<T> {
    const preferences = await this.getPreferenceValues();
    return preferences[key] !== undefined ? preferences[key] : defaultValue;
  }

  /**
   * Set a specific preference value
   */
  async setPreference(key: string, value: any): Promise<void> {
    await this.setPreferenceValues({ [key]: value });
  }

  /**
   * Clear all preferences
   */
  async clearPreferences(): Promise<void> {
    await LocalStorage.removeItem(PREFERENCES_KEY);
    this.cachedPreferences = null;
  }

  /**
   * Get environment variables from various sources
   */
  private getEnvironmentVariables(): PreferenceValues {
    const envVars: PreferenceValues = {};

    // Check for common environment variable patterns
    const envMappings = {
      CODEGEN_API_TOKEN: 'apiToken',
      CODEGEN_ORG_ID: 'defaultOrganization',
      CODEGEN_USER_ID: 'userId',
      CODEGEN_API_BASE_URL: 'apiBaseUrl',
      RAYCAST_CODEGEN_API_BASE_URL: 'apiBaseUrl', // Legacy support
    };

    // Try to get from process.env (Node.js/build time)
    if (typeof process !== 'undefined' && process.env) {
      for (const [envKey, prefKey] of Object.entries(envMappings)) {
        if (process.env[envKey]) {
          envVars[prefKey] = process.env[envKey];
        }
      }
    }

    // Try to get from window (runtime environment variables)
    if (typeof window !== 'undefined') {
      // Check for variables set on window object
      const windowEnv = (window as any).ENV || {};
      for (const [envKey, prefKey] of Object.entries(envMappings)) {
        if (windowEnv[envKey]) {
          envVars[prefKey] = windowEnv[envKey];
        }
      }

      // Check for data attributes on document
      const htmlElement = document.documentElement;
      for (const [envKey, prefKey] of Object.entries(envMappings)) {
        const dataAttr = `data-${envKey.toLowerCase().replace(/_/g, '-')}`;
        const value = htmlElement.getAttribute(dataAttr);
        if (value) {
          envVars[prefKey] = value;
        }
      }
    }

    return envVars;
  }

  /**
   * Emit preferences change event
   */
  private emitPreferencesChange(preferences: PreferenceValues): void {
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('preferences-changed', { 
        detail: preferences 
      });
      window.dispatchEvent(event);
    }
  }

  /**
   * Listen for preferences changes
   */
  onPreferencesChange(callback: (preferences: PreferenceValues) => void): () => void {
    const handleChange = (event: CustomEvent) => {
      callback(event.detail);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('preferences-changed', handleChange as EventListener);
      
      return () => {
        window.removeEventListener('preferences-changed', handleChange as EventListener);
      };
    }

    return () => {}; // No-op cleanup for non-browser environments
  }
}

// Create singleton instance
const webPreferences = new WebPreferences();

// Export function that matches Raycast API
export function getPreferenceValues<T extends PreferenceValues = PreferenceValues>(): T {
  // For synchronous compatibility, we'll need to handle this differently
  // This is a limitation when converting from sync to async API
  if (webPreferences['cachedPreferences']) {
    return webPreferences['cachedPreferences'] as T;
  }
  
  // If no cached preferences, return defaults and trigger async load
  webPreferences.getPreferenceValues().catch(console.error);
  return DEFAULT_PREFERENCES as T;
}

// Export async version for better control
export async function getPreferenceValuesAsync<T extends PreferenceValues = PreferenceValues>(): Promise<T> {
  return webPreferences.getPreferenceValues<T>();
}

// Export other utility functions
export const {
  setPreferenceValues,
  getPreference,
  setPreference,
  clearPreferences,
  onPreferencesChange,
} = webPreferences;

// Initialize preferences on module load
if (typeof window !== 'undefined') {
  webPreferences.getPreferenceValues().catch(console.error);
}

export default webPreferences;


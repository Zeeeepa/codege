/**
 * Web preferences utility for managing user preferences
 */

import { LocalStorage } from './webStorage';

// Storage key for preferences
const PREFERENCES_STORAGE_KEY = 'codegen_preferences';

// Default preferences
const DEFAULT_PREFERENCES = {
  theme: 'dark',
  enableNotifications: true,
  enableAnalytics: true,
  enableOfflineMode: false,
  showHiddenFiles: false,
  editorFontSize: 14,
  editorTabSize: 2,
  editorWordWrap: true,
};

// Preferences interface
export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  enableNotifications: boolean;
  enableAnalytics: boolean;
  enableOfflineMode: boolean;
  showHiddenFiles: boolean;
  editorFontSize: number;
  editorTabSize: number;
  editorWordWrap: boolean;
}

/**
 * Get user preferences from localStorage
 */
export function getPreferenceValues(): UserPreferences {
  try {
    const storedPrefs = localStorage.getItem(PREFERENCES_STORAGE_KEY);
    if (!storedPrefs) {
      return DEFAULT_PREFERENCES;
    }
    
    const parsedPrefs = JSON.parse(storedPrefs);
    return {
      ...DEFAULT_PREFERENCES,
      ...parsedPrefs,
    };
  } catch (error) {
    console.error('Failed to get preferences from storage:', error);
    return DEFAULT_PREFERENCES;
  }
}

/**
 * Save user preferences to localStorage
 */
export function savePreferenceValues(preferences: Partial<UserPreferences>): void {
  try {
    const currentPrefs = getPreferenceValues();
    const updatedPrefs = {
      ...currentPrefs,
      ...preferences,
    };
    
    localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(updatedPrefs));
  } catch (error) {
    console.error('Failed to save preferences to storage:', error);
    throw error;
  }
}

/**
 * Reset preferences to defaults
 */
export function resetPreferences(): void {
  try {
    localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(DEFAULT_PREFERENCES));
  } catch (error) {
    console.error('Failed to reset preferences:', error);
    throw error;
  }
}

/**
 * Get the current theme based on preferences and system settings
 */
export function getCurrentTheme(): 'light' | 'dark' {
  const preferences = getPreferenceValues();
  
  if (preferences.theme === 'system') {
    // Check system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  
  return preferences.theme;
}

/**
 * Apply the current theme to the document
 */
export function applyTheme(): void {
  const theme = getCurrentTheme();
  document.documentElement.setAttribute('data-theme', theme);
  
  // Add/remove dark class from body
  if (theme === 'dark') {
    document.body.classList.add('dark-theme');
  } else {
    document.body.classList.remove('dark-theme');
  }
}


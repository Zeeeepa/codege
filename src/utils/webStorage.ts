/**
 * Web-compatible storage implementation that matches Raycast's LocalStorage API
 */

export interface WebStorageInterface {
  getItem<T = string>(key: string): Promise<T | undefined>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
  allItems(): Promise<Record<string, string>>;
}

class WebLocalStorage implements WebStorageInterface {
  /**
   * Get an item from localStorage
   */
  async getItem<T = string>(key: string): Promise<T | undefined> {
    try {
      const item = localStorage.getItem(key);
      if (item === null) {
        return undefined;
      }
      
      // Try to parse as JSON, fallback to string
      try {
        return JSON.parse(item) as T;
      } catch {
        return item as T;
      }
    } catch (error) {
      console.error(`Error getting item from localStorage: ${key}`, error);
      return undefined;
    }
  }

  /**
   * Set an item in localStorage
   */
  async setItem(key: string, value: string): Promise<void> {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.error(`Error setting item in localStorage: ${key}`, error);
      throw error;
    }
  }

  /**
   * Remove an item from localStorage
   */
  async removeItem(key: string): Promise<void> {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing item from localStorage: ${key}`, error);
      throw error;
    }
  }

  /**
   * Clear all items from localStorage
   */
  async clear(): Promise<void> {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Error clearing localStorage', error);
      throw error;
    }
  }

  /**
   * Get all items from localStorage
   */
  async allItems(): Promise<Record<string, string>> {
    try {
      const items: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key);
          if (value !== null) {
            items[key] = value;
          }
        }
      }
      return items;
    } catch (error) {
      console.error('Error getting all items from localStorage', error);
      return {};
    }
  }
}

// Create singleton instance
const webStorage = new WebLocalStorage();

// Export as LocalStorage to match Raycast API
export const LocalStorage = webStorage;

// Also export as default
export default webStorage;

// Helper functions for common operations
export async function getStoredValue<T>(key: string, defaultValue: T): Promise<T> {
  const value = await webStorage.getItem<T>(key);
  return value !== undefined ? value : defaultValue;
}

export async function setStoredValue<T>(key: string, value: T): Promise<void> {
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);
  await webStorage.setItem(key, serialized);
}

export async function removeStoredValue(key: string): Promise<void> {
  await webStorage.removeItem(key);
}

// Storage event listener for cross-tab synchronization
export function onStorageChange(callback: (key: string, newValue: string | null, oldValue: string | null) => void) {
  const handleStorageChange = (event: StorageEvent) => {
    if (event.key) {
      callback(event.key, event.newValue, event.oldValue);
    }
  };

  window.addEventListener('storage', handleStorageChange);
  
  // Return cleanup function
  return () => {
    window.removeEventListener('storage', handleStorageChange);
  };
}


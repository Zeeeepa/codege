/**
 * Web storage utility for localStorage with async interface
 */

// LocalStorage wrapper with async interface
export const LocalStorage = {
  /**
   * Get an item from localStorage
   * @param key Storage key
   * @returns Promise resolving to the stored value or null
   */
  getItem: async (key: string): Promise<string | null> => {
    return localStorage.getItem(key);
  },
  
  /**
   * Set an item in localStorage
   * @param key Storage key
   * @param value Value to store
   * @returns Promise resolving when the operation is complete
   */
  setItem: async (key: string, value: string): Promise<void> => {
    localStorage.setItem(key, value);
  },
  
  /**
   * Remove an item from localStorage
   * @param key Storage key
   * @returns Promise resolving when the operation is complete
   */
  removeItem: async (key: string): Promise<void> => {
    localStorage.removeItem(key);
  },
  
  /**
   * Clear all items from localStorage
   * @returns Promise resolving when the operation is complete
   */
  clear: async (): Promise<void> => {
    localStorage.clear();
  },
  
  /**
   * Get all keys in localStorage
   * @returns Promise resolving to an array of keys
   */
  keys: async (): Promise<string[]> => {
    return Object.keys(localStorage);
  },
};

// SessionStorage wrapper with async interface
export const SessionStorage = {
  /**
   * Get an item from sessionStorage
   * @param key Storage key
   * @returns Promise resolving to the stored value or null
   */
  getItem: async (key: string): Promise<string | null> => {
    return sessionStorage.getItem(key);
  },
  
  /**
   * Set an item in sessionStorage
   * @param key Storage key
   * @param value Value to store
   * @returns Promise resolving when the operation is complete
   */
  setItem: async (key: string, value: string): Promise<void> => {
    sessionStorage.setItem(key, value);
  },
  
  /**
   * Remove an item from sessionStorage
   * @param key Storage key
   * @returns Promise resolving when the operation is complete
   */
  removeItem: async (key: string): Promise<void> => {
    sessionStorage.removeItem(key);
  },
  
  /**
   * Clear all items from sessionStorage
   * @returns Promise resolving when the operation is complete
   */
  clear: async (): Promise<void> => {
    sessionStorage.clear();
  },
  
  /**
   * Get all keys in sessionStorage
   * @returns Promise resolving to an array of keys
   */
  keys: async (): Promise<string[]> => {
    return Object.keys(sessionStorage);
  },
};


/**
 * Web-compatible cache implementation that matches Raycast's Cache API
 */

export interface CacheOptions {
  namespace?: string;
  capacity?: number;
}

export interface WebCacheInterface {
  get(key: string): Promise<string | undefined>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
  has(key: string): Promise<boolean>;
}

class WebCache implements WebCacheInterface {
  private namespace: string;
  private capacity: number;
  private keyPrefix: string;

  constructor(options: CacheOptions = {}) {
    this.namespace = options.namespace || 'default';
    this.capacity = options.capacity || 1000;
    this.keyPrefix = `cache_${this.namespace}_`;
  }

  private getFullKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }

  private getCacheKeys(): string[] {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.keyPrefix)) {
        keys.push(key);
      }
    }
    return keys;
  }

  private async enforceCapacity(): Promise<void> {
    const keys = this.getCacheKeys();
    if (keys.length >= this.capacity) {
      // Remove oldest entries (simple FIFO strategy)
      const keysToRemove = keys.slice(0, keys.length - this.capacity + 1);
      for (const key of keysToRemove) {
        localStorage.removeItem(key);
      }
    }
  }

  async get(key: string): Promise<string | undefined> {
    try {
      const fullKey = this.getFullKey(key);
      const value = localStorage.getItem(fullKey);
      return value || undefined;
    } catch (error) {
      console.error(`Error getting cache item: ${key}`, error);
      return undefined;
    }
  }

  async set(key: string, value: string): Promise<void> {
    try {
      await this.enforceCapacity();
      const fullKey = this.getFullKey(key);
      localStorage.setItem(fullKey, value);
    } catch (error) {
      console.error(`Error setting cache item: ${key}`, error);
      throw error;
    }
  }

  async remove(key: string): Promise<void> {
    try {
      const fullKey = this.getFullKey(key);
      localStorage.removeItem(fullKey);
    } catch (error) {
      console.error(`Error removing cache item: ${key}`, error);
      throw error;
    }
  }

  async clear(): Promise<void> {
    try {
      const keys = this.getCacheKeys();
      for (const key of keys) {
        localStorage.removeItem(key);
      }
    } catch (error) {
      console.error('Error clearing cache', error);
      throw error;
    }
  }

  async has(key: string): Promise<boolean> {
    try {
      const fullKey = this.getFullKey(key);
      return localStorage.getItem(fullKey) !== null;
    } catch (error) {
      console.error(`Error checking cache item: ${key}`, error);
      return false;
    }
  }
}

// Export Cache class to match Raycast API
export class Cache extends WebCache {
  constructor(options: CacheOptions = {}) {
    super(options);
  }
}

// Export default instance
export default Cache;


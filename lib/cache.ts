/**
 * Simple in-memory cache implementation
 * For production, consider using Redis or similar
 */

interface CacheEntry<T> {
  value: T;
  expires: number;
}

class SystemCache {
  private cache: Map<string, CacheEntry<any>>;

  constructor() {
    this.cache = new Map();
    
    // Clean up expired entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Set a value in cache with TTL (time to live) in seconds
   */
  set<T>(key: string, value: T, ttl: number = 300): void {
    const expires = Date.now() + ttl * 1000;
    this.cache.set(key, { value, expires });
  }

  /**
   * Get a value from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  /**
   * Delete a value from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    this.cache.forEach((entry, key) => {
      if (now > entry.expires) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get or set pattern - fetch from cache or compute and cache
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl: number = 300
  ): Promise<T> {
    const cached = this.get<T>(key);
    
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    this.set(key, value, ttl);
    return value;
  }
}

// Singleton instance
const cache = new SystemCache();

export default cache;

// Helper functions for common cache patterns

/**
 * Cache user data
 */
export function cacheUser(userId: string, userData: any, ttl: number = 900): void {
  cache.set(`user:${userId}`, userData, ttl);
}

/**
 * Get cached user data
 */
export function getCachedUser(userId: string): any | null {
  return cache.get(`user:${userId}`);
}

/**
 * Invalidate user cache
 */
export function invalidateUserCache(userId: string): void {
  cache.delete(`user:${userId}`);
}

/**
 * Cache organization data
 */
export function cacheOrganization(orgId: string, orgData: any, ttl: number = 1800): void {
  cache.set(`org:${orgId}`, orgData, ttl);
}

/**
 * Get cached organization data
 */
export function getCachedOrganization(orgId: string): any | null {
  return cache.get(`org:${orgId}`);
}

/**
 * Invalidate organization cache
 */
export function invalidateOrganizationCache(orgId: string): void {
  cache.delete(`org:${orgId}`);
}

/**
 * Cache session data
 */
export function cacheSession(sessionId: string, sessionData: any, ttl: number = 900): void {
  cache.set(`session:${sessionId}`, sessionData, ttl);
}

/**
 * Get cached session data
 */
export function getCachedSession(sessionId: string): any | null {
  return cache.get(`session:${sessionId}`);
}

/**
 * Invalidate session cache
 */
export function invalidateSession(sessionId: string): void {
  cache.delete(`session:${sessionId}`);
}

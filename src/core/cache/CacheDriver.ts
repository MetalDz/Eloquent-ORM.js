// src/core/cache/CacheDriver.ts
export abstract class CacheDriver {
  /**
   * Return parsed value or null if not found.
   */
  abstract get<T = any>(key: string): Promise<T | null>;

  /**
   * Store value for `ttl` seconds. ttl === 0 => no expiration.
   */
  abstract set<T = any>(key: string, value: T, ttl?: number): Promise<void>;

  /**
   * Delete a key.
   */
  abstract delete(key: string): Promise<void>;

  /**
   * Clear all keys (use carefully).
   */
  abstract clear(): Promise<void>;
}

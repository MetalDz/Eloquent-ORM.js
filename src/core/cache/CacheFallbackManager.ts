// src/core/cache/CacheFallbackManager.ts
import { CacheDriver } from "./CacheDriver";

export class CacheFallbackManager {
  private static drivers: CacheDriver[] = [];
  private static active: CacheDriver | null = null;

  /**
   * Register fallback chain: first = primary, last = backup
   */
  static useChain(drivers: CacheDriver[]) {
    this.drivers = drivers;
    this.active = drivers[0];
  }

  static getActiveDriver(): CacheDriver | null {
    return this.active;
  }

  /**
   * Try an operation on each driver in order until success.
   */
  private static async tryChain<T>(
    fn: (driver: CacheDriver) => Promise<T>,
    onFailure?: (err: any, driver: CacheDriver) => void
  ): Promise<T> {
    for (const driver of this.drivers) {
      try {
        const result = await fn(driver);
        this.active = driver;
        return result;
      } catch (err) {
        onFailure?.(err, driver);
        // try next
      }
    }
    throw new Error("All cache drivers failed in fallback chain.");
  }

  // ----------- Public unified API -----------

  static async get<T>(key: string): Promise<T | null> {
    return this.tryChain(async (d) => await d.get<T>(key));
  }

  static async set<T>(key: string, value: T, ttl = 60): Promise<void> {
    await this.tryChain(async (d) => await d.set<T>(key, value, ttl));
  }

  static async delete(key: string): Promise<void> {
    await this.tryChain(async (d) => await d.delete(key));
  }

  static async clear(): Promise<void> {
    await this.tryChain(async (d) => await d.clear());
  }
}

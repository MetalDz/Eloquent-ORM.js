// src/core/cache/CacheManager.ts
import { CacheDriver } from "./CacheDriver";
import { MemoryCacheDriver } from "./drivers/MemoryCacheDriver";

export class CacheManager {
  private static driver: CacheDriver = new MemoryCacheDriver();

  static use(driver: CacheDriver) {
    this.driver = driver;
  }

  static getDriver(): CacheDriver {
    return this.driver;
  }

  static async get<T = any>(key: string): Promise<T | null> {
    return this.driver.get<T>(key);
  }

  static async set<T = any>(key: string, value: T, ttl = 60): Promise<void> {
    return this.driver.set<T>(key, value, ttl);
  }

  static async delete(key: string): Promise<void> {
    return this.driver.delete(key);
  }

  static async clear(): Promise<void> {
    return this.driver.clear();
  }
}

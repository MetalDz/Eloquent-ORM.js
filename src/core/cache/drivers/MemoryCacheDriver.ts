// src/core/cache/drivers/MemoryCacheDriver.ts
import { CacheDriver } from "../CacheDriver";

interface Entry<T = any> {
  value: T;
  expiresAt: number | null;
}

export class MemoryCacheDriver extends CacheDriver {
  private store = new Map<string, Entry>();

  async get<T = any>(key: string): Promise<T | null> {
    const e = this.store.get(key);
    if (!e) return null;
    if (e.expiresAt && Date.now() > e.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return e.value as T;
  }

  async set<T = any>(key: string, value: T, ttl = 60): Promise<void> {
    const expiresAt = ttl > 0 ? Date.now() + ttl * 1000 : null;
    this.store.set(key, { value, expiresAt });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }
}

// src/core/cache/drivers/MemcachedCacheDriver.ts
import { CacheDriver } from "../CacheDriver.js";
import Memcached from "memcached";

export class MemcachedCacheDriver extends CacheDriver {
  private client: Memcached;
  private defaultTtl: number;

  /**
   * servers: string or array (e.g. "127.0.0.1:11211" or ["a:11211","b:11211"])
   */
  constructor(servers: string | string[] = "127.0.0.1:11211", defaultTtl = 60) {
    super();
    this.client = new Memcached(servers);
    this.defaultTtl = defaultTtl;
  }

  async get<T = any>(key: string): Promise<T | null> {
    return new Promise((resolve) => {
      this.client.get(key, (err, data) => {
        if (err || typeof data === "undefined" || data === null) return resolve(null);
        try {
          resolve(JSON.parse(data) as T);
        } catch {
          // in case stored as raw
          resolve(data as T);
        }
      });
    });
  }

  async set<T = any>(key: string, value: T, ttl = this.defaultTtl): Promise<void> {
    return new Promise((resolve, reject) => {
      const payload = JSON.stringify(value);
      this.client.set(key, payload, ttl, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }

  async delete(key: string): Promise<void> {
    return new Promise((resolve) => {
      this.client.del(key, () => resolve());
    });
  }

  async clear(): Promise<void> {
    // Memcached has 'flush' command
    return new Promise((resolve, reject) => {
      this.client.flush((err) => (err ? reject(err) : resolve()));
    });
  }
}

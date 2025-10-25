// src/core/cache/CacheRegistry.ts
import { CacheManager } from "./CacheManager";

/**
 * 🧩 CacheRegistry
 * Keeps track of cache keys grouped by model and group name.
 *
 * Example:
 * CacheRegistry.addKey('User', 'findMany', 'User:abcd1234');
 * CacheRegistry.getKeys('User') => ['User:abcd1234', ...]
 */
export class CacheRegistry {
  private static registry: Map<string, Set<string>> = new Map();

  /**
   * Register a cache key for a given model and group.
   */
  static addKey(modelName: string, group: string, key: string) {
    const registryKey = `${modelName}:${group}`;
    if (!this.registry.has(registryKey)) {
      this.registry.set(registryKey, new Set());
    }
    this.registry.get(registryKey)!.add(key);
  }

  /**
   * Return all cache keys for a model or model+group.
   */
  static getKeys(modelName: string, group?: string): string[] {
    if (group) {
      const registryKey = `${modelName}:${group}`;
      return Array.from(this.registry.get(registryKey) || []);
    }

    const allKeys: string[] = [];
    for (const [key, set] of this.registry.entries()) {
      if (key.startsWith(modelName + ":")) {
        allKeys.push(...Array.from(set));
      }
    }
    return allKeys;
  }

  /**
   * Remove a specific key from the registry.
   */
  static removeKey(modelName: string, group: string, key: string) {
    const registryKey = `${modelName}:${group}`;
    const set = this.registry.get(registryKey);
    if (set) {
      set.delete(key);
      if (set.size === 0) this.registry.delete(registryKey);
    }
  }

  /**
   * Clear all keys for a model (invalidate model cache).
   */
  static async clearModel(modelName: string) {
    for (const [key, set] of this.registry.entries()) {
      if (key.startsWith(modelName + ":")) {
        for (const cacheKey of set) {
          await CacheManager.delete(cacheKey);
        }
        this.registry.delete(key);
      }
    }
  }

  /**
   * Clear a specific group within a model (e.g., "findMany" or "where")
   */
  static async clearGroup(modelName: string, group: string) {
    const registryKey = `${modelName}:${group}`;
    const set = this.registry.get(registryKey);
    if (!set) return;

    for (const cacheKey of set) {
      await CacheManager.delete(cacheKey);
    }
    this.registry.delete(registryKey);
  }

  /**
   * Clear the entire registry (dangerous: wipes all caches).
   */
  static async clearAll() {
    await CacheManager.clear();
    this.registry.clear();
  }
}

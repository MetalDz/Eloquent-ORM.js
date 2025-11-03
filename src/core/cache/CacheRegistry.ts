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
  static addKey(modelName: string, group: string, key: string): void {
    const registryKey = `${modelName}:${group}`;

    if (!this.registry.has(registryKey)) {
      this.registry.set(registryKey, new Set());
    }

    const set = this.registry.get(registryKey)!;
    set.add(key);
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

    // ✅ Use Array.from() to make iteration safe for older targets
    for (const [key, set] of Array.from(this.registry.entries())) {
      if (key.startsWith(modelName + ":")) {
        allKeys.push(...Array.from(set as Set<string>));
      }
    }

    return allKeys;
  }

  /**
   * Remove a specific key from the registry.
   */
  static removeKey(modelName: string, group: string, key: string): void {
    const registryKey = `${modelName}:${group}`;
    const set = this.registry.get(registryKey);

    if (set) {
      set.delete(key);
      if (set.size === 0) {
        this.registry.delete(registryKey);
      }
    }
  }

  /**
   * Clear all keys for a model (invalidate model cache).
   */
  static async clearModel(modelName: string): Promise<void> {
    for (const [key, set] of Array.from(this.registry.entries())) {
      if (key.startsWith(modelName + ":")) {
        for (const cacheKey of Array.from(set as Set<string>)) {
          await CacheManager.delete(cacheKey);
        }
        this.registry.delete(key);
      }
    }
  }

  /**
   * Clear a specific group within a model (e.g., "findMany" or "where").
   */
  static async clearGroup(modelName: string, group: string): Promise<void> {
    const registryKey = `${modelName}:${group}`;
    const set = this.registry.get(registryKey);
    if (!set) return;

    for (const cacheKey of Array.from(set as Set<string>)) {
      await CacheManager.delete(cacheKey);
    }

    this.registry.delete(registryKey);
  }

  /**
   * Clear the entire registry (dangerous: wipes all caches).
   */
  static async clearAll(): Promise<void> {
    await CacheManager.clear();
    this.registry.clear();
  }
}

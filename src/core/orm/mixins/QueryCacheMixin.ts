// src/core/cache/QueryCacheMixin.ts
import crypto from "crypto";
import { CacheManager } from "../../cache/CacheManager";
import { CacheRegistry } from "../../cache/CacheRegistry";
import { CacheFallbackManager } from "../../cache/CacheFallbackManager";
import { CacheAnalytics } from "../../cache/CacheAnalytics";

export type CacheOptions = { enabled: boolean; ttl: number };

/**
 * Local cache interface (no external import)
 * Ensures both managers expose the same API shape.
 */
type CacheInterface = {
  get<T = any>(key: string): Promise<T | null>;
  set<T = any>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
};

export function QueryCacheMixin<TBase extends new (...args: any[]) => any>(
  Base: TBase
) {
  return class extends Base {
    private __cache: CacheOptions = { enabled: false, ttl: 60 };

    // optional static configs per model
    static defaultCacheTTL?: number;
    static cacheTTL?: Record<string, number>;
    static cacheStrategy?: (payload: any, group?: string) => number;

    constructor(...args: any[]) {
      super(...args);

      // Auto-register cache invalidation hooks if HooksMixin exists
      if (typeof (this as any).registerHook === "function") {
        try {
          (this as any).registerHook("afterCreate", async () => {
            await this.invalidateModelCache();
          });
          (this as any).registerHook("afterUpdate", async () => {
            await this.invalidateModelCache();
          });
          (this as any).registerHook("afterDelete", async () => {
            await this.invalidateModelCache();
          });
        } catch (err) {
          console.warn(
            "[QueryCacheMixin] Failed to register cache invalidation hooks:",
            err
          );
        }
      }
    }

    /**
     * Enable caching for current chain with explicit TTL.
     */
    cache(ttl = 60) {
      this.__cache = { enabled: true, ttl };
      return this;
    }

    /**
     * Disable caching for this query context.
     */
    withoutCache() {
      this.__cache = { enabled: false, ttl: 0 };
      return this;
    }

    /**
     * Generate a deterministic key for query payloads.
     */
    protected generateCacheKey(payload: any): string {
      const normalized = JSON.stringify(payload, (_k, v) => {
        if (v instanceof Date) return v.toISOString();
        if (typeof v === "function") return undefined;
        return v;
      });
      return crypto.createHash("sha256").update(normalized).digest("hex");
    }

    /**
     * Select active cache API (fallback manager or normal manager).
     */
    protected get cacheAPI(): CacheInterface {
      const hasFallback =
        typeof (CacheFallbackManager as any).getActiveDriver === "function" &&
        (CacheFallbackManager as any).getActiveDriver();

      // TypeScript knows both conform to CacheInterface
      return hasFallback
        ? (CacheFallbackManager as CacheInterface)
        : (CacheManager as CacheInterface);
    }

    /**
     * Compute final TTL (priority: explicit > strategy > group > default > fallback)
     */
    protected resolveTTL(payload: any, group: string): number {
      const cls = this.constructor as any;

      // 1. Explicit TTL
      if (this.__cache?.enabled && this.__cache.ttl > 0)
        return this.__cache.ttl;

      // 2. Model-defined dynamic strategy
      if (typeof cls.cacheStrategy === "function") {
        try {
          const dynamic = cls.cacheStrategy(payload, group);
          if (typeof dynamic === "number" && dynamic >= 0) return dynamic;
        } catch (err) {
          console.warn("[QueryCacheMixin] cacheStrategy() failed:", err);
        }
      }

      // 3. Model-level group mapping
      if (cls.cacheTTL && typeof cls.cacheTTL[group] === "number") {
        return cls.cacheTTL[group];
      }

      // 4. Model-level default
      if (typeof cls.defaultCacheTTL === "number") {
        return cls.defaultCacheTTL;
      }

      // 5. Global fallback
      return 60;
    }

    /**
     * Execute query with caching & fallback manager support.
     */
    protected async runWithCache<R = any>(
      payload: any,
      executeFn: () => Promise<R>,
      group = "default"
    ): Promise<R> {
      const cls = this.constructor as any;
      const hasModelDefaults =
        typeof cls.defaultCacheTTL === "number" ||
        typeof cls.cacheStrategy === "function" ||
        (cls.cacheTTL && Object.keys(cls.cacheTTL).length > 0);

      // If no caching requested or defined → skip
      if (!this.__cache.enabled && !hasModelDefaults) {
        return executeFn();
      }

      const modelName = (this.constructor && (this.constructor as any).name) || "Model";
      const hashKey = this.generateCacheKey(payload);
      const key = `${modelName}:${group}:${hashKey}`;
      const ttl = this.resolveTTL(payload, group);

      // Try cache read
      try {
        const cached = await this.cacheAPI.get<R>(key);
        if (cached !== null && typeof cached !== "undefined") {
          CacheAnalytics.hit(modelName, ttl); // ✅ record hit
          return cached;
        }
        CacheAnalytics.miss(modelName, ttl); // ✅ record miss
      } catch (err) {
        console.warn(`[Cache] Read failed for ${key}:`, err);
        CacheAnalytics.miss(modelName, ttl);
      }

      // Execute DB operation
      const result = await executeFn();

      // Try cache write and register key
      try {
        await this.cacheAPI.set<R>(key, result, ttl);
        CacheRegistry.addKey(modelName, group, key);
      } catch (err) {
        console.warn(`[Cache] Write failed for ${key}:`, err);
      }

      return result;
    }

    /**
     * Invalidate all caches for this model.
     */
    async invalidateModelCache() {
      const modelName =
        (this.constructor && (this.constructor as any).name) || "Model";
      await CacheRegistry.clearModel(modelName);
    }

    /**
     * Invalidate a specific cache group (e.g., "find", "all").
     */
    async invalidateCacheGroup(group: string) {
      const modelName =
        (this.constructor && (this.constructor as any).name) || "Model";
      await CacheRegistry.clearGroup(modelName, group);
    }
  };
}

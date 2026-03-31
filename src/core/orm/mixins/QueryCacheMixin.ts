import * as crypto from "crypto";
import { CacheManager } from "../../cache/CacheManager.js";
import { CacheRegistry } from "../../cache/CacheRegistry.js";
import { CacheFallbackManager } from "../../cache/CacheFallbackManager.js";
import { CacheAnalytics } from "../../cache/CacheAnalytics.js";
import { HookStore, type LifecycleEvent } from "./utils/HookStore.js";
import { ModelRegistry, type ModelConstructor } from "./utils/ModelRegistry.js";

export type CacheOptions = { enabled: boolean; ttl: number };

export interface CacheInterface {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

export interface CacheableModel {
  invalidateModelCache(): Promise<void>;
  invalidateCacheGroup(group: string): Promise<void>;
}

export interface CacheableConstructor {
  defaultCacheTTL?: number;
  cacheTTL?: Record<string, number>;
  cacheStrategy?: (payload: unknown, group?: string) => number;
}

type Constructor<T = object> = abstract new (...args: any[]) => T;

const CACHE_INVALIDATION_EVENTS: LifecycleEvent[] = ["created", "updated", "deleted"];

export function QueryCacheMixin<TBase extends Constructor>(Base: TBase) {
  const cacheHooksRegistered = new WeakSet<ModelConstructor>();

  abstract class CachedModel extends Base implements CacheableModel {
    private __cache: CacheOptions = { enabled: false, ttl: 60 };

    static defaultCacheTTL?: number;
    static cacheTTL?: Record<string, number>;
    static cacheStrategy?: (payload: unknown, group?: string) => number;

    constructor(...args: any[]) {
      super(...args);

      try {
        this.ensureCacheInvalidationHooks();
      } catch (err) {
        console.warn("[QueryCacheMixin] Failed to register cache invalidation hooks:", err);
      }
    }

    private ensureCacheInvalidationHooks(): void {
      const modelCtor = this.constructor as unknown as ModelConstructor;
      if (!ModelRegistry.isGranted(modelCtor) && ModelRegistry.isStrictMode()) {
        return;
      }

      if (cacheHooksRegistered.has(modelCtor)) {
        return;
      }

      const modelName = (this.constructor as typeof CachedModel).name || "Model";
      const clearModelCache = async (): Promise<void> => {
        await CacheRegistry.clearModel(modelName);
      };

      for (const event of CACHE_INVALIDATION_EVENTS) {
        HookStore.add(modelCtor, event, clearModelCache);
      }

      cacheHooksRegistered.add(modelCtor);
    }

    cache(ttl = 60): this {
      this.__cache = { enabled: true, ttl };
      return this;
    }

    withoutCache(): this {
      this.__cache = { enabled: false, ttl: 0 };
      return this;
    }

    protected generateCacheKey(payload: unknown): string {
      const normalized = JSON.stringify(payload, (_key, value) => {
        if (value instanceof Date) return value.toISOString();
        if (typeof value === "function") return undefined;
        return value;
      });

      return crypto.createHash("sha256").update(normalized).digest("hex");
    }

    protected get cacheAPI(): CacheInterface {
      try {
        const fallbackActive =
          typeof (CacheFallbackManager as any)?.getActiveDriver === "function" &&
          (CacheFallbackManager as any).getActiveDriver();

        return fallbackActive
          ? (CacheFallbackManager as unknown as CacheInterface)
          : (CacheManager as unknown as CacheInterface);
      } catch {
        return CacheManager as unknown as CacheInterface;
      }
    }

    protected resolveTTL(payload: unknown, group: string): number {
      const cls = this.constructor as unknown as CacheableConstructor & typeof CachedModel;

      if (this.__cache.enabled && this.__cache.ttl > 0) return this.__cache.ttl;

      if (typeof cls.cacheStrategy === "function") {
        try {
          const dynamic = cls.cacheStrategy(payload, group);
          if (typeof dynamic === "number" && dynamic >= 0) return dynamic;
        } catch (err) {
          console.warn("[QueryCacheMixin] cacheStrategy() failed:", err);
        }
      }

      if (cls.cacheTTL && typeof cls.cacheTTL[group] === "number") return cls.cacheTTL[group];

      if (typeof cls.defaultCacheTTL === "number") return cls.defaultCacheTTL;

      return 60;
    }

    protected async runWithCache<R>(
      payload: unknown,
      executeFn: () => Promise<R>,
      group = "default"
    ): Promise<R> {
      const cls = this.constructor as typeof CachedModel & CacheableConstructor;
      const hasModelDefaults =
        typeof cls.defaultCacheTTL === "number" ||
        typeof cls.cacheStrategy === "function" ||
        (cls.cacheTTL && Object.keys(cls.cacheTTL).length > 0);

      if (!this.__cache.enabled && !hasModelDefaults) return executeFn();

      const modelName = cls.name || (this as any).constructor?.name || "Model";
      const hashKey = this.generateCacheKey(payload);
      const key = `${modelName}:${group}:${hashKey}`;
      const ttl = this.resolveTTL(payload, group);

      try {
        const cached = await this.cacheAPI.get<R>(key);
        if (cached !== null && typeof cached !== "undefined") {
          try {
            CacheAnalytics.hit(modelName, ttl);
          } catch {}
          return cached;
        }
        CacheAnalytics.miss(modelName, ttl);
      } catch (err) {
        console.warn(`[Cache] Read failed for ${key}:`, err);
        CacheAnalytics.miss(modelName, ttl);
      }

      const result = await executeFn();

      try {
        await this.cacheAPI.set<R>(key, result, ttl);
        await CacheRegistry.addKey(modelName, group, key);
      } catch (err) {
        console.warn(`[Cache] Write failed for ${key}:`, err);
      }

      return result;
    }

    async invalidateModelCache(): Promise<void> {
      const modelName = (this.constructor as typeof CachedModel).name || "Model";
      await CacheRegistry.clearModel(modelName);
    }

    async invalidateCacheGroup(group: string): Promise<void> {
      const modelName = (this.constructor as typeof CachedModel).name || "Model";
      await CacheRegistry.clearGroup(modelName, group);
    }
  }

  return CachedModel as unknown as TBase &
    (abstract new (...args: any[]) => CacheableModel) &
    CacheableConstructor;
}

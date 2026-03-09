import { CacheFallbackManager } from "../core/cache/CacheFallbackManager";
import { CacheManager } from "../core/cache/CacheManager";
import { setupCache } from "../core/cache/setupCache";
import { FileCacheDriver } from "../core/cache/drivers/FileCacheDriver";
import { MemcachedCacheDriver } from "../core/cache/drivers/MemcachedCacheDriver";
import { MemoryCacheDriver } from "../core/cache/drivers/MemoryCacheDriver";
import { QueryCacheMixin } from "../core/orm/mixins/QueryCacheMixin";
import { CacheRegistry } from "../core/cache/CacheRegistry";
import { CacheAnalytics } from "../core/cache/CacheAnalytics";
import { HookStore } from "../core/orm/mixins/utils/HookStore";
import { ModelRegistry } from "../core/orm/mixins/utils/ModelRegistry";
import { MorphMany } from "../core/orm/relations/MorphMany";
import { MorphOne } from "../core/orm/relations/MorphOne";
import { redactSecretsInValue } from "../core/security/SecretRedactor";
import Memcached from "memcached";

jest.mock("memcached", () =>
  jest.fn().mockImplementation(() => ({
    get: (_key: string, cb: (err: unknown, value: unknown) => void) => cb(null, null),
    set: (_key: string, _value: unknown, _ttl: number, cb: (err?: unknown) => void) => cb(),
    del: (_key: string, cb: () => void) => cb(),
    flush: (cb: (err?: unknown) => void) => cb(),
    end: () => undefined,
  }))
);

abstract class EmptyBase {}

class Phase32CachedModel extends QueryCacheMixin(
  EmptyBase as unknown as abstract new (...args: any[]) => object
) {
  enableCacheDefault(): this {
    return (this as any).cache();
  }

  runDefaultGroup<T>(payload: unknown, execute: () => Promise<T>): Promise<T> {
    return (this as any).runWithCache(payload, execute);
  }
}

function createDriver(overrides: Partial<any> = {}) {
  return {
    get: async () => null,
    set: async () => undefined,
    delete: async () => undefined,
    clear: async () => undefined,
    ...overrides,
  };
}

describe("Branch coverage 100% - phase 32 cache/query/morph/redactor edges", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
    jest.spyOn(console, "log").mockImplementation(() => undefined);
    jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(async () => {
    process.env = { ...originalEnv };
    HookStore.clear();
    ModelRegistry.clear();
    CacheAnalytics.reset();
    await CacheRegistry.clearAll().catch(() => undefined);
    jest.restoreAllMocks();
  });

  test("CacheFallbackManager covers set() default ttl and non-Error clear/shutdown failures", async () => {
    const managerAny = CacheFallbackManager as unknown as { opTimeoutMs: number };
    const previousTimeoutMs = managerAny.opTimeoutMs;
    managerAny.opTimeoutMs = 1;

    const ttlSpy = jest.fn(async (_key: string, _value: unknown, ttl?: number) => {
      expect(ttl).toBe(60);
    });
    CacheFallbackManager.useChain([createDriver({ set: ttlSpy }) as any]);
    await CacheFallbackManager.set("k", { ok: true });
    expect(ttlSpy).toHaveBeenCalledTimes(1);

    CacheFallbackManager.useChain([createDriver({ clear: async () => Promise.reject("clear-string") }) as any]);
    const clearResults = await CacheFallbackManager.clearAllDrivers();
    expect(clearResults[0]).toEqual({
      driver: "Object",
      ok: false,
      error: "clear-string",
    });
    await new Promise((resolve) => setTimeout(resolve, 5));

    const closeStringDriver = createDriver({
      close: () => {
        throw "close-string";
      },
    });
    CacheFallbackManager.useChain([closeStringDriver as any]);
    const closeResults = await CacheFallbackManager.shutdownDrivers();
    expect(closeResults[0]).toEqual({
      driver: "Object",
      closed: false,
      error: "close-string",
    });

    managerAny.opTimeoutMs = previousTimeoutMs;
  });

  test("setupCache covers production env-value branches for host/port/cache_dir", () => {
    process.env.APP_ENV = "production";

    const chainSpy = jest
      .spyOn(CacheFallbackManager, "useChain")
      .mockImplementation(() => undefined);
    const managerUseSpy = jest.spyOn(CacheManager, "use").mockImplementation(() => undefined);

    delete process.env.MEMCACHED_HOST;
    delete process.env.MEMCACHED_PORT;
    delete process.env.CACHE_DIR;
    setupCache();

    process.env.MEMCACHED_HOST = "cache.internal";
    process.env.MEMCACHED_PORT = "22122";
    process.env.CACHE_DIR = ".cache-phase32";
    setupCache();

    expect(managerUseSpy).not.toHaveBeenCalled();
    expect(chainSpy).toHaveBeenCalledTimes(2);
    const chain = chainSpy.mock.calls[1][0];
    expect(chain[0]).toBeInstanceOf(MemcachedCacheDriver);
    expect(chain[1]).toBeInstanceOf(FileCacheDriver);
    expect((chain[1] as any).dir).toBe(".cache-phase32");
    expect(chain[2]).toBeInstanceOf(MemoryCacheDriver);
    (chain[0] as { close?: () => Promise<void> | void }).close?.();

    const memcachedCtor = Memcached as unknown as jest.Mock;
    expect(memcachedCtor.mock.calls.some((call) => call[0] === "127.0.0.1:11211")).toBe(true);
    expect(memcachedCtor.mock.calls.some((call) => call[0] === "cache.internal:22122")).toBe(true);
  });

  test("QueryCacheMixin covers cache() default arg, Date key normalization, and default group path", async () => {
    const model = new Phase32CachedModel().enableCacheDefault();
    jest.spyOn(CacheFallbackManager, "getActiveDriver").mockReturnValue(null);
    const getSpy = jest.spyOn(CacheManager, "get").mockResolvedValue(null);
    const setSpy = jest.spyOn(CacheManager, "set").mockResolvedValue(undefined);
    const executeFn = jest.fn(async () => ({ ok: true }));
    const originalDateToJSON = Date.prototype.toJSON;
    (Date.prototype as any).toJSON = undefined;

    try {
      const result = await model.runDefaultGroup(
        { at: new Date("2026-03-09T00:00:00.000Z"), fn: () => "skip", id: 1 },
        executeFn
      );

      expect(result).toEqual({ ok: true });
      expect(getSpy).toHaveBeenCalledTimes(1);
      expect(String(getSpy.mock.calls[0][0])).toContain(":default:");
      expect(setSpy).toHaveBeenCalledTimes(1);
    } finally {
      Date.prototype.toJSON = originalDateToJSON;
    }
  });

  test("MorphMany/MorphOne cover empty-parents early return and missing-related-model errors", async () => {
    const morphManyMissing = new MorphMany(undefined as any, "morph_type", "morph_id");
    const morphOneMissing = new MorphOne(undefined as any, "morph_type", "morph_id");

    await expect(morphManyMissing.getResults({ id: 1 })).rejects.toThrow(
      "Related model is not defined."
    );
    await expect(morphOneMissing.getResults({ id: 1 })).rejects.toThrow(
      "Related model is not defined."
    );

    await expect(morphManyMissing.match([])).resolves.toBeUndefined();
    await expect(morphOneMissing.match([])).resolves.toBeUndefined();

    await expect(morphManyMissing.match([{ id: 1 } as any])).rejects.toThrow(
      "Related model is not defined."
    );
    await expect(morphOneMissing.match([{ id: 1 } as any])).rejects.toThrow(
      "Related model is not defined."
    );
  });

  test("SecretRedactor covers error-without-stack, seen-cycle, array, and primitive/object fallthrough", () => {
    const err = new Error("token=abc");
    (err as Error & { stack?: string }).stack = undefined;
    const redactedErr = redactSecretsInValue(err) as Error;
    expect(redactedErr.message).toContain("[REDACTED]");
    expect(redactedErr.stack).toContain("[REDACTED]");

    const cyc: Record<string, unknown> = { api_key: "secret" };
    cyc.self = cyc;
    const redactedCyc = redactSecretsInValue(cyc) as Record<string, unknown>;
    expect(redactedCyc.api_key).toBe("[REDACTED]");
    expect(redactedCyc.self).toBe(cyc);

    const redactedArray = redactSecretsInValue([
      { password: "x" },
      "authorization=Bearer123",
    ]) as unknown[];
    expect((redactedArray[0] as Record<string, unknown>).password).toBe("[REDACTED]");
    expect(String(redactedArray[1])).toContain("[REDACTED]");

    expect(redactSecretsInValue(42)).toBe(42);
    expect(redactSecretsInValue({ safe: "ok" })).toEqual({ safe: "ok" });
  });
});

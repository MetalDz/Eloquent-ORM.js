import fs from "fs";
import os from "os";
import path from "path";
import { cacheClear } from "../cli/commands/cacheClear.js";
import { cacheStats } from "../cli/commands/cacheStats.js";
import { CacheAnalytics } from "../core/cache/CacheAnalytics.js";
import { CacheFallbackManager } from "../core/cache/CacheFallbackManager.js";
import { CacheManager } from "../core/cache/CacheManager.js";
import { CacheRegistry } from "../core/cache/CacheRegistry.js";
import { FileCacheDriver } from "../core/cache/drivers/FileCacheDriver.js";
import { MemoryCacheDriver } from "../core/cache/drivers/MemoryCacheDriver.js";

describe("Branch coverage 100% - phase 34 cache edge branches", () => {
  beforeEach(() => {
    (CacheRegistry as unknown as { registry: Map<string, Set<string>> }).registry = new Map();
    CacheAnalytics.reset();
    jest.spyOn(console, "log").mockImplementation(() => undefined);
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
    jest.unmock("memcached");
  });

  test("FileCacheDriver covers constructor/set default ttl branches", async () => {
    const driver = new FileCacheDriver();
    await driver.set("phase34:file:default", { ok: true });
    await expect(driver.get<{ ok: boolean }>("phase34:file:default")).resolves.toEqual({
      ok: true,
    });
    await driver.delete("phase34:file:default");
  });

  test("MemoryCacheDriver covers set() default ttl branch", async () => {
    const driver = new MemoryCacheDriver();
    await driver.set("phase34:memory:default", "value");
    await expect(driver.get("phase34:memory:default")).resolves.toBe("value");
  });

  test("MemcachedCacheDriver covers successful set/clear callback branches", async () => {
    jest.doMock("memcached", () => {
      return class FakeMemcached {
        get(_key: string, cb: (err: unknown, data?: unknown) => void): void {
          cb(null, null);
        }
        set(
          _key: string,
          _payload: string,
          _ttl: number,
          cb: (err: unknown) => void
        ): void {
          cb(null);
        }
        del(_key: string, cb: () => void): void {
          cb();
        }
        flush(cb: (err: unknown) => void): void {
          cb(null);
        }
        end(): void {
          return;
        }
      };
    });

    const { MemcachedCacheDriver } = require("../core/cache/drivers/MemcachedCacheDriver") as typeof import("../core/cache/drivers/MemcachedCacheDriver.js");
    const driver = new MemcachedCacheDriver();

    await expect(driver.set("phase34:mem", { x: 1 })).resolves.toBeUndefined();
    await expect(driver.clear()).resolves.toBeUndefined();
    await expect(driver.get("phase34:mem")).resolves.toBeNull();
    await expect(driver.delete("phase34:mem")).resolves.toBeUndefined();
    await expect(driver.close()).resolves.toBeUndefined();
  });

  test("CacheAnalytics covers total=0 return and mid hit-rate no-adjust path", () => {
    const internals = CacheAnalytics as unknown as {
      ensureModel(model: string, ttl: number): void;
      adjustTTL(model: string): void;
      stats: Map<string, { hits: number; misses: number; currentTTL: number; lastAdjust: number }>;
    };

    internals.ensureModel("ZeroOps", 120);
    internals.adjustTTL("ZeroOps");

    internals.stats.set("StableRate", {
      hits: 1,
      misses: 1,
      currentTTL: 120,
      lastAdjust: Date.now(),
    });
    internals.adjustTTL("StableRate");

    const stable = CacheAnalytics.getStats().find((row) => row.model === "StableRate");
    expect(stable?.ttl).toBe(120);
  });

  test("CacheRegistry covers removeKey-missing and clearModel non-matching key branch", async () => {
    const deleteSpy = jest.spyOn(CacheManager, "delete").mockResolvedValue(undefined);

    CacheRegistry.addKey("User", "findMany", "User:key:1");
    CacheRegistry.addKey("Post", "findMany", "Post:key:1");
    CacheRegistry.removeKey("User", "missing", "none");

    await CacheRegistry.clearModel("User");

    expect(deleteSpy).toHaveBeenCalledWith("User:key:1");
    expect(CacheRegistry.getKeys("Post", "findMany")).toEqual(["Post:key:1"]);
  });

  test("cacheClear prints success summaries when fallback clear/shutdown succeed", async () => {
    jest.spyOn(CacheRegistry, "clearAll").mockResolvedValue(undefined);
    jest
      .spyOn(CacheRegistry, "getStats")
      .mockReturnValueOnce({ models: 1, groups: 1, keys: 1, groupsByModel: [] })
      .mockReturnValueOnce({ models: 0, groups: 0, keys: 0, groupsByModel: [] });
    jest.spyOn(CacheFallbackManager, "getDrivers").mockReturnValue([{} as never]);
    jest
      .spyOn(CacheFallbackManager, "clearAllDrivers")
      .mockResolvedValue([{ driver: "cacheA", ok: true }]);
    jest
      .spyOn(CacheFallbackManager, "shutdownDrivers")
      .mockResolvedValue([{ driver: "cacheA", closed: true }]);

    await cacheClear();

    const out = (console.log as jest.Mock).mock.calls.flat().join("\n");
    expect(out).toContain("fallback chain clear: cacheA:ok");
    expect(out).toContain("fallback chain shutdown: cacheA:closed");
  });

  test("cacheStats prints no-op shutdown summary when fallback chain returns empty close results", async () => {
    jest
      .spyOn(CacheManager, "getDriver")
      .mockReturnValue({ constructor: { name: "MemoryCacheDriver" } } as never);
    jest.spyOn(CacheFallbackManager, "getActiveDriver").mockReturnValue(null);
    jest.spyOn(CacheFallbackManager, "getDrivers").mockReturnValue([{} as never]);
    jest.spyOn(CacheFallbackManager, "shutdownDrivers").mockResolvedValue([]);
    jest.spyOn(CacheRegistry, "getStats").mockReturnValue({
      models: 0,
      groups: 0,
      keys: 0,
      groupsByModel: [],
    });
    jest.spyOn(CacheAnalytics, "getStats").mockReturnValue([]);

    await cacheStats();

    const out = (console.log as jest.Mock).mock.calls.flat().join("\n");
    expect(out).toContain("fallback chain shutdown: no-op");
  });

  test("FileCacheDriver default directory path can be cleaned when discovered", async () => {
    const driver = new FileCacheDriver();
    await driver.set("phase34:file:cleanup", "x");
    const cacheDir = path.resolve(".cache");
    expect(fs.existsSync(cacheDir)).toBe(true);
    await driver.clear();
    await driver.delete("phase34:file:cleanup");
  });

  test("MemoryCacheDriver default ttl stores a long-lived entry (no immediate expiry)", async () => {
    const driver = new MemoryCacheDriver();
    await driver.set("phase34:memory:long", { n: 1 });
    await expect(driver.get("phase34:memory:long")).resolves.toEqual({ n: 1 });
  });

  test("temporary file cache dir path still works with explicit custom directory", async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "phase34-file-cache-"));
    const driver = new FileCacheDriver(tmp);
    await driver.set("phase34:file:tmp", { ok: true });
    await expect(driver.get("phase34:file:tmp")).resolves.toEqual({ ok: true });
    await driver.clear();
  });
});

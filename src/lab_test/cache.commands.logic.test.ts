import { cacheClear } from "../cli/commands/cacheClear.js";
import { cacheStats } from "../cli/commands/cacheStats.js";
import { CacheManager } from "../core/cache/CacheManager.js";
import { CacheRegistry } from "../core/cache/CacheRegistry.js";
import { CacheAnalytics } from "../core/cache/CacheAnalytics.js";
import { CacheFallbackManager } from "../core/cache/CacheFallbackManager.js";

describe("Milestone 1: cache command logic", () => {
  const originalAppEnv = process.env.APP_ENV;

  beforeEach(async () => {
    process.env.APP_ENV = "development";
    await CacheRegistry.clearAll();
    CacheAnalytics.reset();
  });

  afterEach(async () => {
    await CacheRegistry.clearAll();
    CacheAnalytics.reset();
    process.env.APP_ENV = originalAppEnv;
    jest.restoreAllMocks();
  });

  test("cache:clear resets registry and analytics state", async () => {
    await CacheManager.set("User:key1", { id: 1 }, 60);
    CacheRegistry.addKey("User", "all", "User:key1");
    CacheAnalytics.hit("User", 60);

    expect(CacheRegistry.getStats().keys).toBe(1);
    expect(CacheAnalytics.getStats().length).toBe(1);

    await cacheClear();

    expect(CacheRegistry.getStats().keys).toBe(0);
    expect(CacheRegistry.getStats().groups).toBe(0);
    expect(CacheAnalytics.getStats()).toHaveLength(0);
  });

  test("cache:stats uses configured runtime driver", async () => {
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);

    await cacheStats();

    const out = logSpy.mock.calls.flat().join(" ");
    expect(out).toContain("cache:stats");
    expect(out).toContain("manager driver: MemoryCacheDriver");
    expect(out).toContain("fallback chain: none");
  });

  test("cache:clear reports fallback clear/shutdown failures from result arrays", async () => {
    jest.spyOn(CacheFallbackManager, "getDrivers").mockReturnValue([{} as any]);
    jest.spyOn(CacheFallbackManager, "clearAllDrivers").mockResolvedValue([
      { driver: "memcached", ok: false, error: "clear-failed" },
    ]);
    jest.spyOn(CacheFallbackManager, "shutdownDrivers").mockResolvedValue([
      { driver: "memcached", closed: false, error: "shutdown-failed" },
    ]);
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);

    await cacheClear();

    const out = errorSpy.mock.calls.flat().join(" ");
    expect(out).toContain("warnings:");
    expect(out).toContain("Fallback memcached clear failed: clear-failed");
    expect(out).toContain("Fallback memcached shutdown failed: shutdown-failed");
  });

  test("cache:clear handles registry/fallback thrown errors without throwing", async () => {
    jest.spyOn(CacheRegistry, "clearAll").mockRejectedValueOnce(new Error("registry-failed"));
    jest.spyOn(CacheFallbackManager, "getDrivers").mockReturnValue([{} as any]);
    jest
      .spyOn(CacheFallbackManager, "clearAllDrivers")
      .mockRejectedValue(new Error("fallback-clear-failed"));
    jest
      .spyOn(CacheFallbackManager, "shutdownDrivers")
      .mockRejectedValue(new Error("fallback-shutdown-failed"));
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(cacheClear()).resolves.toBeUndefined();

    const out = errorSpy.mock.calls.flat().join(" ");
    expect(out).toContain("CacheManager clear failed: registry-failed");
    expect(out).toContain("Fallback clear failed: fallback-clear-failed");
    expect(out).toContain("Fallback shutdown failed: fallback-shutdown-failed");
  });
});

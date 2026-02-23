import { cacheClear } from "../cli/commands/cacheClear";
import { cacheStats } from "../cli/commands/cacheStats";
import { CacheManager } from "../core/cache/CacheManager";
import { CacheRegistry } from "../core/cache/CacheRegistry";
import { CacheAnalytics } from "../core/cache/CacheAnalytics";

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
});

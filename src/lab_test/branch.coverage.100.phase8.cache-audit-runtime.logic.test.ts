import fs from "fs";
import os from "os";
import path from "path";
import { cacheClear } from "../cli/commands/cacheClear";
import {
  appendAuditEvent,
  isAuditEnabled,
  resolveAuditActor,
  resolveAuditPath,
} from "../cli/utils/AuditTrail";
import { CacheAnalytics } from "../core/cache/CacheAnalytics";
import { CacheFallbackManager } from "../core/cache/CacheFallbackManager";
import { CacheRegistry } from "../core/cache/CacheRegistry";

describe("Branch coverage 100% - phase 8 cache/audit/runtime branches", () => {
  const originalEloquentModels = (global as { EloquentModels?: unknown }).EloquentModels;

  afterEach(async () => {
    jest.restoreAllMocks();
    jest.resetModules();
    jest.clearAllMocks();
    await CacheRegistry.clearAll();
    CacheAnalytics.reset();
    (global as { EloquentModels?: unknown }).EloquentModels = originalEloquentModels;
  });

  test("cacheClear handles non-Error throw values in registry and fallback failures", async () => {
    jest.spyOn(CacheFallbackManager, "getDrivers").mockReturnValue([{} as any]);
    jest.spyOn(CacheRegistry, "clearAll").mockRejectedValue("registry-string-failure");
    jest.spyOn(CacheFallbackManager, "clearAllDrivers").mockRejectedValue("clear-string-failure");
    jest.spyOn(CacheFallbackManager, "shutdownDrivers").mockRejectedValue("shutdown-string-failure");
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(cacheClear()).resolves.toBeUndefined();

    const out = errorSpy.mock.calls.flat().join(" ");
    expect(out).toContain("CacheManager clear failed: registry-string-failure");
    expect(out).toContain("Fallback clear failed: clear-string-failure");
    expect(out).toContain("Fallback shutdown failed: shutdown-string-failure");
  });

  test("cacheClear reports unknown fallback result errors when message is missing", async () => {
    jest.spyOn(CacheFallbackManager, "getDrivers").mockReturnValue([{} as any]);
    jest.spyOn(CacheFallbackManager, "clearAllDrivers").mockResolvedValue([
      { driver: "driverA", ok: false },
    ]);
    jest.spyOn(CacheFallbackManager, "shutdownDrivers").mockResolvedValue([
      { driver: "driverA", closed: false },
    ]);
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);

    await cacheClear();

    const out = errorSpy.mock.calls.flat().join(" ");
    expect(out).toContain("Fallback driverA clear failed: unknown error");
    expect(out).toContain("Fallback driverA shutdown failed: unknown error");
  });

  test("AuditTrail env branches and append failure swallow path are covered", () => {
    expect(isAuditEnabled({ ELOQUENT_AUDIT_ENABLED: "0" })).toBe(false);
    expect(isAuditEnabled({ ELOQUENT_AUDIT_ENABLED: "false" })).toBe(false);
    expect(isAuditEnabled({ ELOQUENT_AUDIT_ENABLED: "no" })).toBe(false);
    expect(isAuditEnabled({ ELOQUENT_AUDIT_ENABLED: "1" })).toBe(true);
    expect(isAuditEnabled({})).toBe(true);

    expect(resolveAuditActor({ USERNAME: "dev-user" })).toBe("dev-user");
    expect(resolveAuditActor({})).toBe("unknown");

    const resolvedPath = resolveAuditPath({});
    expect(resolvedPath).toContain(path.join("src", "test", "logs", "audit.log"));

    const appendSpy = jest.spyOn(fs, "appendFileSync").mockImplementation(() => {
      throw new Error("disk-failure");
    });
    const mkdirSpy = jest.spyOn(fs, "mkdirSync").mockImplementation(() => undefined as any);

    expect(() =>
      appendAuditEvent(
        {
          command: "migrate:run",
          result: "success",
          connectionName: "sqlite",
          metadata: { token: "secret" },
        },
        {
          ELOQUENT_AUDIT_ENABLED: "true",
          ELOQUENT_AUDIT_PATH: path.join(os.tmpdir(), "audit", "audit.log"),
        }
      )
    ).not.toThrow();

    expect(mkdirSpy).toHaveBeenCalled();
    expect(appendSpy).toHaveBeenCalled();
  });

  test("CacheAnalytics adjusts TTL up/down with bounds and tolerates model update failures", () => {
    const analytics = CacheAnalytics as any;
    const origAdjust = analytics.adjustInterval;
    const origMin = analytics.minTTL;
    const origMax = analytics.maxTTL;

    analytics.adjustInterval = 1;
    analytics.minTTL = 30;
    analytics.maxTTL = 3600;

    const logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);

    (global as { EloquentModels?: Record<string, { defaultCacheTTL?: number }> }).EloquentModels = {
      User: { defaultCacheTTL: 0 },
      Low: { defaultCacheTTL: 0 },
      High: { defaultCacheTTL: 0 },
    };

    CacheAnalytics.hit("User", 100);
    CacheAnalytics.miss("User", 100);
    CacheAnalytics.miss("Low", 31);
    CacheAnalytics.hit("High", 3600);

    const stats = CacheAnalytics.getStats();
    const user = stats.find((s) => s.model === "User");
    const low = stats.find((s) => s.model === "Low");
    const high = stats.find((s) => s.model === "High");
    expect(user?.ttl).toBeGreaterThanOrEqual(75);
    expect(low?.ttl).toBe(30);
    expect(high?.ttl).toBe(3600);
    expect(
      (global as { EloquentModels?: Record<string, { defaultCacheTTL?: number }> }).EloquentModels
        ?.User?.defaultCacheTTL
    ).toBeGreaterThan(0);

    const throwingModels: Record<string, unknown> = {};
    Object.defineProperty(throwingModels, "ProxyModel", {
      get() {
        throw new Error("proxy-get-failure");
      },
      enumerable: true,
      configurable: true,
    });
    (global as { EloquentModels?: unknown }).EloquentModels = throwingModels;
    expect(() => CacheAnalytics.hit("ProxyModel", 90)).not.toThrow();
    (global as { EloquentModels?: Record<string, { defaultCacheTTL?: number }> }).EloquentModels = {
      User: { defaultCacheTTL: 0 },
    };
    expect(logSpy).toHaveBeenCalled();

    analytics.adjustInterval = origAdjust;
    analytics.minTTL = origMin;
    analytics.maxTTL = origMax;
  });

  test("tsRuntime registers successfully when ts-node is available", () => {
    jest.isolateModules(() => {
      const register = jest.fn();
      jest.doMock("ts-node", () => ({ register }));
      const runtime = require("../cli/utils/typescript/tsRuntime") as typeof import("../cli/utils/typescript/tsRuntime");

      expect(runtime.ensureTsRuntime()).toBe(true);
      expect(runtime.ensureTsRuntime()).toBe(true);
      expect(register).toHaveBeenCalledTimes(1);
    });
  });
});

import fs from "fs";
import fsp from "fs/promises";
import os from "os";
import path from "path";
import { CacheDriver } from "../core/cache/CacheDriver";
import { CacheFallbackManager } from "../core/cache/CacheFallbackManager";
import { CacheRegistry } from "../core/cache/CacheRegistry";
import { CacheAnalytics } from "../core/cache/CacheAnalytics";
import { CacheManager } from "../core/cache/CacheManager";
import { setupCache } from "../core/cache/setupCache";
import { FileCacheDriver } from "../core/cache/drivers/FileCacheDriver";
import { MemoryCacheDriver } from "../core/cache/drivers/MemoryCacheDriver";

type DriverLike = CacheDriver & {
  close?: () => Promise<void> | void;
  disconnect?: () => Promise<void> | void;
  end?: () => void;
};

function makeDriver(
  name: string,
  overrides: Partial<{
    get: (key: string) => Promise<unknown>;
    set: (key: string, value: unknown, ttl?: number) => Promise<void>;
    delete: (key: string) => Promise<void>;
    clear: () => Promise<void>;
    close: () => Promise<void> | void;
    disconnect: () => Promise<void> | void;
    end: () => void;
  }> = {}
): DriverLike {
  const base: DriverLike = {
    constructor: { name } as { name: string },
    get: async () => null,
    set: async () => undefined,
    delete: async () => undefined,
    clear: async () => undefined,
  } as unknown as DriverLike;
  return Object.assign(base, overrides);
}

describe("Branch coverage 70% - Phase 2 cache and connection", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.restoreAllMocks();
    (CacheRegistry as unknown as { registry: Map<string, Set<string>> }).registry = new Map();
    CacheAnalytics.reset();
  });

  afterEach(async () => {
    process.env = { ...originalEnv };
    jest.resetModules();
    jest.restoreAllMocks();
    await CacheRegistry.clearAll().catch(() => undefined);
    CacheAnalytics.reset();
  });

  test("CacheFallbackManager switches active driver and throws when all drivers fail", async () => {
    const first = makeDriver("FirstDriver", {
      get: async () => {
        throw new Error("first failed");
      },
    });
    const second = makeDriver("SecondDriver", {
      get: async () => "ok",
    });
    CacheFallbackManager.useChain([first, second]);

    const value = await CacheFallbackManager.get("k");
    expect(value).toBe("ok");
    expect(CacheFallbackManager.getActiveDriver()).toBe(second);

    const allFailA = makeDriver("AllFailA", {
      get: async () => {
        throw new Error("a");
      },
    });
    const allFailB = makeDriver("AllFailB", {
      get: async () => {
        throw new Error("b");
      },
    });
    CacheFallbackManager.useChain([allFailA, allFailB]);
    await expect(CacheFallbackManager.get("k")).rejects.toThrow(
      "All cache drivers failed in fallback chain."
    );
  });

  test("CacheFallbackManager tryChain calls onFailure when a driver fails", async () => {
    const failed = makeDriver("FailedDriver", {
      get: async () => {
        throw new Error("failed-driver");
      },
    });
    const passed = makeDriver("PassedDriver", {
      get: async () => "ok",
    });
    CacheFallbackManager.useChain([failed, passed]);

    const manager = CacheFallbackManager as unknown as {
      tryChain<T>(
        fn: (driver: CacheDriver) => Promise<T>,
        onFailure?: (err: unknown, driver: CacheDriver) => void,
      ): Promise<T>;
    };
    const onFailure = jest.fn();

    const value = await manager.tryChain((driver) => driver.get("key"), onFailure);
    expect(value).toBe("ok");
    expect(onFailure).toHaveBeenCalledWith(expect.any(Error), failed);
  });

  test("CacheFallbackManager clearAllDrivers and shutdownDrivers cover timeout/error/close paths", async () => {
    const managerAny = CacheFallbackManager as unknown as { opTimeoutMs: number };
    const previousTimeout = managerAny.opTimeoutMs;
    managerAny.opTimeoutMs = 5;

    const timeoutDriver = makeDriver("TimeoutDriver", {
      clear: () => new Promise<void>(() => undefined),
    });
    const errorDriver = makeDriver("ErrorDriver", {
      clear: async () => {
        throw new Error("clear failed");
      },
      close: async () => {
        throw new Error("close failed");
      },
    });
    const closeDriver = makeDriver("CloseDriver", {
      close: async () => undefined,
    });
    const disconnectDriver = makeDriver("DisconnectDriver", {
      disconnect: async () => undefined,
    });
    const endDriver = makeDriver("EndDriver", {
      end: () => undefined,
    });

    CacheFallbackManager.useChain([
      timeoutDriver,
      errorDriver,
      closeDriver,
      disconnectDriver,
      endDriver,
    ]);

    const clearResults = await CacheFallbackManager.clearAllDrivers();
    expect(clearResults.find((r) => r.driver === "TimeoutDriver")?.ok).toBe(false);
    expect(clearResults.find((r) => r.driver === "ErrorDriver")?.ok).toBe(false);
    expect(clearResults.find((r) => r.driver === "CloseDriver")?.ok).toBe(true);

    const closeResults = await CacheFallbackManager.shutdownDrivers();
    expect(closeResults.find((r) => r.driver === "ErrorDriver")?.closed).toBe(false);
    expect(closeResults.find((r) => r.driver === "CloseDriver")?.closed).toBe(true);
    expect(closeResults.find((r) => r.driver === "DisconnectDriver")?.closed).toBe(true);
    expect(closeResults.find((r) => r.driver === "EndDriver")?.closed).toBe(true);

    managerAny.opTimeoutMs = previousTimeout;
  });

  test("CacheRegistry covers model/group key management and clear operations", async () => {
    const deleteSpy = jest.spyOn(CacheManager, "delete").mockResolvedValue(undefined);
    const clearSpy = jest.spyOn(CacheManager, "clear").mockResolvedValue(undefined);

    CacheRegistry.addKey("User", "findMany", "User:a");
    CacheRegistry.addKey("User", "findMany", "User:b");
    CacheRegistry.addKey("User", "where", "User:c");
    CacheRegistry.addKey("Post", "findMany", "Post:a");

    expect(CacheRegistry.getKeys("User", "findMany").sort()).toEqual(["User:a", "User:b"]);
    expect(CacheRegistry.getKeys("User").sort()).toEqual(["User:a", "User:b", "User:c"]);
    expect(CacheRegistry.getStats().models).toBe(2);

    CacheRegistry.removeKey("User", "findMany", "User:a");
    expect(CacheRegistry.getKeys("User", "findMany")).toEqual(["User:b"]);

    CacheRegistry.removeKey("User", "findMany", "User:b");
    expect(CacheRegistry.getKeys("User", "findMany")).toEqual([]);

    await CacheRegistry.clearGroup("User", "missing");
    expect(deleteSpy).not.toHaveBeenCalled();

    await CacheRegistry.clearGroup("User", "where");
    expect(deleteSpy).toHaveBeenCalledWith("User:c");

    await CacheRegistry.clearModel("Post");
    expect(deleteSpy).toHaveBeenCalledWith("Post:a");

    await CacheRegistry.clearAll();
    expect(clearSpy).toHaveBeenCalled();
    expect(CacheRegistry.getStats().keys).toBe(0);
  });

  test("CacheAnalytics covers hit/miss adjust branches, stats, and reset", () => {
    const analyticsAny = CacheAnalytics as unknown as {
      adjustInterval: number;
      minTTL: number;
      maxTTL: number;
      adjustTTL: (model: string) => void;
    };
    analyticsAny.adjustInterval = 1;
    analyticsAny.minTTL = 30;
    analyticsAny.maxTTL = 3600;

    const logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
    (global as unknown as { EloquentModels?: Record<string, { defaultCacheTTL?: number }> }).EloquentModels = {
      User: {},
    };

    CacheAnalytics.hit("User", 100);
    expect(CacheAnalytics.getStats()[0].ttl).toBe(125);
    expect(
      (global as unknown as { EloquentModels: Record<string, { defaultCacheTTL?: number }> }).EloquentModels
        .User.defaultCacheTTL
    ).toBe(125);

    delete (global as unknown as { EloquentModels?: Record<string, unknown> }).EloquentModels;
    CacheAnalytics.miss("Post", 40);
    expect(CacheAnalytics.getStats().find((s) => s.model === "Post")?.ttl).toBe(30);

    analyticsAny.adjustTTL("UnknownModel");
    expect(logSpy).toHaveBeenCalled();

    CacheAnalytics.reset();
    expect(CacheAnalytics.getStats()).toEqual([]);
  });

  test("setupCache covers development, staging, production, and default env branches", () => {
    const useSpy = jest.spyOn(CacheManager, "use").mockImplementation(() => undefined);
    const chainSpy = jest.spyOn(CacheFallbackManager, "useChain").mockImplementation(() => undefined);
    jest.spyOn(console, "log").mockImplementation(() => undefined);

    process.env.APP_ENV = "development";
    setupCache();
    expect(useSpy).toHaveBeenCalledWith(expect.any(MemoryCacheDriver));

    process.env.APP_ENV = "staging";
    process.env.CACHE_DIR = "custom-cache-dir";
    setupCache();
    expect(useSpy.mock.calls[1]?.[0]).toBeInstanceOf(FileCacheDriver);

    process.env.APP_ENV = "production";
    process.env.MEMCACHED_HOST = "10.0.0.2";
    process.env.MEMCACHED_PORT = "11222";
    setupCache();
    expect(chainSpy).toHaveBeenCalledWith(
      expect.arrayContaining([expect.anything(), expect.any(FileCacheDriver), expect.any(MemoryCacheDriver)])
    );

    process.env.APP_ENV = "unknown";
    setupCache();
    expect(useSpy).toHaveBeenLastCalledWith(expect.any(MemoryCacheDriver));
  });

  test("FileCacheDriver covers miss, parse error, expiry cleanup, and clear", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "file-cache-driver-"));
    const driver = new FileCacheDriver(dir);

    expect(await driver.get("missing")).toBeNull();

    await driver.set("k1", { ok: true }, 0);
    expect(await driver.get<{ ok: boolean }>("k1")).toEqual({ ok: true });

    const badFile = path.join(dir, `${encodeURIComponent("bad")}.json`);
    await fsp.writeFile(badFile, "{not-json", "utf8");
    expect(await driver.get("bad")).toBeNull();

    const expiredFile = path.join(dir, `${encodeURIComponent("expired")}.json`);
    await fsp.writeFile(
      expiredFile,
      JSON.stringify({ value: 1, expiresAt: Date.now() - 1000 }),
      "utf8"
    );
    expect(await driver.get("expired")).toBeNull();
    expect(fs.existsSync(expiredFile)).toBe(false);

    await driver.clear();
    const filesAfterClear = await fsp.readdir(dir);
    expect(filesAfterClear).toHaveLength(0);
  });

  test("MemoryCacheDriver covers hit, miss, expiry, delete, and clear", async () => {
    const driver = new MemoryCacheDriver();
    expect(await driver.get("missing")).toBeNull();

    await driver.set("k", { id: 1 }, 0);
    expect(await driver.get<{ id: number }>("k")).toEqual({ id: 1 });

    const nowSpy = jest.spyOn(Date, "now");
    nowSpy.mockReturnValue(1000);
    await driver.set("ttl", "v", 1);
    nowSpy.mockReturnValue(2501);
    expect(await driver.get("ttl")).toBeNull();
    nowSpy.mockRestore();

    await driver.set("x", 1, 0);
    await driver.delete("x");
    expect(await driver.get("x")).toBeNull();

    await driver.set("a", 1, 0);
    await driver.set("b", 2, 0);
    await driver.clear();
    expect(await driver.get("a")).toBeNull();
    expect(await driver.get("b")).toBeNull();
  });

  test("MemcachedCacheDriver covers success and failure branches via module mock", async () => {
    jest.resetModules();
    type Callback<T = unknown> = (err: unknown, data?: T) => void;
    const mockClient = {
      get: jest.fn((key: string, cb: Callback) => cb(null, '{"x":1}')),
      set: jest.fn((key: string, payload: string, ttl: number, cb: (err?: unknown) => void) => cb()),
      del: jest.fn((key: string, cb: () => void) => cb()),
      flush: jest.fn((cb: (err?: unknown) => void) => cb()),
      end: jest.fn(),
    };
    const MemcachedCtor = jest.fn(() => mockClient);

    jest.doMock("memcached", () => ({
      __esModule: true,
      default: MemcachedCtor,
    }));

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { MemcachedCacheDriver } = require("../core/cache/drivers/MemcachedCacheDriver") as {
      MemcachedCacheDriver: new (servers?: string | string[], defaultTtl?: number) => {
        get<T>(key: string): Promise<T | null>;
        set<T>(key: string, value: T, ttl?: number): Promise<void>;
        delete(key: string): Promise<void>;
        clear(): Promise<void>;
        close(): Promise<void>;
      };
    };

    const driver = new MemcachedCacheDriver("127.0.0.1:11211", 60);
    expect(await driver.get<{ x: number }>("k")).toEqual({ x: 1 });

    mockClient.get.mockImplementationOnce((key: string, cb: Callback) => cb(null, "raw-value"));
    expect(await driver.get<string>("k2")).toBe("raw-value");

    mockClient.get.mockImplementationOnce((key: string, cb: Callback) => cb(new Error("miss")));
    expect(await driver.get("k3")).toBeNull();

    mockClient.set.mockImplementationOnce(
      (key: string, payload: string, ttl: number, cb: (err?: unknown) => void) =>
        cb(new Error("set failed"))
    );
    await expect(driver.set("x", { id: 1 })).rejects.toThrow("set failed");

    mockClient.flush.mockImplementationOnce((cb: (err?: unknown) => void) =>
      cb(new Error("flush failed"))
    );
    await expect(driver.clear()).rejects.toThrow("flush failed");

    await expect(driver.delete("x")).resolves.toBeUndefined();
    await expect(driver.close()).resolves.toBeUndefined();
    expect(mockClient.end).toHaveBeenCalled();
  });

  test("DatabaseConnection covers mysql/pg/sqlite/mongo switches and closeMongoClient", async () => {
    jest.resetModules();

    const createPool = jest.fn(() => ({ kind: "mysqlPool" }));
    const pgConnect = jest.fn().mockResolvedValue(undefined);
    const PgClient = jest.fn(() => ({ connect: pgConnect }));
    const sqliteCtor = jest.fn((sqlitePath: string) => ({ kind: "sqliteConn", sqlitePath }));
    const mongoDb = { kind: "mongoDb" };
    const mongoClose = jest.fn().mockResolvedValue(undefined);
    const mongoConnect = jest.fn().mockResolvedValue(undefined);
    const MongoClient = jest.fn(() => ({
      connect: mongoConnect,
      db: jest.fn(() => mongoDb),
      close: mongoClose,
    }));

    jest.doMock("mysql2/promise", () => ({ createPool }));
    jest.doMock("pg", () => ({ Client: PgClient }));
    jest.doMock("mongodb", () => ({ MongoClient }));
    jest.doMock("../core/connection/BetterSqliteConnection", () => ({
      BetterSqliteConnection: sqliteCtor,
    }));
    jest.spyOn(console, "log").mockImplementation(() => undefined);

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { connectDB, closeMongoClient } = require("../core/connection/DatabaseConnection") as {
      connectDB: (name: string) => Promise<unknown>;
      closeMongoClient: (connection: unknown) => Promise<boolean>;
    };
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { dbConfig } = require("../config/database") as {
      dbConfig: { connections: Record<string, Record<string, unknown>> };
    };

    expect(await connectDB("mysql")).toEqual({ kind: "mysqlPool" });
    expect(createPool).toHaveBeenCalled();

    await connectDB("pg");
    expect(pgConnect).toHaveBeenCalled();

    const sqliteConn = (await connectDB("sqlite")) as { kind: string };
    expect(sqliteConn.kind).toBe("sqliteConn");
    expect(sqliteCtor).toHaveBeenCalled();

    const mongoConn = await connectDB("mongo");
    expect(mongoConnect).toHaveBeenCalled();
    await expect(closeMongoClient(mongoConn)).resolves.toBe(true);
    expect(mongoClose).toHaveBeenCalled();
    await expect(closeMongoClient({})).resolves.toBe(false);

    dbConfig.connections.__invalid = { driver: "unsupported" };
    await expect(connectDB("__invalid")).rejects.toThrow("Unsupported driver: unsupported");
    delete dbConfig.connections.__invalid;
  });
});

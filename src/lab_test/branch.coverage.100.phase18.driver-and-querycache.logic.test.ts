import { createAdapter } from "../core/connection/DriverAdapter.js";
import { CacheAnalytics } from "../core/cache/CacheAnalytics.js";
import { CacheFallbackManager } from "../core/cache/CacheFallbackManager.js";
import { CacheManager } from "../core/cache/CacheManager.js";
import { CacheRegistry } from "../core/cache/CacheRegistry.js";
import { QueryCacheMixin } from "../core/orm/mixins/QueryCacheMixin.js";
import { HookStore } from "../core/orm/mixins/utils/HookStore.js";
import { ModelRegistry } from "../core/orm/mixins/utils/ModelRegistry.js";

abstract class EmptyBase {}

class Phase18CacheModel extends QueryCacheMixin(
  EmptyBase as unknown as abstract new (...args: any[]) => object
) {
  enableCache(ttl = 60): this {
    return (this as any).cache(ttl);
  }

  disableCache(): this {
    return (this as any).withoutCache();
  }

  runCached<T>(payload: unknown, execute: () => Promise<T>, group = "default"): Promise<T> {
    return (this as any).runWithCache(payload, execute, group);
  }

  key(payload: unknown): string {
    return (this as any).generateCacheKey(payload);
  }

  resolveTtl(payload: unknown, group = "default"): number {
    return (this as any).resolveTTL(payload, group);
  }
}

describe("Branch coverage 100% - phase 18 driver + query-cache edges", () => {
  beforeEach(() => {
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
    jest.spyOn(console, "log").mockImplementation(() => undefined);
    jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(async () => {
    HookStore.clear();
    ModelRegistry.clear();
    CacheAnalytics.reset();
    await CacheRegistry.clearAll().catch(() => undefined);
    jest.restoreAllMocks();
  });

  test("covers DriverAdapter default-arg/null/identifier-star branches across mysql/sqlite/pg", async () => {
    const mysqlQuery = jest
      .fn()
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([undefined])
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([{ insertedId: 11 }]);

    const mysql = createAdapter("mysql_test", { query: mysqlQuery } as never);
    expect(mysql.wrapId("*")).toBe("*");
    expect(mysql.placeholders(0)).toBe("");
    expect(mysql.inClause("id", [1])).toEqual({
      sql: "id IN (?)",
      params: [1],
      nextIndex: 2,
    });
    await expect(mysql.queryOne("SELECT 1")).resolves.toBeNull();
    await expect(mysql.execute("DELETE FROM users")).resolves.toBeUndefined();
    await expect(mysql.insert("INSERT INTO users DEFAULT VALUES")).resolves.toEqual({
      id: undefined,
    });
    await expect(mysql.insert("INSERT INTO users DEFAULT VALUES")).resolves.toEqual({
      id: 11,
    });

    const sqliteAll = jest.fn().mockResolvedValue([]);
    const sqliteGet = jest.fn().mockResolvedValue(undefined);
    const sqliteRun = jest
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ lastID: 99 });
    const sqlite = createAdapter(
      "sqlite_test",
      { all: sqliteAll, get: sqliteGet, run: sqliteRun } as never
    );
    expect(sqlite.wrapId("*")).toBe("*");
    expect(sqlite.placeholders(0)).toBe("");
    await expect(sqlite.queryOne("SELECT 1")).resolves.toBeNull();
    await expect(sqlite.execute("DELETE FROM users")).resolves.toBeUndefined();
    await expect(sqlite.insert("INSERT INTO users DEFAULT VALUES")).resolves.toEqual({
      id: undefined,
    });
    await expect(sqlite.insert("INSERT INTO users DEFAULT VALUES", [])).resolves.toEqual({
      id: 99,
    });

    const pgQuery = jest
      .fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    const pg = createAdapter("pg_test", { query: pgQuery } as never);
    expect(pg.wrapId("*")).toBe("*");
    expect(pg.placeholders(0)).toBe("");
    expect(pg.inClause('"id"', [4])).toEqual({
      sql: '"id" = ANY($1)',
      params: [[4]],
      nextIndex: 2,
    });
    await expect(pg.queryOne("SELECT 1")).resolves.toBeNull();
    await expect(pg.execute("DELETE FROM users")).resolves.toBeUndefined();
    await expect(pg.insert("INSERT INTO users (name) VALUES ($1) RETURNING id", ["x"])).resolves.toEqual({
      id: undefined,
      row: undefined,
    });
  });

  test("covers QueryCacheMixin strict-mode gate, key-normalization, model-name fallback invalidation", async () => {
    class StrictModel extends QueryCacheMixin(
      EmptyBase as unknown as abstract new (...args: any[]) => object
    ) {}

    ModelRegistry.setStrictMode(true);
    const addSpy = jest.spyOn(HookStore, "add");
    const strict = new StrictModel();
    expect(addSpy).not.toHaveBeenCalled();

    const clearModelSpy = jest.spyOn(CacheRegistry, "clearModel").mockResolvedValue(undefined);
    const clearGroupSpy = jest.spyOn(CacheRegistry, "clearGroup").mockResolvedValue(undefined);

    Object.defineProperty(strict, "constructor", {
      value: { name: "" },
      configurable: true,
    });
    await (strict as any).invalidateModelCache();
    await (strict as any).invalidateCacheGroup("g");
    expect(clearModelSpy).toHaveBeenCalledWith("Model");
    expect(clearGroupSpy).toHaveBeenCalledWith("Model", "g");

    const key = (strict as any).generateCacheKey({
      at: new Date("2025-01-01T00:00:00.000Z"),
      fn: () => "ignored",
      id: 1,
    });
    expect(typeof key).toBe("string");
    expect(key).toHaveLength(64);
  });

  test("covers QueryCacheMixin fallback-cache hit path, hit-error swallow, ttl branches, and fast-path bypass", async () => {
    const model = new Phase18CacheModel();
    const ctor = model.constructor as typeof Phase18CacheModel;

    // Has-defaults OR branches and resolve order.
    ctor.cacheTTL = { list: 25 };
    delete ctor.defaultCacheTTL;
    delete ctor.cacheStrategy;
    expect(model.resolveTtl({ page: 1 }, "list")).toBe(25);

    delete ctor.cacheTTL;
    ctor.defaultCacheTTL = 33;
    expect(model.resolveTtl({ page: 1 }, "list")).toBe(33);

    ctor.cacheStrategy = () => 9;
    expect(model.resolveTtl({ page: 1 }, "list")).toBe(9);

    const executeFn = jest.fn(async () => "fresh");
    const getFallbackSpy = jest
      .spyOn(CacheFallbackManager, "getActiveDriver")
      .mockReturnValue({ name: "primary" } as never);
    const fallbackGetSpy = jest
      .spyOn(CacheFallbackManager, "get")
      .mockResolvedValue("cached" as never);
    const hitSpy = jest.spyOn(CacheAnalytics, "hit").mockImplementation(() => {
      throw new Error("hit-fail");
    });

    model.enableCache(20);
    const cached = await model.runCached({ page: 2 }, executeFn);
    expect(cached).toBe("cached");
    expect(executeFn).not.toHaveBeenCalled();
    expect(getFallbackSpy).toHaveBeenCalled();
    expect(fallbackGetSpy).toHaveBeenCalled();
    expect(hitSpy).toHaveBeenCalled();

    // Fast path: cache disabled and no model defaults.
    model.disableCache();
    delete ctor.defaultCacheTTL;
    delete ctor.cacheStrategy;
    delete ctor.cacheTTL;
    const cacheManagerGetSpy = jest.spyOn(CacheManager, "get");
    const direct = await model.runCached({ page: 3 }, async () => "direct", "custom");
    expect(direct).toBe("direct");
    expect(cacheManagerGetSpy).not.toHaveBeenCalled();
  });
});

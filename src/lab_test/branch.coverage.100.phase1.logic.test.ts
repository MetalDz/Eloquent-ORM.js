import { CacheManager } from "../core/cache/CacheManager";
import { SQLDialect } from "../core/schema/SQLDialect";
import { ModelRegistry } from "../core/orm/mixins/utils/ModelRegistry";

describe("Branch coverage 100% - phase 1 deterministic closures", () => {
  const originalDriver = CacheManager.getDriver();

  afterEach(() => {
    CacheManager.use(originalDriver);
    ModelRegistry.clear();
    jest.restoreAllMocks();
  });

  test("CacheManager delegates to configured driver and covers default ttl branch", async () => {
    const driver = {
      get: jest.fn(async (key: string) => `v:${key}`),
      set: jest.fn(async () => undefined),
      delete: jest.fn(async () => undefined),
      clear: jest.fn(async () => undefined),
    };

    CacheManager.use(driver as any);

    await expect(CacheManager.get("k1")).resolves.toBe("v:k1");
    await CacheManager.set("k1", "v1");
    await CacheManager.set("k1", "v2", 15);
    await CacheManager.delete("k1");
    await CacheManager.clear();

    expect(driver.get).toHaveBeenCalledWith("k1");
    expect(driver.set).toHaveBeenNthCalledWith(1, "k1", "v1", 60);
    expect(driver.set).toHaveBeenNthCalledWith(2, "k1", "v2", 15);
    expect(driver.delete).toHaveBeenCalledWith("k1");
    expect(driver.clear).toHaveBeenCalledTimes(1);
  });

  test("SQLDialect covers pg/sqlite/default wrap branches and statement formatters", () => {
    const pg = new SQLDialect("pg");
    const sqlite = new SQLDialect("sqlite");
    const mysql = new SQLDialect("mysql");
    const unknown = new SQLDialect("unknown" as any);

    expect(pg.wrap('a"b')).toBe('"a""b"');
    expect(sqlite.wrap('x"y')).toBe('"x""y"');
    expect(mysql.wrap("a`b")).toBe("`a``b`");
    expect(unknown.wrap("table_name")).toBe("`table_name`");

    expect(pg.formatCreateSQL("users", ['"id" integer'])).toContain(
      'CREATE TABLE IF NOT EXISTS "users"'
    );
    expect(sqlite.formatDropSQL("logs")).toBe('DROP TABLE IF EXISTS "logs";');
  });

  test("ModelRegistry covers strict/non-strict assert and ensure branches", () => {
    class UserModel {}
    class PostModel {}

    ModelRegistry.grantMany([UserModel, PostModel]);
    expect(ModelRegistry.isGranted(UserModel)).toBe(true);
    expect(ModelRegistry.isGranted(PostModel)).toBe(true);

    ModelRegistry.setStrictMode(false);
    expect(() => ModelRegistry.assertGranted(class TempModel {}, "lifecycle")).not.toThrow();

    ModelRegistry.setStrictMode(true);
    expect(() => ModelRegistry.assertGranted(UserModel, "registration")).not.toThrow();

    expect(() => ModelRegistry.assertGranted(class X {}, "registration")).toThrow(
      "Hook registration denied for unregistered model: X"
    );

    expect(() =>
      ModelRegistry.assertGranted(function () {}, "lifecycle")
    ).toThrow("Model not granted in ModelRegistry: AnonymousModel");

    expect(() => ModelRegistry.ensureGranted(class Y {}, "registration")).toThrow(
      "Hook registration denied for unregistered model: Y"
    );

    ModelRegistry.setStrictMode(false);
    class LazyModel {}
    ModelRegistry.ensureGranted(LazyModel, "lifecycle");
    expect(ModelRegistry.isGranted(LazyModel)).toBe(true);
  });
});

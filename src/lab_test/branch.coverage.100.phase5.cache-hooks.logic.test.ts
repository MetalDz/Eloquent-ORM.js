import fs from "fs/promises";
import os from "os";
import path from "path";
import { CacheFallbackManager } from "../core/cache/CacheFallbackManager";
import { CacheManager } from "../core/cache/CacheManager";
import { FileCacheDriver } from "../core/cache/drivers/FileCacheDriver";
import { MemoryCacheDriver } from "../core/cache/drivers/MemoryCacheDriver";
import { MemcachedCacheDriver } from "../core/cache/drivers/MemcachedCacheDriver";
import { setupCache } from "../core/cache/setupCache";
import { HooksMixin } from "../core/orm/mixins/HooksMixin";
import { MorphRegistry } from "../core/orm/mixins/MorphRegistry";
import { HookStore } from "../core/orm/mixins/utils/HookStore";
import { ModelRegistry } from "../core/orm/mixins/utils/ModelRegistry";

class HookBase {
  public calls: string[] = [];

  async create(data: Record<string, unknown>): Promise<unknown> {
    this.calls.push("create");
    return { ...data };
  }

  async update(_id: number | string, _data: Record<string, unknown>, _pk = "id"): Promise<void> {
    this.calls.push("update");
  }

  async delete(_id: number | string, _pk = "id"): Promise<void> {
    this.calls.push("delete");
  }
}

const HookableBase = HooksMixin(HookBase as unknown as abstract new (...args: any[]) => object);
class HookedModel extends HookableBase {}

describe("Branch coverage 100% - phase 5 cache/config/hooks closures", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    HookStore.clear();
    ModelRegistry.clear();
    MorphRegistry.clear();
    jest.restoreAllMocks();
    jest.spyOn(console, "log").mockImplementation(() => undefined);
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
    jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    HookStore.clear();
    ModelRegistry.clear();
    MorphRegistry.clear();
    jest.restoreAllMocks();
  });

  test("setupCache covers NODE_ENV fallback and hard default fallback branches", () => {
    const useSpy = jest.spyOn(CacheManager, "use").mockImplementation(() => undefined);
    const chainSpy = jest.spyOn(CacheFallbackManager, "useChain").mockImplementation(() => undefined);

    delete process.env.APP_ENV;
    process.env.NODE_ENV = "staging";
    setupCache();
    expect(useSpy).toHaveBeenLastCalledWith(expect.any(FileCacheDriver));

    delete process.env.APP_ENV;
    delete process.env.NODE_ENV;
    setupCache();
    expect(useSpy).toHaveBeenLastCalledWith(expect.any(MemoryCacheDriver));
    expect(chainSpy).not.toHaveBeenCalled();
  });

  test("FileCacheDriver covers ttl>0, delete catch, and clear readdir catch branches", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "phase5-file-driver-"));
    const driver = new FileCacheDriver(dir);

    await driver.set("ttl-key", { ok: true }, 5);
    await expect(driver.get("ttl-key")).resolves.toEqual({ ok: true });

    const unlinkSpy = jest.spyOn(fs, "unlink");
    unlinkSpy.mockRejectedValueOnce(new Error("unlink-fail"));
    await expect(driver.delete("missing-key")).resolves.toBeUndefined();

    const readdirSpy = jest.spyOn(fs, "readdir");
    readdirSpy.mockRejectedValueOnce(new Error("readdir-fail"));
    await expect(driver.clear()).resolves.toBeUndefined();
  });

  test("MemcachedCacheDriver covers undefined/null get values and default ctor arguments", async () => {
    const driver = new MemcachedCacheDriver();
    const client = (driver as unknown as { client: any }).client as {
      get: (key: string, cb: (err: unknown, data?: unknown) => void) => void;
      end: () => void;
    };

    const getSpy = jest.spyOn(client, "get");
    getSpy.mockImplementationOnce((_key, cb) => cb(null, undefined));
    await expect(driver.get("undef")).resolves.toBeNull();

    getSpy.mockImplementationOnce((_key, cb) => cb(null, null));
    await expect(driver.get("null")).resolves.toBeNull();

    const endSpy = jest.spyOn(client, "end");
    await expect(driver.close()).resolves.toBeUndefined();
    expect(endSpy).toHaveBeenCalledTimes(1);
  });

  test("database config covers env override and fallback defaults on module load", () => {
    const originalDbConnection = process.env.DB_CONNECTION;
    const originalMongoUri = process.env.MONGO_URI;
    const originalMongoDb = process.env.MONGO_DB;

    try {
      process.env.DB_CONNECTION = "pg";
      process.env.MONGO_URI = "mongodb://example.internal:27018";
      process.env.MONGO_DB = "custom_db";
      jest.resetModules();
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const cfgWithEnv = require("../config/database").dbConfig as {
        default: string;
        connections: Record<string, any>;
      };
      expect(cfgWithEnv.default).toBe("pg");
      expect(cfgWithEnv.connections.mongo.uri).toBe("mongodb://example.internal:27018");
      expect(cfgWithEnv.connections.mongo.database).toBe("custom_db");

      process.env.DB_CONNECTION = "";
      process.env.MONGO_URI = "";
      process.env.MONGO_DB = "";
      jest.resetModules();
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const cfgFallback = require("../config/database").dbConfig as {
        default: string;
        connections: Record<string, any>;
      };
      expect(cfgFallback.default).toBe("mysql");
      expect(cfgFallback.connections.mongo.uri).toBe("mongodb://localhost:27017");
      expect(cfgFallback.connections.mongo.database).toBe("eloquentjs_db");
    } finally {
      process.env.DB_CONNECTION = originalDbConnection;
      process.env.MONGO_URI = originalMongoUri;
      process.env.MONGO_DB = originalMongoDb;
    }
  });

  test("MorphRegistry covers invalid registration and missing resolve branches", () => {
    class Photo {}
    class Video {}

    MorphRegistry.registerMap({ photo: Photo as any, video: Video as any });
    expect(MorphRegistry.has("photo")).toBe(true);
    expect(MorphRegistry.resolve("photo")).toBe(Photo);
    expect(MorphRegistry.getMorphedModel("video")).toBe(Video);
    expect(MorphRegistry.list()).toEqual({ photo: "Photo", video: "Video" });

    expect(() => MorphRegistry.register("", Photo as any)).toThrow("Invalid morph registration");
    expect(() => MorphRegistry.register("broken", null as unknown as any)).toThrow(
      "Invalid morph registration"
    );
    expect(() => MorphRegistry.resolve("missing")).toThrow("Morph type 'missing' not found");
  });

  test("HooksMixin covers deprecation dedupe, disabled hooks, and missing base method guards", async () => {
    const warnSpy = jest.spyOn(console, "warn");
    const onCreated = jest.fn(async () => undefined);
    const onUpdated = jest.fn(async () => undefined);

    (HookedModel as any).on("created", onCreated);
    (HookedModel as any).on("created", onCreated);

    const instance = new (HookedModel as any)();
    instance.registerHook("updated", onUpdated);
    instance.registerHook("updated", onUpdated);

    expect(warnSpy).toHaveBeenCalledTimes(2);

    process.env.ELOQUENT_DISABLE_MODEL_HOOKS = "true";
    await instance.create({ name: "disabled" });
    process.env.ELOQUENT_DISABLE_MODEL_HOOKS = "1";
    await instance.update(1, { name: "disabled-2" });

    expect(onCreated).not.toHaveBeenCalled();
    expect(onUpdated).not.toHaveBeenCalled();

    class MissingCreate {
      async update(): Promise<void> {
        return;
      }
      async delete(): Promise<void> {
        return;
      }
    }
    class MissingUpdate {
      async create(): Promise<unknown> {
        return {};
      }
      async delete(): Promise<void> {
        return;
      }
    }
    class MissingDelete {
      async create(): Promise<unknown> {
        return {};
      }
      async update(): Promise<void> {
        return;
      }
    }

    const MissingCreateModel = HooksMixin(
      MissingCreate as unknown as abstract new (...args: any[]) => object
    );
    const MissingUpdateModel = HooksMixin(
      MissingUpdate as unknown as abstract new (...args: any[]) => object
    );
    const MissingDeleteModel = HooksMixin(
      MissingDelete as unknown as abstract new (...args: any[]) => object
    );

    await expect(new (MissingCreateModel as any)().create({})).rejects.toThrow(
      "Base 'create' method not found for HooksMixin."
    );
    expect(() => new (MissingUpdateModel as any)().update(1, {})).toThrow(
      "Base 'update' method not found for HooksMixin."
    );
    await expect(new (MissingDeleteModel as any)().delete(1)).rejects.toThrow(
      "Base 'delete' method not found for HooksMixin."
    );
  });
});

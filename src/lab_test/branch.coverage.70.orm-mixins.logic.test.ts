import { BaseModel, SqlModel } from "../core/model/BaseModel.js";
import { CacheAnalytics } from "../core/cache/CacheAnalytics.js";
import { CacheFallbackManager } from "../core/cache/CacheFallbackManager.js";
import { CacheManager } from "../core/cache/CacheManager.js";
import { CacheRegistry } from "../core/cache/CacheRegistry.js";
import { getAdapter } from "../core/connection/ConnectionFactory.js";
import { CastsMixin } from "../core/orm/mixins/CastsMixin.js";
import {
  EagerLoadingMixin,
  type RelationDefinition,
} from "../core/orm/mixins/EagerLoadingMixin.js";
import { MorphRegistry } from "../core/orm/mixins/MorphRegistry.js";
import { MorphableMixin } from "../core/orm/mixins/MorphableMixin.js";
import { PivotHelperMixin } from "../core/orm/mixins/PivotHelperMixin.js";
import { QueryCacheMixin } from "../core/orm/mixins/QueryCacheMixin.js";
import { ScopeMixin } from "../core/orm/mixins/ScopeMixin.js";
import { SoftDeletesMixin } from "../core/orm/mixins/SoftDeletesMixin.js";
import { HookStore } from "../core/orm/mixins/utils/HookStore.js";
import { ModelRegistry } from "../core/orm/mixins/utils/ModelRegistry.js";

jest.mock("../core/connection/ConnectionFactory", () => ({
  getAdapter: jest.fn(),
  getConnection: jest.fn(),
}));

const mockedGetAdapter = getAdapter as jest.MockedFunction<typeof getAdapter>;

abstract class EmptyBase {}

describe("Branch coverage 70% - Phase 4 ORM mixins", () => {
  beforeEach(() => {
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
    jest.spyOn(console, "log").mockImplementation(() => undefined);
    jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(async () => {
    await CacheRegistry.clearAll();
    CacheAnalytics.reset();
    HookStore.clear();
    ModelRegistry.clear();
    MorphRegistry.clear();
    jest.restoreAllMocks();
  });

  describe("QueryCacheMixin", () => {
    class CacheModel extends QueryCacheMixin(
      EmptyBase as unknown as abstract new (...args: any[]) => object
    ) {
      static defaultCacheTTL?: number;
      static cacheTTL?: Record<string, number>;
      static cacheStrategy?: (payload: unknown, group?: string) => number;

      public async runCached<T>(
        payload: unknown,
        fn: () => Promise<T>,
        group = "default"
      ): Promise<T> {
        return await (this as any).runWithCache(payload, fn, group);
      }

      public resolveTtl(payload: unknown, group = "default"): number {
        return (this as any).resolveTTL(payload, group);
      }
    }

    test("returns executeFn directly when cache is disabled and no model defaults exist", async () => {
      const model = new CacheModel();
      const executeFn = jest.fn(async () => "fresh");
      const getSpy = jest.spyOn(CacheManager, "get");

      const result = await model.runCached({ id: 1 }, executeFn);

      expect(result).toBe("fresh");
      expect(executeFn).toHaveBeenCalledTimes(1);
      expect(getSpy).not.toHaveBeenCalled();
    });

    test("serves cache hit when model defaults enable cache", async () => {
      const model = new CacheModel();
      (model.constructor as typeof CacheModel).defaultCacheTTL = 42;

      const executeFn = jest.fn(async () => "fresh");
      jest.spyOn(CacheFallbackManager, "getActiveDriver").mockReturnValue(null);
      jest.spyOn(CacheManager, "get").mockResolvedValue("cached");
      const hitSpy = jest.spyOn(CacheAnalytics, "hit");

      const result = await model.runCached({ id: 7 }, executeFn, "find");

      expect(result).toBe("cached");
      expect(executeFn).not.toHaveBeenCalled();
      expect(hitSpy).toHaveBeenCalled();
    });

    test("handles cache read failure and write failure without breaking execution", async () => {
      const model = new CacheModel();
      (model.constructor as typeof CacheModel).defaultCacheTTL = 30;

      jest.spyOn(CacheFallbackManager, "getActiveDriver").mockReturnValue(null);
      jest.spyOn(CacheManager, "get").mockRejectedValue(new Error("read-fail"));
      jest.spyOn(CacheManager, "set").mockRejectedValue(new Error("write-fail"));
      const missSpy = jest.spyOn(CacheAnalytics, "miss");
      const addKeySpy = jest.spyOn(CacheRegistry, "addKey");
      const executeFn = jest.fn(async () => ({ ok: true }));

      const result = await model.runCached({ page: 1 }, executeFn, "list");

      expect(result).toEqual({ ok: true });
      expect(missSpy).toHaveBeenCalled();
      expect(executeFn).toHaveBeenCalledTimes(1);
      expect(addKeySpy).not.toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining("[Cache] Read failed"),
        expect.any(Error)
      );
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining("[Cache] Write failed"),
        expect.any(Error)
      );
    });

    test("resolveTTL honors enabled instance cache, strategy fallback, and group map", () => {
      const model = new CacheModel();
      const ctor = model.constructor as typeof CacheModel;

      ctor.defaultCacheTTL = 88;
      ctor.cacheTTL = { users: 77 };
      ctor.cacheStrategy = () => {
        throw new Error("strategy-failed");
      };

      const ttlFromFallbacks = model.resolveTtl({ id: 1 }, "users");
      expect(ttlFromFallbacks).toBe(77);
      expect(console.warn).toHaveBeenCalledWith(
        "[QueryCacheMixin] cacheStrategy() failed:",
        expect.any(Error)
      );

      (model as any).cache(15);
      const ttlFromInstance = model.resolveTtl({ id: 1 }, "users");
      expect(ttlFromInstance).toBe(15);
    });

    test("cache invalidation helpers clear model and group registry entries", async () => {
      const model = new CacheModel();
      const clearModelSpy = jest.spyOn(CacheRegistry, "clearModel").mockResolvedValue(undefined);
      const clearGroupSpy = jest.spyOn(CacheRegistry, "clearGroup").mockResolvedValue(undefined);

      await model.invalidateModelCache();
      await model.invalidateCacheGroup("search");

      expect(clearModelSpy).toHaveBeenCalledWith("CacheModel");
      expect(clearGroupSpy).toHaveBeenCalledWith("CacheModel", "search");
    });

    test("strict ungranted models skip cache hook registration", () => {
      ModelRegistry.setStrictMode(true);

      class StrictCacheModel extends QueryCacheMixin(
        EmptyBase as unknown as abstract new (...args: any[]) => object
      ) {}

      new StrictCacheModel();
      const hooks = HookStore.snapshot(StrictCacheModel);

      expect(hooks.created).toHaveLength(0);
      expect(hooks.updated).toHaveLength(0);
      expect(hooks.deleted).toHaveLength(0);
    });
  });

  describe("CastsMixin", () => {
    class CastBase {
      async find(id: number | string): Promise<Record<string, unknown> | null> {
        return {
          id,
          age: "22",
          active: "1",
          meta: '{"role":"admin"}',
        };
      }

      async all(): Promise<Record<string, unknown>[]> {
        return [{ id: 1, age: "9", active: "false" }];
      }

      async create(data: Record<string, unknown>): Promise<Record<string, unknown>> {
        return data;
      }

      async update(_id: number | string, _data: Record<string, unknown>): Promise<void> {
        return;
      }
    }

    class CastModel extends CastsMixin(
      CastBase as unknown as abstract new (...args: any[]) => object
    ) {
      constructor() {
        super();
        (this as any).casts = {
          age: "number",
          active: "boolean",
          meta: "json",
          created_at: "date",
        };
      }

      public castPublic(type: string, value: unknown): unknown {
        return (this as any).castValue(type, value);
      }
    }

    test("casts null/undefined safely and handles json parse fallback", () => {
      const model = new CastModel();
      expect(model.castPublic("number", null)).toBeNull();
      expect(model.castPublic("boolean", undefined)).toBeUndefined();
      expect(model.castPublic("json", "not-json")).toBe("not-json");
      expect(model.castPublic("date", "2026-01-01T00:00:00.000Z")).toBeInstanceOf(Date);
    });

    test("casts find/all/create records according to casts map", async () => {
      const model = new CastModel();

      const found = (await model.find(5)) as any;
      const rows = (await model.all()) as any[];
      const created = (await model.create({
        age: "3",
        active: "true",
        meta: '{"x":1}',
      })) as any;

      expect(found?.age).toBe(22);
      expect(found?.active).toBe(true);
      expect(found?.meta).toEqual({ role: "admin" });
      expect(rows[0].age).toBe(9);
      expect(rows[0].active).toBe(false);
      expect(created.age).toBe(3);
      expect(created.active).toBe(true);
      expect(created.meta).toEqual({ x: 1 });
    });

    test("throws when required base methods are missing in mixin chain", async () => {
      class NoFindBase {}
      class NoFindModel extends CastsMixin(
        NoFindBase as unknown as abstract new (...args: any[]) => object
      ) {}

      const model = new NoFindModel();
      await expect((model as any).find(1)).rejects.toThrow(
        "Base 'find' method not found in CastsMixin chain."
      );
      expect(() => (model as any).update(1, {})).toThrow(
        "Base 'update' method not found in CastsMixin chain."
      );
    });
  });

  describe("EagerLoadingMixin", () => {
    class EagerBase {
      async all(): Promise<Record<string, unknown>[]> {
        return [{ id: 1 }];
      }

      async find(id: number | string): Promise<Record<string, unknown> | null> {
        return id === 1 ? { id: 1 } : null;
      }
    }

    class EagerModel extends EagerLoadingMixin(
      EagerBase as unknown as abstract new (...args: any[]) => object
    ) {
      comments(): RelationDefinition<any> {
        return {
          name: "comments",
          getResults: async () => [{ id: 10 }],
          match: async (records: any[]) => {
            for (const record of records) {
              record.comments = [
                {
                  id: 10,
                  getRelation: (name: string) => {
                    if (name !== "author") return undefined;
                    return {
                      name: "author",
                      getResults: async () => ({ id: 99 }),
                      match: async (relatedRecords: any[]) => {
                        for (const item of relatedRecords) {
                          item.author = { id: 99 };
                        }
                      },
                    };
                  },
                },
              ];
            }
          },
        };
      }
    }

    test("throws for unknown relation and supports direct load()", async () => {
      const model = new EagerModel();

      await expect((model as any).load("missing")).rejects.toThrow(
        "Relation 'missing' is not defined"
      );

      await (model as any).load("comments");
      expect((model as any).comments).toEqual([{ id: 10 }]);
    });

    test("eager-loads top-level and nested relations via all()", async () => {
      const model = (new EagerModel() as any).with("comments.author");
      const rows = (await model.all()) as any[];

      expect(rows).toHaveLength(1);
      expect((rows[0] as any).comments[0].author).toEqual({ id: 99 });
    });

    test("test-mode fallback returns []/null when no base DB methods exist", async () => {
      class NoBaseModel extends EagerLoadingMixin(
        EmptyBase as unknown as abstract new (...args: any[]) => object
      ) {}

      const model = new NoBaseModel();
      await expect((model as any).all()).resolves.toEqual([]);
      await expect((model as any).find(1)).resolves.toBeNull();
    });
  });

  describe("MorphableMixin", () => {
    class MorphModel extends MorphableMixin(
      EmptyBase as unknown as abstract new (...args: any[]) => object
    ) {
      public id = 3;
    }

    test("morphTo returns null when morph type/id fields are absent", async () => {
      const model = new MorphModel() as any;
      await expect(model.morphTo("commentable")).resolves.toBeNull();

      model.commentable_type = "users";
      model.commentable_id = undefined;
      await expect(model.morphTo("commentable")).resolves.toBeNull();
    });

    test("morphTo throws when resolved model lacks find() and succeeds otherwise", async () => {
      class BadResolvedModel {}
      class GoodResolvedModel {
        async find(id: number | string) {
          return { id };
        }
      }

      MorphRegistry.register("bad", BadResolvedModel as any);
      MorphRegistry.register("good", GoodResolvedModel as any);

      const bad = new MorphModel() as any;
      bad.commentable_type = "bad";
      bad.commentable_id = 5;
      await expect(bad.morphTo("commentable")).rejects.toThrow("does not implement find");

      const good = new MorphModel() as any;
      good.commentable_type = "good";
      good.commentable_id = 8;
      await expect(good.morphTo("commentable")).resolves.toEqual({ id: 8 });
    });

    test("morphOne/morphMany fallback to constructor name when getMorphClass is missing", async () => {
      const where = jest.fn().mockReturnThis();
      const first = jest.fn(async () => ({ id: 1 }));
      const get = jest.fn(async () => [{ id: 2 }]);
      const RelatedModel = { query: () => ({ where, first, get }) };

      const model = new MorphModel() as any;
      const one = await model.morphOne(RelatedModel, "commentable");
      const many = await model.morphMany(RelatedModel, "commentable");

      expect(one).toEqual({ id: 1 });
      expect(many).toEqual([{ id: 2 }]);
      expect(where).toHaveBeenCalledWith("commentable_type", "MorphModel");
      expect(where).toHaveBeenCalledWith("commentable_id", 3);
    });
  });

  describe("ScopeMixin", () => {
    class ScopeBase {
      async all(): Promise<Record<string, unknown>[]> {
        return [
          { id: 1, active: true },
          { id: 2, active: false },
        ];
      }

      async find(id: number | string): Promise<Record<string, unknown> | null> {
        if (id === 1) return { id: 1, active: true };
        if (id === 2) return { id: 2, active: false };
        return null;
      }
    }

    class ScopeModel extends ScopeMixin(
      ScopeBase as unknown as abstract new (...args: any[]) => object
    ) {}

    test("applies global scopes and supports removeGlobalScope", async () => {
      (ScopeModel as any).addGlobalScope("activeOnly", (rows: any[]) =>
        rows.filter((row: any) => row.active === true)
      );
      (ScopeModel as any).addGlobalScope("noop", () => undefined);

      const model = new ScopeModel();
      const rows = await model.all();
      expect(rows).toEqual([{ id: 1, active: true }]);

      (ScopeModel as any).removeGlobalScope("activeOnly");
      const relaxed = await model.all();
      expect(relaxed).toHaveLength(2);
    });

    test("find returns null when scoped record is filtered out", async () => {
      (ScopeModel as any).addGlobalScope("activeOnly", (rows: any[]) =>
        rows.filter((row: any) => row.active === true)
      );

      const model = new ScopeModel();
      await expect(model.find(2)).resolves.toBeNull();
      await expect(model.find(1)).resolves.toEqual({ id: 1, active: true });
    });

    test("throws when base methods are missing", async () => {
      class EmptyScopeModel extends ScopeMixin(
        EmptyBase as unknown as abstract new (...args: any[]) => object
      ) {}

      const model = new EmptyScopeModel();
      await expect((model as any).all()).rejects.toThrow(
        "Base 'all' method not found in ScopeMixin chain."
      );
      await expect((model as any).find(1)).rejects.toThrow(
        "Base 'find' method not found in ScopeMixin chain."
      );
    });
  });

  describe("SoftDeletesMixin", () => {
    class SoftBase {
      public rows: any[] = [
        { id: 1, deleted_at: null },
        { id: 2, deleted_at: "2026-03-08T01:00:00.000Z" },
      ];
      public updateSpy: jest.Mock<
        Promise<void>,
        [number | string, Record<string, unknown>, string]
      > = jest.fn(async (_id, _data, _pk) => undefined);
      public deleteSpy: jest.Mock<Promise<void>, [number | string, string]> = jest.fn(
        async (_id, _pk) => undefined
      );

      async find(id: number | string): Promise<any | null> {
        return this.rows.find((row) => row.id === id) ?? null;
      }

      async all(): Promise<any[]> {
        return this.rows;
      }

      async update(id: number | string, data: Record<string, unknown>, pk = "id"): Promise<void> {
        await this.updateSpy(id, data, pk);
      }

      async delete(id: number | string, pk = "id"): Promise<void> {
        await this.deleteSpy(id, pk);
      }
    }

    class SoftModel extends SoftDeletesMixin(
      SoftBase as unknown as abstract new (...args: any[]) => object
    ) {
      static schema = {
        deleted_at: { kind: "column", type: "softDeletes" },
      };
    }

    test("delete/restore/update/forceDelete delegate to base methods with expected payloads", async () => {
      const model = new SoftModel() as any;

      await model.delete(10, "uuid");
      expect(model.updateSpy).toHaveBeenCalledWith(
        10,
        { deleted_at: expect.any(String) },
        "uuid"
      );

      await model.restore(10);
      expect(model.updateSpy).toHaveBeenCalledWith(10, { deleted_at: null }, "id");

      await model.update(10, { title: "x" }, "id");
      expect(model.updateSpy).toHaveBeenCalledWith(10, { title: "x" }, "id");

      await model.forceDelete(10, "uuid");
      expect(model.deleteSpy).toHaveBeenCalledWith(10, "uuid");
    });

    test("all/withTrashed/onlyTrashed/filtering and find deleted behavior", async () => {
      const model = new SoftModel() as any;

      await expect(model.withTrashed()).resolves.toHaveLength(2);
      await expect(model.all()).resolves.toEqual([{ id: 1, deleted_at: null }]);
      await expect(model.onlyTrashed()).resolves.toEqual([
        { id: 2, deleted_at: "2026-03-08T01:00:00.000Z" },
      ]);

      await expect(model.find(1)).resolves.toEqual({ id: 1, deleted_at: null });
      await expect(model.find(2)).resolves.toBeNull();
      await expect(model.find(99)).resolves.toBeNull();
    });

    test("throws when required base methods are missing", async () => {
      class EmptySoftModel extends SoftDeletesMixin(
        EmptyBase as unknown as abstract new (...args: any[]) => object
      ) {}

      const model = new EmptySoftModel() as any;
      await expect(model.delete(1)).rejects.toThrow(
        "Base 'delete' method not found for SoftDeletesMixin."
      );
      await expect(model.all()).rejects.toThrow(
        "Base 'all' method not found for SoftDeletesMixin."
      );
      await expect(model.find(1)).rejects.toThrow(
        "Base 'find' method not found for SoftDeletesMixin."
      );
      await expect(model.forceDelete(1)).rejects.toThrow(
        "Base 'delete' method not found for SoftDeletesMixin."
      );
    });

    test("non-soft-delete schemas fall back to hard delete and skip deleted_at filtering", async () => {
      class PlainDeleteModel extends SoftDeletesMixin(
        SoftBase as unknown as abstract new (...args: any[]) => object
      ) {
        static schema = {
          id: { kind: "column", type: "increments" },
          name: { kind: "column", type: "string" },
        };
      }

      const model = new PlainDeleteModel() as any;

      await model.delete(10, "uuid");
      expect(model.deleteSpy).toHaveBeenCalledWith(10, "uuid");
      expect(model.updateSpy).not.toHaveBeenCalled();

      await expect(model.all()).resolves.toHaveLength(2);
      await expect(model.find(2)).resolves.toEqual({
        id: 2,
        deleted_at: "2026-03-08T01:00:00.000Z",
      });
      await expect(model.onlyTrashed()).resolves.toEqual([]);
    });
  });

  describe("PivotHelperMixin", () => {
    class PivotBase {
      public connectionName = "mysql";
      public tableName = "users";
      public db: any = null;
      async getDB(): Promise<unknown> {
        return this.db;
      }
    }

    class PivotModel extends PivotHelperMixin(
      PivotBase as unknown as abstract new (...args: any[]) => object
    ) {}

    test("sql attach/detach branches execute expected SQL and skip empty attach", async () => {
      const execute = jest.fn(async () => undefined);
      const model = new PivotModel() as any;
      model.connectionName = "mysql";
      model.db = {
        execute,
        wrapId: (id: string) => `\`${id}\``,
        placeholder: (index: number) => `?${index}`,
        placeholders: (count: number) => Array.from({ length: count }, () => "?").join(", "),
      };

      await model.attach("post_user", "user_id", "post_id", 7, []);
      expect(execute).not.toHaveBeenCalled();

      await model.attach("post_user", "user_id", "post_id", 7, [11, 12]);
      expect(execute).toHaveBeenCalledTimes(2);

      await model.detach("post_user", "user_id", 7);
      expect(execute).toHaveBeenCalledWith(
        "DELETE FROM `post_user` WHERE `user_id` = ?1",
        [7]
      );
    });

    test("mongo attach/detach branches handle missing collection and success paths", async () => {
      const model = new PivotModel() as any;
      model.connectionName = "mongo";
      model.db = {};
      await expect(model.attach("pivot", "user_id", "post_id", 1, [2])).rejects.toThrow(
        "MongoDB driver not available for pivot operations."
      );
      await expect(model.detach("pivot", "user_id", 1)).rejects.toThrow(
        "MongoDB driver not available for pivot operations."
      );

      const insertMany = jest.fn(async () => undefined);
      const deleteMany = jest.fn(async () => undefined);
      const collection = jest.fn(() => ({ insertMany, deleteMany }));
      model.db = {
        collection,
      };

      await model.attach("pivot", "user_id", "post_id", 1, []);
      expect(collection).not.toHaveBeenCalled();

      await model.attach("pivot", "user_id", "post_id", 1, [2, 3]);
      expect(insertMany).toHaveBeenCalledWith([
        { user_id: 1, post_id: 2 },
        { user_id: 1, post_id: 3 },
      ]);

      await model.detach("pivot", "user_id", 1);
      expect(deleteMany).toHaveBeenCalledWith({ user_id: 1 });
    });

    test("sync branch and unsupported driver branch", async () => {
      const model = new PivotModel() as any;
      model.connectionName = "custom_unknown";
      model.db = {};
      await expect(model.attach("pivot", "user_id", "post_id", 1, [2])).rejects.toThrow(
        "Unsupported connection type"
      );
      await expect(model.detach("pivot", "user_id", 1)).rejects.toThrow(
        "Unsupported connection type"
      );

      const detachSpy = jest.spyOn(model, "detach").mockResolvedValue(undefined);
      const attachSpy = jest.spyOn(model, "attach").mockResolvedValue(undefined);

      await model.sync("pivot", "user_id", "post_id", 1, []);
      expect(detachSpy).toHaveBeenCalledTimes(1);
      expect(attachSpy).not.toHaveBeenCalled();

      await model.sync("pivot", "user_id", "post_id", 1, [9]);
      expect(detachSpy).toHaveBeenCalledTimes(2);
      expect(attachSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("BaseModel / SqlModel", () => {
    class UserModel extends BaseModel {
      constructor() {
        super("users", "mysql");
      }
    }

    class AliasUserModel extends BaseModel {
      static morphAlias = "users_alias";
      constructor() {
        super("users", "mysql");
      }
    }

    test("instance/static getMorphClass return alias or fallback model name", () => {
      MorphRegistry.register("users", UserModel as any);
      const user = new UserModel();

      expect(user.getMorphClass()).toBe("users");
      expect(UserModel.getMorphClass()).toBe("users");
      expect(AliasUserModel.getMorphClass()).toBe("users_alias");

      MorphRegistry.clear();
      expect(user.getMorphClass()).toBe("UserModel");
      expect(UserModel.getMorphClass()).toBe("UserModel");
    });

    test("SqlModel blocks mongo connections and getDB delegates to getAdapter", async () => {
      class BadSqlModel extends SqlModel {
        constructor() {
          super("items", "mongo" as any);
        }
      }

      expect(() => new BadSqlModel()).toThrow("SqlModel cannot use the mongo connection.");

      class GoodSqlModel extends SqlModel {
        constructor() {
          super("items", "mysql");
        }
      }

      const fakeAdapter = { query: jest.fn() } as any;
      mockedGetAdapter.mockResolvedValue(fakeAdapter);

      const model = new GoodSqlModel();
      await expect(model.getDB()).resolves.toBe(fakeAdapter);
      expect(mockedGetAdapter).toHaveBeenCalledWith("mysql");
    });
  });
});

import { CacheAnalytics } from "../core/cache/CacheAnalytics";
import { CacheFallbackManager } from "../core/cache/CacheFallbackManager";
import { CacheManager } from "../core/cache/CacheManager";
import { CacheRegistry } from "../core/cache/CacheRegistry";
import { Relation } from "../core/orm/Relation";
import { CastsMixin } from "../core/orm/mixins/CastsMixin";
import {
  EagerLoadingMixin,
  type RelationDefinition,
} from "../core/orm/mixins/EagerLoadingMixin";
import { QueryCacheMixin } from "../core/orm/mixins/QueryCacheMixin";
import { HookStore } from "../core/orm/mixins/utils/HookStore";
import { ModelRegistry } from "../core/orm/mixins/utils/ModelRegistry";

abstract class EmptyBase {}

class ProbeRelation extends Relation<any> {
  async getResults(): Promise<unknown> {
    return null;
  }

  async match(): Promise<void> {
    return;
  }

  exposeName(): string | undefined {
    return (this as any).name;
  }
}

class CacheModelP6 extends QueryCacheMixin(
  EmptyBase as unknown as abstract new (...args: any[]) => object
) {
  static defaultCacheTTL?: number;
  static cacheTTL?: Record<string, number>;
  static cacheStrategy?: (payload: unknown, group?: string) => number;

  runCached<T>(payload: unknown, execute: () => Promise<T>, group = "default"): Promise<T> {
    return (this as any).runWithCache(payload, execute, group);
  }

  resolveTtl(payload: unknown, group = "default"): number {
    return (this as any).resolveTTL(payload, group);
  }

  cacheApi(): unknown {
    return (this as any).cacheAPI;
  }

  disableCache(): this {
    return (this as any).withoutCache();
  }
}

describe("Branch coverage 100% - phase 6 ORM branch closures", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jest.spyOn(console, "log").mockImplementation(() => undefined);
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
    jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(async () => {
    process.env.NODE_ENV = originalNodeEnv;
    HookStore.clear();
    ModelRegistry.clear();
    CacheAnalytics.reset();
    await CacheRegistry.clearAll().catch(() => undefined);
    jest.restoreAllMocks();
  });

  test("Relation auto-name detection covers stack parsing branches", () => {
    const withMatch = jest
      .spyOn(global as any, "Error")
      .mockImplementation(() => ({ stack: "Error\n at Object.posts (x.js:1:1)" }) as any);
    const relWithMatch = new ProbeRelation(null, "fk", "id");
    expect(relWithMatch.exposeName()).toBe("posts");
    withMatch.mockRestore();

    const noCaller = jest
      .spyOn(global as any, "Error")
      .mockImplementation(() => ({ stack: "Error\n at no_caller_line" }) as any);
    const relWithoutCaller = new ProbeRelation(null, "fk", "id");
    expect(relWithoutCaller.exposeName()).toBeUndefined();
    noCaller.mockRestore();
  });

  test("QueryCacheMixin covers constructor hook failure, hook callback clear, and withoutCache path", async () => {
    const addSpy = jest.spyOn(HookStore, "add").mockImplementation(() => {
      throw new Error("hook-add-failed");
    });
    new CacheModelP6();
    expect(console.warn).toHaveBeenCalledWith(
      "[QueryCacheMixin] Failed to register cache invalidation hooks:",
      expect.any(Error)
    );
    addSpy.mockRestore();

    const model = new CacheModelP6();
    const clearSpy = jest.spyOn(CacheRegistry, "clearModel").mockResolvedValue(undefined);
    const snapshot = HookStore.snapshot(CacheModelP6 as any);
    expect(snapshot.created).toHaveLength(1);
    await snapshot.created[0]({} as any);
    expect(clearSpy).toHaveBeenCalledWith("CacheModelP6");

    expect(model.disableCache()).toBe(model);
  });

  test("QueryCacheMixin covers cacheAPI catch, dynamic TTL branch, default TTL branch, miss branch, and addKey branch", async () => {
    const model = new CacheModelP6();

    jest.spyOn(CacheFallbackManager, "getActiveDriver").mockImplementation(() => {
      throw new Error("fallback-driver-failed");
    });
    expect(model.cacheApi()).toBe(CacheManager);

    (model.constructor as typeof CacheModelP6).cacheStrategy = () => 11;
    expect(model.resolveTtl({ id: 1 }, "users")).toBe(11);

    (model.constructor as typeof CacheModelP6).cacheStrategy = () => -1;
    delete (model.constructor as typeof CacheModelP6).cacheTTL;
    delete (model.constructor as typeof CacheModelP6).defaultCacheTTL;
    expect(model.resolveTtl({ id: 2 }, "none")).toBe(60);

    jest.spyOn(CacheFallbackManager, "getActiveDriver").mockReturnValue(null);
    jest.spyOn(CacheManager, "get").mockResolvedValue(null);
    jest.spyOn(CacheManager, "set").mockResolvedValue(undefined);
    const addKeySpy = jest.spyOn(CacheRegistry, "addKey").mockImplementation(() => undefined);
    const missSpy = jest.spyOn(CacheAnalytics, "miss");

    (model as any).cache(10);
    const value = await model.runCached({ page: 1 }, async () => "fresh", "list");
    expect(value).toBe("fresh");
    expect(missSpy).toHaveBeenCalled();
    expect(addKeySpy).toHaveBeenCalled();
  });

  test("CastsMixin covers boolean-number branch, default case, missing base methods, uncastData, and update delegation", async () => {
    class CastBase {
      public updateSpy = jest.fn<
        Promise<void>,
        [number | string, Record<string, unknown>, string]
      >(async () => undefined);

      async find(): Promise<Record<string, unknown> | null> {
        return {};
      }

      async all(): Promise<Record<string, unknown>[]> {
        return [{}];
      }

      async create(data: Record<string, unknown>): Promise<Record<string, unknown>> {
        return data;
      }

      async update(id: number | string, data: Record<string, unknown>, pk = "id"): Promise<void> {
        await this.updateSpy(id, data, pk);
      }
    }

    class CastModel extends CastsMixin(
      CastBase as unknown as abstract new (...args: any[]) => object
    ) {
      castPublic(type: string, value: unknown): unknown {
        return (this as any).castValue(type, value);
      }

      uncastPublic(data: Record<string, unknown>): Record<string, unknown> {
        return (this as any).uncastData(data);
      }
    }

    const model = new CastModel() as any;
    expect(model.castPublic("boolean", 1)).toBe(true);
    expect(model.castPublic("boolean", 0)).toBe(false);
    expect(model.castPublic("string", "x")).toBe("x");
    expect(model.uncastPublic({ x: 1 })).toEqual({ x: 1 });

    await model.update(5, { a: 1 }, "uuid");
    expect(model.updateSpy).toHaveBeenCalledWith(5, { a: 1 }, "uuid");

    class NoAllBase {
      async find(): Promise<Record<string, unknown> | null> {
        return {};
      }
      async create(): Promise<Record<string, unknown>> {
        return {};
      }
      async update(): Promise<void> {
        return;
      }
    }

    class NoCreateBase {
      async find(): Promise<Record<string, unknown> | null> {
        return {};
      }
      async all(): Promise<Record<string, unknown>[]> {
        return [];
      }
      async update(): Promise<void> {
        return;
      }
    }

    class NoAllModel extends CastsMixin(
      NoAllBase as unknown as abstract new (...args: any[]) => object
    ) {}
    class NoCreateModel extends CastsMixin(
      NoCreateBase as unknown as abstract new (...args: any[]) => object
    ) {}

    await expect((new NoAllModel() as any).all()).rejects.toThrow(
      "Base 'all' method not found in CastsMixin chain."
    );
    await expect((new NoCreateModel() as any).create({})).rejects.toThrow(
      "Base 'create' method not found in CastsMixin chain."
    );
  });

  test("EagerLoadingMixin covers top-level match branch, non-test missing-base branch, find eager branch, and getRelation helper", async () => {
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
              record.comments = [{ id: 10 }];
            }
          },
        };
      }
    }

    const eager = new (EagerModel as any)().with("comments");
    const rows = await eager.all();
    expect((rows[0] as any).comments).toEqual([{ id: 10 }]);

    const found = await eager.find(1);
    expect((found as any).comments).toEqual([{ id: 10 }]);
    expect(typeof eager.getRelation("comments")).toBe("function");

    process.env.NODE_ENV = "production";
    class NoBaseModel extends EagerLoadingMixin(
      EmptyBase as unknown as abstract new (...args: any[]) => object
    ) {}
    const noBase = new (NoBaseModel as any)();
    await expect(noBase.all()).rejects.toThrow(
      "Base 'all' method not found in EagerLoadingMixin chain."
    );
    await expect(noBase.find(1)).rejects.toThrow(
      "Base 'find' method not found in EagerLoadingMixin chain."
    );
  });
});

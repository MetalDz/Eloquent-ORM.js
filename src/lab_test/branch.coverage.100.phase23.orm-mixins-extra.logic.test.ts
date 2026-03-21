import { EagerLoadingMixin } from "../core/orm/mixins/EagerLoadingMixin";
import { SoftDeletesMixin } from "../core/orm/mixins/SoftDeletesMixin";

abstract class EmptyBase {}

describe("Branch coverage 100% - phase 23 ORM mixin deep edge closure", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    jest.restoreAllMocks();
  });

  test("EagerLoadingMixin covers load() relation-selection branches and nested fallback branches", async () => {
    class EagerBase {
      async all(): Promise<Array<Record<string, unknown>>> {
        return [{ id: 1 }, { id: 2 }];
      }

      async find(id: number | string): Promise<Record<string, unknown> | null> {
        return id ? { id } : null;
      }
    }

    class EagerModel extends EagerLoadingMixin(
      EagerBase as unknown as abstract new (...args: any[]) => object
    ) {
      profile() {
        return {
          getResults: async () => ({ id: 10 }),
          match: async () => undefined,
        };
      }

      rootNoGetter() {
        return {
          match: async (records: Array<Record<string, unknown>>) => {
            for (const row of records) {
              row.relation = { id: "child-without-getRelation" };
            }
          },
          getResults: async () => null,
        };
      }

      rootWithMissingNext() {
        return {
          match: async (records: Array<Record<string, unknown>>) => {
            for (const row of records) {
              row.relation = {
                getRelation: () => undefined,
              };
            }
          },
          getResults: async () => null,
        };
      }

      rootEmpty() {
        return {
          match: async (records: Array<Record<string, unknown>>) => {
            for (const row of records) {
              row.relation = 0;
            }
          },
          getResults: async () => null,
        };
      }
    }

    const modelFromWith = new (EagerModel as any)().with("profile");
    await modelFromWith.load();
    expect(modelFromWith.profile).toEqual({ id: 10 });

    const modelFromArgs = new (EagerModel as any)();
    await modelFromArgs.load("profile");
    expect(modelFromArgs.profile).toEqual({ id: 10 });

    const nestedNoGetter = new (EagerModel as any)().with("rootNoGetter.child");
    await expect(nestedNoGetter.all()).resolves.toHaveLength(2);

    const nestedMissingNext = new (EagerModel as any)().with(
      "rootWithMissingNext.child"
    );
    await expect(nestedMissingNext.all()).resolves.toHaveLength(2);

    const nestedEmpty = new (EagerModel as any)().with("rootEmpty.child");
    await expect(nestedEmpty.all()).resolves.toHaveLength(2);
  });

  test("EagerLoadingMixin covers missing relation throw and test-mode fallback for both all/find with visited guard", async () => {
    class EagerBase {
      async all(): Promise<Array<Record<string, unknown>>> {
        return [];
      }
      async find(): Promise<Record<string, unknown> | null> {
        return null;
      }
    }

    class EagerModel extends EagerLoadingMixin(
      EagerBase as unknown as abstract new (...args: any[]) => object
    ) {}

    const model = new (EagerModel as any)();
    await expect(model.load("missing")).rejects.toThrow(
      "Relation 'missing' is not defined"
    );

    process.env.NODE_ENV = "test";
    const hasSpy = jest
      .spyOn(WeakSet.prototype, "has")
      .mockReturnValue(true as any);

    class NoBaseEager extends EagerLoadingMixin(
      EmptyBase as unknown as abstract new (...args: any[]) => object
    ) {}

    const noBase = new (NoBaseEager as any)();
    await expect(noBase.all()).resolves.toEqual([]);
    await expect(noBase.find(123)).resolves.toBeNull();
    expect((noBase as any).getBaseMethod("update")).toBeNull();

    hasSpy.mockRestore();
  });

  test("SoftDeletesMixin covers restore/withTrashed/onlyTrashed/update missing-base branches", async () => {
    class MissingBaseSoftModel extends SoftDeletesMixin(
      EmptyBase as unknown as abstract new (...args: any[]) => object
    ) {}

    const model = new (MissingBaseSoftModel as any)();
    await expect(model.restore(1)).rejects.toThrow(
      "Base 'update' method not found for SoftDeletesMixin."
    );
    await expect(model.withTrashed()).rejects.toThrow(
      "Base 'all' method not found for SoftDeletesMixin."
    );
    await expect(model.onlyTrashed()).rejects.toThrow(
      "Base 'all' method not found for SoftDeletesMixin."
    );
    expect(() => model.update(1, { name: "x" })).toThrow(
      "Base 'update' method not found for SoftDeletesMixin."
    );
  });
});

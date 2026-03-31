import { dbConfig } from "../config/database.js";
import { createAdapter } from "../core/connection/DriverAdapter.js";
import { MorphableMixin } from "../core/orm/mixins/MorphableMixin.js";
import { PivotHelperMixin } from "../core/orm/mixins/PivotHelperMixin.js";
import { ScopeMixin } from "../core/orm/mixins/ScopeMixin.js";
import { ModelRegistry } from "../core/orm/mixins/utils/ModelRegistry.js";

describe("Branch coverage 100% - phase 36 orm mixins and adapter edge branches", () => {
  afterEach(() => {
    ModelRegistry.clear();
    jest.restoreAllMocks();
  });

  test("MorphableMixin morphOne/morphMany use getMorphClass() when provided", async () => {
    class EmptyBase {}
    class MorphModel extends MorphableMixin(EmptyBase) {
      id = 77;
      getMorphClass(): string {
        return "CustomMorphAlias";
      }
    }

    const where = jest.fn().mockReturnThis();
    const first = jest.fn(async () => ({ id: 1 }));
    const get = jest.fn(async () => [{ id: 1 }]);
    const RelatedModel = {
      query: () => ({ where, first, get }),
    };

    const model = new MorphModel() as unknown as {
      morphOne(
        related: { query(): { where(field: string, value: unknown): any; first(): Promise<unknown> } },
        relation: string
      ): Promise<unknown>;
      morphMany(
        related: { query(): { where(field: string, value: unknown): any; get(): Promise<unknown[]> } },
        relation: string
      ): Promise<unknown[]>;
    };

    await model.morphOne(RelatedModel as never, "commentable");
    await model.morphMany(RelatedModel as never, "commentable");

    expect(where).toHaveBeenNthCalledWith(1, "commentable_type", "CustomMorphAlias");
    expect(where).toHaveBeenNthCalledWith(2, "commentable_id", 77);
    expect(where).toHaveBeenNthCalledWith(3, "commentable_type", "CustomMorphAlias");
    expect(where).toHaveBeenNthCalledWith(4, "commentable_id", 77);
  });

  test("ModelRegistry uses AnonymousModel fallback and default lifecycle context", () => {
    ModelRegistry.clear();
    ModelRegistry.setStrictMode(true);

    const anonymousCtor = function () {} as unknown as Function;
    Object.defineProperty(anonymousCtor, "name", {
      value: "",
      configurable: true,
    });

    expect(() => ModelRegistry.assertGranted(anonymousCtor)).toThrow("AnonymousModel");
    expect(() => ModelRegistry.assertGranted(anonymousCtor, "registration")).toThrow(
      "Hook registration denied"
    );
  });

  test("ModelRegistry.ensureGranted uses default lifecycle context parameter", () => {
    ModelRegistry.clear();
    ModelRegistry.setStrictMode(true);

    class UnregisteredModel {}

    expect(() => ModelRegistry.ensureGranted(UnregisteredModel)).toThrow(
      "Model not granted in ModelRegistry"
    );
  });

  test("PivotHelperMixin covers sqlite attach/detach switch branches", async () => {
    const originalSqliteTest = (dbConfig.connections as Record<string, unknown>).sqlite_test;
    (dbConfig.connections as Record<string, unknown>).sqlite_test = { driver: "sqlite" };

    const execute = jest.fn<Promise<void>, [string, unknown[]]>(async () => undefined);
    const adapter = {
      wrapId: (id: string) => id,
      placeholders: (count: number) => Array.from({ length: count }, () => "?").join(", "),
      placeholder: () => "?",
      execute,
    };

    class EmptyBase {}
    class PivotModel extends PivotHelperMixin(EmptyBase) {
      connectionName = "sqlite_test";
      tableName = "users";
      async getDB(): Promise<unknown> {
        return adapter;
      }
    }

    try {
      const model = new PivotModel() as unknown as {
        attach(
          pivotTable: string,
          foreignKey: string,
          relatedKey: string,
          id: string | number,
          relatedIds: Array<string | number>
        ): Promise<void>;
        detach(
          pivotTable: string,
          foreignKey: string,
          id: string | number
        ): Promise<void>;
      };
      await model.attach("user_roles", "user_id", "role_id", 1, [2]);
      await model.detach("user_roles", "user_id", 1);

      expect(execute).toHaveBeenCalledTimes(2);
      expect(execute.mock.calls[0]?.[0]).toContain("INSERT INTO user_roles");
      expect(execute.mock.calls[1]?.[0]).toContain("DELETE FROM user_roles");
    } finally {
      if (originalSqliteTest) {
        (dbConfig.connections as Record<string, unknown>).sqlite_test = originalSqliteTest;
      } else {
        delete (dbConfig.connections as Record<string, unknown>).sqlite_test;
      }
    }
  });

  test("ScopeMixin handles non-function scopes and null find result branches", async () => {
    class BaseModel {
      async all(): Promise<Array<Record<string, unknown>>> {
        return [{ id: 1 }];
      }
      async find(): Promise<Record<string, unknown> | null> {
        return null;
      }
    }

    const ScopedBase = ScopeMixin(BaseModel as unknown as abstract new (...args: any[]) => object);
    class ScopedModel extends ScopedBase {}

    (ScopedModel as unknown as { globalScopes: Record<string, unknown> }).globalScopes = {
      bad: "not-a-function",
      keep: (rows: Array<Record<string, unknown>>) => rows,
    };

    const model = new ScopedModel();
    await expect(model.all()).resolves.toEqual([{ id: 1 }]);
    await expect(model.find(1)).resolves.toBeNull();
  });

  test("DriverAdapter pg insert covers default params branch", async () => {
    const query = jest.fn(async () => ({ rows: [{ id: 99, name: "ok" }] }));
    const adapter = createAdapter("pg_test", { query } as never);

    await expect(adapter.insert("INSERT INTO users(name) VALUES('ok')")).resolves.toEqual({
      id: 99,
      row: { id: 99, name: "ok" },
    });
    expect(query).toHaveBeenCalledWith(
      "INSERT INTO users(name) VALUES('ok') RETURNING *",
      []
    );
  });
});

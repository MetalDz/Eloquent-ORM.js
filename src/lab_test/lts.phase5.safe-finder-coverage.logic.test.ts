import fs from "fs";
import path from "path";
import type { DriverAdapter } from "../core/connection/DriverAdapter.js";
import { SafeFinderQuery, type SafeFinderModelInstance } from "../core/model/SafeFinder.js";

function makeSqlAdapter() {
  return {
    query: jest.fn(async () => []),
    queryOne: jest.fn(async () => null),
    placeholder: (index: number) => `?${index}`,
    wrapId: (id: string) => `\`${id}\``,
  } as DriverAdapter & {
    query: jest.Mock;
    queryOne: jest.Mock;
  };
}

type TestModel = SafeFinderModelInstance & Record<string, unknown>;

function createTestModel(
  adapterOrDb: unknown,
  overrides: Partial<TestModel> = {},
): TestModel {
  const model: TestModel = {
    tableName: "users",
    connectionName: "sqlite_test",
    async getDB() {
      return adapterOrDb;
    },
    useTransaction() {
      return model;
    },
    getTransactionContext() {
      return undefined;
    },
    async save() {
      return undefined;
    },
    async create() {
      return null;
    },
    async delete() {
      return undefined;
    },
    async find() {
      return null;
    },
    where: jest.fn(() => {
      throw new Error("where() stub should not be called directly in this test fixture.");
    }) as unknown as TestModel["where"],
    with: jest.fn(() => {
      throw new Error("with() stub should not be called directly in this test fixture.");
    }) as unknown as TestModel["with"],
    active: jest.fn(() => {
      throw new Error("active() stub should not be called directly in this test fixture.");
    }) as unknown as TestModel["active"],
    inactive: jest.fn(() => {
      throw new Error("inactive() stub should not be called directly in this test fixture.");
    }) as unknown as TestModel["inactive"],
    published: jest.fn(() => {
      throw new Error("published() stub should not be called directly in this test fixture.");
    }) as unknown as TestModel["published"],
    orderBy: jest.fn(() => {
      throw new Error("orderBy() stub should not be called directly in this test fixture.");
    }) as unknown as TestModel["orderBy"],
    limit: jest.fn(() => {
      throw new Error("limit() stub should not be called directly in this test fixture.");
    }) as unknown as TestModel["limit"],
    async get() {
      return [];
    },
    async first() {
      return null;
    },
    findBy: jest.fn(() => {
      throw new Error("findBy() stub should not be called directly in this test fixture.");
    }) as unknown as TestModel["findBy"],
    async findOneBy() {
      return null;
    },
    async findAllBy() {
      return [];
    },
    async existsBy() {
      return false;
    },
    ...overrides,
  };

  return model;
}

describe("LTS phase 5 SafeFinder coverage", () => {
  test("plan tracks the dedicated SafeFinder coverage slice", () => {
    const planPath = path.resolve(
      process.cwd(),
      "validation tasks/LTS-Phase5-SafeFinder-Coverage-Plan.md",
    );
    const content = fs.readFileSync(planPath, "utf8");

    expect(content).toContain("# LTS Phase 5 SafeFinder Coverage Plan");
    expect(content).toContain("Status: COMPLETED");
    expect(content).toContain("src/core/model/SafeFinder.ts");
    expect(content).toContain("src/lab_test/lts.phase5.safe-finder-coverage.logic.test.ts");
  });

  test("status-column fallback scopes execute the status branch for active, inactive, and published", async () => {
    const adapter = makeSqlAdapter();
    const model = createTestModel(adapter);
    const modelClass = {
      name: "StatusFallbackModel",
      schema: {
        id: { kind: "column" },
        status: { kind: "column" },
      },
      hydrateRow: (row: Record<string, unknown> | null) => row as TestModel | null,
      hydrateMany: (rows: Record<string, unknown>[]) => rows as TestModel[],
    };

    await new SafeFinderQuery(model, modelClass as any).active().get();
    await new SafeFinderQuery(model, modelClass as any).inactive().get();
    await new SafeFinderQuery(model, modelClass as any).published().get();

    expect(adapter.query).toHaveBeenNthCalledWith(
      1,
      "SELECT * FROM `users` WHERE `status` = ?1",
      ["active"],
    );
    expect(adapter.query).toHaveBeenNthCalledWith(
      2,
      "SELECT * FROM `users` WHERE `status` = ?1",
      ["inactive"],
    );
    expect(adapter.query).toHaveBeenNthCalledWith(
      3,
      "SELECT * FROM `users` WHERE `status` = ?1",
      ["published"],
    );
  });

  test("boolean-column fallback scopes execute the active/published branches", async () => {
    const adapter = makeSqlAdapter();
    const model = createTestModel(adapter);
    const modelClass = {
      name: "BooleanFallbackModel",
      schema: {
        id: { kind: "column" },
        active: { kind: "column" },
        published: { kind: "column" },
      },
      hydrateRow: (row: Record<string, unknown> | null) => row as TestModel | null,
      hydrateMany: (rows: Record<string, unknown>[]) => rows as TestModel[],
    };

    await new SafeFinderQuery(model, modelClass as any).active().get();
    await new SafeFinderQuery(model, modelClass as any).inactive().get();
    await new SafeFinderQuery(model, modelClass as any).published().get();

    expect(adapter.query).toHaveBeenNthCalledWith(
      1,
      "SELECT * FROM `users` WHERE `active` = ?1",
      [true],
    );
    expect(adapter.query).toHaveBeenNthCalledWith(
      2,
      "SELECT * FROM `users` WHERE `active` = ?1",
      [false],
    );
    expect(adapter.query).toHaveBeenNthCalledWith(
      3,
      "SELECT * FROM `users` WHERE `published` = ?1",
      [true],
    );
  });

  test("scope functions that return void still keep the safe finder chain alive", async () => {
    const adapter = makeSqlAdapter();
    const model = createTestModel(adapter);
    const modelClass = {
      name: "VoidScopeModel",
      schema: {
        id: { kind: "column" },
        status: { kind: "column" },
      },
      scopeActive(query: SafeFinderQuery<TestModel>) {
        query.where("status", "active");
      },
      hydrateRow: (row: Record<string, unknown> | null) => row as TestModel | null,
      hydrateMany: (rows: Record<string, unknown>[]) => rows as TestModel[],
    };

    await new SafeFinderQuery(model, modelClass as any).active().get();

    expect(adapter.query).toHaveBeenCalledWith(
      "SELECT * FROM `users` WHERE `status` = ?1",
      ["active"],
    );
  });

  test("unsupported drivers reject both get() and first()", async () => {
    const model = createTestModel(
      {},
      {
        tableName: "users",
        connectionName: "mystery_driver",
      },
    );
    const modelClass = {
      name: "UnsupportedDriverModel",
      schema: {
        id: { kind: "column" },
      },
      hydrateRow: (row: Record<string, unknown> | null) => row as TestModel | null,
      hydrateMany: (rows: Record<string, unknown>[]) => rows as TestModel[],
    };

    await expect(new SafeFinderQuery(model, modelClass as any).get()).rejects.toThrow(
      "Unsupported driver: mystery_driver",
    );
    await expect(new SafeFinderQuery(model, modelClass as any).first()).rejects.toThrow(
      "Unsupported driver: mystery_driver",
    );
  });

  test("missing schema and missing eager loader are rejected explicitly", async () => {
    const adapter = makeSqlAdapter();
    adapter.query.mockResolvedValue([{ id: 1 }]);

    const noSchemaModel = createTestModel(adapter);
    const noSchemaClass = {
      name: "NoSchemaModel",
      hydrateRow: (row: Record<string, unknown> | null) => row as TestModel | null,
      hydrateMany: (rows: Record<string, unknown>[]) => rows as TestModel[],
    };

    expect(() => new SafeFinderQuery(noSchemaModel, noSchemaClass as any).where("id", 1)).toThrow(
      "NoSchemaModel must define a schema to use the safe finder API.",
    );

    const noEagerModel = createTestModel(adapter, {
      posts() {
        return {};
      },
    });
    const noEagerClass = {
      name: "NoEagerSupportModel",
      schema: {
        id: { kind: "column" },
      },
      hydrateRow: (row: Record<string, unknown> | null) => row as TestModel | null,
      hydrateMany: (rows: Record<string, unknown>[]) => rows as TestModel[],
    };

    await expect(
      new SafeFinderQuery(noEagerModel, noEagerClass as any).with("posts").get(),
    ).rejects.toThrow("NoEagerSupportModel does not support eager loading on the safe finder path.");
  });

  test("SQL first() covers default ascending sort plus hydrate-null and empty eager-load fallbacks", async () => {
    const adapter = makeSqlAdapter();
    adapter.queryOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 9, created_at: "2026-03-15T00:00:00Z" });

    const hydratedNullModel = createTestModel(adapter);
    const hydratedNullClass = {
      name: "HydratedNullModel",
      schema: {
        id: { kind: "column" },
        created_at: { kind: "column" },
      },
      hydrateRow: () => null,
      hydrateMany: (rows: Record<string, unknown>[]) => rows as TestModel[],
    };

    await expect(
      new SafeFinderQuery(hydratedNullModel, hydratedNullClass as any).first(),
    ).resolves.toBeNull();

    const emptyEagerModel = createTestModel(adapter, {
      posts() {
        return {};
      },
      async eagerLoadRelations() {
        return [];
      },
    });
    const emptyEagerClass = {
      name: "EmptyEagerSqlFirstModel",
      schema: {
        id: { kind: "column" },
        created_at: { kind: "column" },
      },
      hydrateRow: (row: Record<string, unknown> | null) => row as TestModel | null,
      hydrateMany: (rows: Record<string, unknown>[]) => rows as TestModel[],
    };

    await expect(
      new SafeFinderQuery(emptyEagerModel, emptyEagerClass as any)
        .with("posts")
        .orderBy("created_at")
        .first(),
    ).resolves.toBeNull();

    expect(adapter.queryOne).toHaveBeenNthCalledWith(
      2,
      "SELECT * FROM `users` ORDER BY `created_at` ASC LIMIT 1",
      [],
    );
  });

  test("mongo get() covers ascending sort on the eager-loading path", async () => {
    const toArray = jest.fn(async () => [{ id: "geo-2", created_at: "2026-03-15T01:00:00Z" }]);
    type Cursor = {
      sort: jest.Mock;
      limit: jest.Mock;
      toArray: jest.Mock;
    };
    const cursor = {} as Cursor;
    const limit = jest.fn(() => cursor);
    const sort = jest.fn(() => cursor);
    cursor.sort = sort;
    cursor.limit = limit;
    cursor.toArray = toArray;
    const collection = { find: jest.fn(() => cursor) };
    const db = { collection: jest.fn(() => collection) };

    const model = createTestModel(db, {
      tableName: "geo_locations",
      connectionName: "mongo_test",
    });
    const modelClass = {
      name: "MongoSortedGetModel",
      schema: {
        id: { kind: "column" },
        created_at: { kind: "column" },
      },
      hydrateRow: (row: Record<string, unknown> | null) => row as TestModel | null,
      hydrateMany: (rows: Record<string, unknown>[]) => rows as TestModel[],
    };

    const result = await new SafeFinderQuery(model, modelClass as any)
      .orderBy("created_at")
      .get();

    expect(result).toEqual([{ id: "geo-2", created_at: "2026-03-15T01:00:00Z" }]);
    expect(sort).toHaveBeenCalledWith({ created_at: 1 });
  });

  test("mongo first() covers sorted cursor execution", async () => {
    const toArray = jest.fn(async () => [{ id: "geo-1", created_at: "2026-03-15T00:00:00Z" }]);
    type Cursor = {
      sort: jest.Mock;
      limit: jest.Mock;
      toArray: jest.Mock;
    };
    const cursor = {} as Cursor;
    const limit = jest.fn(() => cursor);
    const sort = jest.fn(() => cursor);
    cursor.sort = sort;
    cursor.limit = limit;
    cursor.toArray = toArray;
    const collection = { find: jest.fn(() => cursor) };
    const db = { collection: jest.fn(() => collection) };

    const model = createTestModel(db, {
      tableName: "geo_locations",
      connectionName: "mongo_test",
      posts() {
        return {};
      },
      async eagerLoadRelations() {
        return [];
      },
    });
    const modelClass = {
      name: "MongoSortedFirstModel",
      schema: {
        id: { kind: "column" },
        created_at: { kind: "column" },
      },
      hydrateRow: (row: Record<string, unknown> | null) => row as TestModel | null,
      hydrateMany: (rows: Record<string, unknown>[]) => rows as TestModel[],
    };

    const result = await new SafeFinderQuery(model, modelClass as any)
      .with("posts")
      .orderBy("created_at", "desc")
      .first();

    expect(result).toBeNull();
    expect(collection.find).toHaveBeenCalledWith({});
    expect(sort).toHaveBeenCalledWith({ created_at: -1 });
    expect(limit).toHaveBeenCalledWith(1);
  });

  test("mongo first() also covers the default ascending sort branch", async () => {
    const toArray = jest.fn(async () => [{ id: "geo-3", created_at: "2026-03-15T02:00:00Z" }]);
    type Cursor = {
      sort: jest.Mock;
      limit: jest.Mock;
      toArray: jest.Mock;
    };
    const cursor = {} as Cursor;
    const limit = jest.fn(() => cursor);
    const sort = jest.fn(() => cursor);
    cursor.sort = sort;
    cursor.limit = limit;
    cursor.toArray = toArray;
    const collection = { find: jest.fn(() => cursor) };
    const db = { collection: jest.fn(() => collection) };

    const model = createTestModel(db, {
      tableName: "geo_locations",
      connectionName: "mongo_test",
    });
    const modelClass = {
      name: "MongoAscendingFirstModel",
      schema: {
        id: { kind: "column" },
        created_at: { kind: "column" },
      },
      hydrateRow: (row: Record<string, unknown> | null) => row as TestModel | null,
      hydrateMany: (rows: Record<string, unknown>[]) => rows as TestModel[],
    };

    const result = await new SafeFinderQuery(model, modelClass as any)
      .orderBy("created_at")
      .first();

    expect(result).toEqual({ id: "geo-3", created_at: "2026-03-15T02:00:00Z" });
    expect(sort).toHaveBeenCalledWith({ created_at: 1 });
    expect(limit).toHaveBeenCalledWith(1);
  });

  test("mongo get() passes the active session to collection.find() when transaction-bound", async () => {
    const toArray = jest.fn(async () => [{ id: "geo-4" }]);
    type Cursor = {
      sort: jest.Mock;
      limit: jest.Mock;
      toArray: jest.Mock;
    };
    const cursor = {} as Cursor;
    const limit = jest.fn(() => cursor);
    const sort = jest.fn(() => cursor);
    cursor.sort = sort;
    cursor.limit = limit;
    cursor.toArray = toArray;

    const find = jest.fn(() => cursor);
    const session = { id: "mongo-session" };
    const model = createTestModel(
      {
        collection: jest.fn(() => ({
          find,
        })),
      },
      {
        connectionName: "mongo",
        getTransactionContext() {
          return {
            connectionName: "mongo",
            driver: "mongo",
            session,
          } as any;
        },
      },
    );
    const modelClass = {
      name: "MongoTxGetModel",
      schema: {
        id: { kind: "column" },
      },
      hydrateRow: (row: Record<string, unknown> | null) => row as TestModel | null,
      hydrateMany: (rows: Record<string, unknown>[]) => rows as TestModel[],
    };

    await expect(new SafeFinderQuery(model, modelClass as any).get()).resolves.toEqual([
      { id: "geo-4" },
    ]);
    expect(find).toHaveBeenCalledWith({}, { session });
  });

  test("relation, scope, and locking guard paths cover the remaining strict branches", async () => {
    const adapter = makeSqlAdapter();
    const model = createTestModel(adapter, {
      connectionName: "mysql_test",
    });
    const modelClass = {
      name: "StrictGuardModel",
      schema: {
        id: { kind: "column" },
      },
      hydrateRow: (row: Record<string, unknown> | null) => row as TestModel | null,
      hydrateMany: (rows: Record<string, unknown>[]) => rows as TestModel[],
    };

    expect(() => new SafeFinderQuery(model, modelClass as any).with("")).toThrow(
      "with() expects non-empty relation names on StrictGuardModel.",
    );
    expect(() => new SafeFinderQuery(model, modelClass as any).with("posts..author")).toThrow(
      "Invalid relation path 'posts..author' on StrictGuardModel.",
    );
    expect(() => new SafeFinderQuery(model, modelClass as any).with("posts")).toThrow(
      "Relation 'posts' is not defined on StrictGuardModel.",
    );

    expect(() => new SafeFinderQuery(model, modelClass as any).active()).toThrow(
      "No active scope available on StrictGuardModel. Define static scopeActive(query) or add a 'status'/'active' column.",
    );
    expect(() => new SafeFinderQuery(model, modelClass as any).inactive()).toThrow(
      "No inactive scope available on StrictGuardModel. Define static scopeInactive(query) or add a 'status'/'active' column.",
    );
    expect(() => new SafeFinderQuery(model, modelClass as any).published()).toThrow(
      "No published scope available on StrictGuardModel. Define static scopePublished(query) or add a 'published'/'status' column.",
    );

    const query = new SafeFinderQuery(model, modelClass as any) as any;
    query.skipLockedRequested = true;
    expect(() => query.buildSqlLockClause()).toThrow(
      "skipLocked() requires forUpdate() or forShare() first.",
    );

    const mismatchedTxModel = createTestModel(adapter, {
      connectionName: "mysql_test",
      getTransactionContext() {
        return {
          connectionName: "mysql_test",
          driver: "pg",
        } as any;
      },
    });

    expect(() =>
      new SafeFinderQuery(mismatchedTxModel, modelClass as any).forUpdate(),
    ).toThrow("forUpdate() requires a transaction matching the model driver 'mysql'.");

    const unsupportedDriverModel = createTestModel(adapter, {
      connectionName: "sqlserver_test",
      getTransactionContext() {
        return {
          connectionName: "sqlserver_test",
          driver: "sqlserver",
        } as any;
      },
    });

    expect(() =>
      new SafeFinderQuery(unsupportedDriverModel, modelClass as any).forUpdate(),
    ).toThrow("forUpdate() is supported only for pg and mysql finders.");

    const lockConflictModel = createTestModel(adapter, {
      connectionName: "mysql_test",
      getTransactionContext() {
        return {
          connectionName: "mysql_test",
          driver: "mysql",
        } as any;
      },
    });

    expect(() =>
      new SafeFinderQuery(lockConflictModel, modelClass as any).forUpdate().forShare(),
    ).toThrow("forShare() cannot be combined with forUpdate().");

    const mongoDriverMismatchModel = createTestModel(adapter, {
      connectionName: "mysql_test",
      getTransactionContext() {
        return {
          connectionName: "mysql_test",
          driver: "mongo",
        } as any;
      },
    });

    expect(() =>
      new SafeFinderQuery(mongoDriverMismatchModel, modelClass as any).forUpdate(),
    ).toThrow("forUpdate() is not supported for mongo finders.");

    const sqliteDriverMismatchModel = createTestModel(adapter, {
      connectionName: "mysql_test",
      getTransactionContext() {
        return {
          connectionName: "mysql_test",
          driver: "sqlite",
        } as any;
      },
    });

    expect(() =>
      new SafeFinderQuery(sqliteDriverMismatchModel, modelClass as any).forUpdate(),
    ).toThrow("forUpdate() is not supported for sqlite finders.");

    const tx = {
      connectionName: "mysql_test",
      driver: "mysql",
    } as any;
    const noBindModel = createTestModel(adapter, {
      connectionName: "mysql_test",
      getTransactionContext() {
        return tx;
      },
    });
    const noBindClass = {
      name: "NoBindModel",
      schema: {
        id: { kind: "column" },
      },
      hydrateRow: (row: Record<string, unknown> | null) =>
        row ? ({ ...row } as TestModel) : null,
      hydrateMany: (rows: Record<string, unknown>[]) =>
        rows.map((row) => ({ ...row } as TestModel)),
    };

    adapter.queryOne.mockResolvedValueOnce({ id: 9 });
    adapter.query.mockResolvedValueOnce([{ id: 10 }]);

    await expect(new SafeFinderQuery(noBindModel, noBindClass as any).first()).resolves.toEqual({
      id: 9,
    });
    await expect(new SafeFinderQuery(noBindModel, noBindClass as any).get()).resolves.toEqual([
      { id: 10 },
    ]);

    const scopedAdapter = makeSqlAdapter();
    const scopedModel = createTestModel(scopedAdapter);
    const scopedModelClass = {
      name: "ScopedReturnModel",
      schema: {
        id: { kind: "column" },
      },
      scopeActive(query: SafeFinderQuery<TestModel>) {
        return query.where("id", 1);
      },
      hydrateRow: (row: Record<string, unknown> | null) => row as TestModel | null,
      hydrateMany: (rows: Record<string, unknown>[]) => rows as TestModel[],
    };

    await new SafeFinderQuery(scopedModel, scopedModelClass as any).active().get();
    expect(scopedAdapter.query).toHaveBeenCalledWith(
      "SELECT * FROM `users` WHERE `id` = ?1",
      [1],
    );
  });

  test("private eager-loading and lock helpers cover passthrough early-return branches", async () => {
    const adapter = makeSqlAdapter();
    const tx = {
      connectionName: "mysql_test",
      driver: "mysql",
    };
    const model = createTestModel(adapter, {
      getTransactionContext() {
        return tx as any;
      },
    });
    const modelClass = {
      name: "PrivateHelperModel",
      schema: {
        id: { kind: "column" },
      },
      hydrateRow: (row: Record<string, unknown> | null) => row as TestModel | null,
      hydrateMany: (rows: Record<string, unknown>[]) => rows as TestModel[],
    };

    const query = new SafeFinderQuery(model, modelClass as any) as any;
    const plainRecord = { id: 1 };
    const txAwareRecord = {
      id: 2,
      useTransaction: jest.fn(() => ({ id: 2, bound: true })),
    };

    await expect(query.applyEagerLoading([])).resolves.toEqual([]);
    expect(query.bindHydratedModel(null)).toBeNull();
    expect(query.bindHydratedModels([plainRecord])).toEqual([plainRecord]);
    expect(query.bindHydratedModels([txAwareRecord])).toEqual([{ id: 2, bound: true }]);
    expect(txAwareRecord.useTransaction).toHaveBeenCalledWith(tx);
    expect(query.buildSqlLockClause()).toBe("");
  });
});

import fs from "fs";
import path from "path";
import type { DriverAdapter } from "../core/connection/DriverAdapter";
import { SafeFinderQuery, type SafeFinderModelInstance } from "../core/model/SafeFinder";

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
    const model: TestModel = {
      tableName: "users",
      connectionName: "sqlite_test",
      async getDB() {
        return adapter;
      },
    };
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

  test("scope functions that return void still keep the safe finder chain alive", async () => {
    const adapter = makeSqlAdapter();
    const model: TestModel = {
      tableName: "users",
      connectionName: "sqlite_test",
      async getDB() {
        return adapter;
      },
    };
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
    const model: TestModel = {
      tableName: "users",
      connectionName: "mystery_driver",
      async getDB() {
        return {};
      },
    };
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

    const noSchemaModel: TestModel = {
      tableName: "users",
      connectionName: "sqlite_test",
      async getDB() {
        return adapter;
      },
    };
    const noSchemaClass = {
      name: "NoSchemaModel",
      hydrateRow: (row: Record<string, unknown> | null) => row as TestModel | null,
      hydrateMany: (rows: Record<string, unknown>[]) => rows as TestModel[],
    };

    expect(() => new SafeFinderQuery(noSchemaModel, noSchemaClass as any).where("id", 1)).toThrow(
      "NoSchemaModel must define a schema to use the safe finder API.",
    );

    const noEagerModel: TestModel = {
      tableName: "users",
      connectionName: "sqlite_test",
      posts() {
        return {};
      },
      async getDB() {
        return adapter;
      },
    };
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

    const hydratedNullModel: TestModel = {
      tableName: "users",
      connectionName: "sqlite_test",
      async getDB() {
        return adapter;
      },
    };
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

    const emptyEagerModel: TestModel = {
      tableName: "users",
      connectionName: "sqlite_test",
      posts() {
        return {};
      },
      async eagerLoadRelations() {
        return [];
      },
      async getDB() {
        return adapter;
      },
    };
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

    const model: TestModel = {
      tableName: "geo_locations",
      connectionName: "mongo_test",
      async getDB() {
        return db;
      },
    };
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

    const model: TestModel = {
      tableName: "geo_locations",
      connectionName: "mongo_test",
      posts() {
        return {};
      },
      async eagerLoadRelations() {
        return [];
      },
      async getDB() {
        return db;
      },
    };
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

    const model: TestModel = {
      tableName: "geo_locations",
      connectionName: "mongo_test",
      async getDB() {
        return db;
      },
    };
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
});

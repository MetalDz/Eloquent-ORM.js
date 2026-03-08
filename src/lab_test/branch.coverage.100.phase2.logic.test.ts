import { createAdapter, type DriverAdapter } from "../core/connection/DriverAdapter";
import { Relation, type CoreModelClass, type RelationModel } from "../core/orm/Relation";
import { BelongsTo } from "../core/orm/relations/BelongsTo";
import { BelongsToMany } from "../core/orm/relations/BelongsToMany";
import { HasMany } from "../core/orm/relations/HasMany";
import { HasOne } from "../core/orm/relations/HasOne";
import { MorphMany } from "../core/orm/relations/MorphMany";
import { MorphOne } from "../core/orm/relations/MorphOne";
import { MorphTo } from "../core/orm/relations/MorphTo";
import { MorphRegistry } from "../core/orm/mixins/MorphRegistry";

type Row = Record<string, unknown>;

type MockAdapter = {
  query: jest.Mock<Promise<Row[]>, [string, unknown[]?]>;
  queryOne: jest.Mock<Promise<Row | null>, [string, unknown[]?]>;
  execute: jest.Mock<Promise<void>, [string, unknown[]?]>;
  insert: jest.Mock<Promise<{ id?: unknown; row?: Row }>, [string, unknown[]?]>;
} & Omit<DriverAdapter, "query" | "queryOne" | "execute" | "insert">;

function makeAdapter(name: DriverAdapter["name"] = "mysql"): MockAdapter {
  return {
    name,
    kind: "sql",
    query: jest.fn<Promise<Row[]>, [string, unknown[]?]>(async () => []),
    queryOne: jest.fn<Promise<Row | null>, [string, unknown[]?]>(async () => null),
    execute: jest.fn<Promise<void>, [string, unknown[]?]>(async () => undefined),
    insert: jest.fn<Promise<{ id?: unknown; row?: Row }>, [string, unknown[]?]>(
      async () => ({ id: undefined })
    ),
    placeholder: (index: number) => `$${index}`,
    placeholders: (count: number, startIndex = 1) =>
      Array.from({ length: count }, (_, idx) => `$${startIndex + idx}`).join(", "),
    inClause: (field: string, values: unknown[], startIndex = 1) => ({
      sql: `${field} IN (${Array.from({ length: values.length }, () => "?").join(", ")})`,
      params: values,
      nextIndex: startIndex + values.length,
    }),
    wrapId: (id: string) => id,
  };
}

function makeRelatedModel(
  adapter: MockAdapter,
  tableName: string,
  hydrateRowImpl?: (row: Row | null) => Row | null
): CoreModelClass {
  class RelatedModel {
    tableName = tableName;

    async getDB(): Promise<DriverAdapter> {
      return adapter as unknown as DriverAdapter;
    }

    static hydrateRow(row: Row | null): Row | null {
      return hydrateRowImpl ? hydrateRowImpl(row) : row;
    }

    static hydrateMany(rows: Row[]): Row[] {
      return rows;
    }
  }

  return RelatedModel as unknown as CoreModelClass;
}

describe("Branch coverage 100% - phase 2 core branch trees", () => {
  afterEach(() => {
    MorphRegistry.clear();
    jest.resetModules();
    jest.restoreAllMocks();
  });

  test("DriverAdapter: covers mysql/sqlite null branches and unsupported drivers", async () => {
    const mysqlQuery = jest
      .fn()
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([{ insertedId: 9001 }]);
    const mysqlAdapter = createAdapter("mysql_test", { query: mysqlQuery } as never);

    expect(mysqlAdapter.wrapId("*")).toBe("*");
    expect(mysqlAdapter.inClause("id", [], 4)).toEqual({
      sql: "1=0",
      params: [],
      nextIndex: 4,
    });
    await expect(mysqlAdapter.queryOne("SELECT * FROM users WHERE id = ?", [10])).resolves.toBeNull();
    await expect(mysqlAdapter.insert("INSERT INTO users (name) VALUES (?)", ["A"])).resolves.toEqual({
      id: 9001,
    });

    const sqliteAdapter = createAdapter(
      "sqlite_test",
      {
        all: jest.fn(async () => []),
        get: jest.fn(async () => undefined),
        run: jest.fn(async () => undefined),
      } as never
    );
    await expect(sqliteAdapter.queryOne("SELECT * FROM logs WHERE id = ?", [1])).resolves.toBeNull();
    await expect(sqliteAdapter.insert("INSERT INTO logs (name) VALUES (?)", ["x"])).resolves.toEqual({
      id: undefined,
    });

    expect(() => createAdapter("missing_connection" as never, {} as never)).toThrow(
      "Unsupported driver for adapter: undefined"
    );
  });

  test("ConnectionFactory: covers cached getConnection/getAdapter branches", async () => {
    const connection = { query: jest.fn(), end: jest.fn(async () => undefined) };
    const connectDB = jest.fn(async () => connection);
    const closeMongoClient = jest.fn(async () => false);
    const createAdapterMock = jest.fn(() => ({
      name: "mysql_test",
      kind: "sql",
      query: async () => [],
      queryOne: async () => null,
      execute: async () => undefined,
      insert: async () => ({ id: undefined }),
      placeholder: () => "?",
      placeholders: () => "?",
      inClause: () => ({ sql: "1=0", params: [], nextIndex: 1 }),
      wrapId: (id: string) => id,
    }));

    jest.doMock("../core/connection/DatabaseConnection", () => ({
      connectDB,
      closeMongoClient,
    }));
    jest.doMock("../core/connection/DriverAdapter", () => ({
      createAdapter: createAdapterMock,
    }));

    const { getConnection, getAdapter } = await import("../core/connection/ConnectionFactory");

    const firstConn = await getConnection("mysql_test" as never);
    const secondConn = await getConnection("mysql_test" as never);
    expect(firstConn).toBe(secondConn);
    expect(connectDB).toHaveBeenCalledTimes(1);

    const firstAdapter = await getAdapter("mysql_test" as never);
    const secondAdapter = await getAdapter("mysql_test" as never);
    expect(firstAdapter).toBe(secondAdapter);
    expect(createAdapterMock).toHaveBeenCalledTimes(1);
  });

  test("ConnectionFactory: closes sqlite and mongo variants without throwing", async () => {
    const sqliteCloser = jest.fn(async () => undefined);
    const mongoCloser = jest.fn(async () => undefined);
    const connectDB = jest.fn(async (name: string) => {
      if (name === "sqlite_test") return { close: sqliteCloser };
      if (name === "sqlite") return {};
      if (name === "mongo") return { close: mongoCloser };
      return { end: jest.fn(async () => undefined) };
    });

    const closeMongoClient = jest.fn(async () => false);
    jest.doMock("../core/connection/DatabaseConnection", () => ({
      connectDB,
      closeMongoClient,
    }));

    const { getConnection, closeAllConnections } = await import("../core/connection/ConnectionFactory");

    await getConnection("sqlite_test" as never);
    await getConnection("sqlite" as never);
    await getConnection("mongo" as never);
    await closeAllConnections();

    expect(sqliteCloser).toHaveBeenCalledTimes(1);
    expect(closeMongoClient).toHaveBeenCalledTimes(1);
    expect(mongoCloser).toHaveBeenCalledTimes(1);
  });

  test("ConnectionFactory: skips mongo .close when tracker already closed client", async () => {
    const mongoCloser = jest.fn(async () => undefined);
    const connectDB = jest.fn(async (name: string) => {
      if (name === "mongo") return { close: mongoCloser };
      return { end: jest.fn(async () => undefined) };
    });
    const closeMongoClient = jest.fn(async () => true);

    jest.doMock("../core/connection/DatabaseConnection", () => ({
      connectDB,
      closeMongoClient,
    }));

    const { getConnection, closeAllConnections } = await import("../core/connection/ConnectionFactory");
    await getConnection("mongo" as never);
    await closeAllConnections();

    expect(closeMongoClient).toHaveBeenCalledTimes(1);
    expect(mongoCloser).not.toHaveBeenCalled();
  });

  test("ConnectionFactory: suppresses 'closed state' errors but logs other close failures", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    const closeStateConn = {
      close: jest.fn(async () => {
        throw new Error("database already in closed state");
      }),
    };
    const hardErrorConn = {
      close: jest.fn(async () => {
        throw new Error("disk I/O failed");
      }),
    };
    const connectDB = jest.fn(async (name: string) => {
      if (name === "sqlite_test") return closeStateConn;
      if (name === "sqlite") return hardErrorConn;
      return {};
    });
    const closeMongoClient = jest.fn(async () => false);
    const redactSecretsInValue = jest.fn((value: unknown) => value);

    jest.doMock("../core/connection/DatabaseConnection", () => ({
      connectDB,
      closeMongoClient,
    }));
    jest.doMock("../core/security/SecretRedactor", () => ({
      redactSecretsInValue,
    }));

    const { getConnection, closeAllConnections } = await import("../core/connection/ConnectionFactory");

    await getConnection("sqlite_test" as never);
    await getConnection("sqlite" as never);
    await closeAllConnections();

    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect((errorSpy.mock.calls[0] ?? [])[0]).toContain("Error closing sqlite:");
    expect(redactSecretsInValue).toHaveBeenCalledTimes(1);
  });

  test("Relation base: detectRelationName catch branch falls back to undefined", () => {
    class StackThrowsError {
      get stack(): string {
        throw new Error("broken stack");
      }
    }
    const originalError = global.Error;

    class DummyRelation extends Relation {
      async getResults(): Promise<unknown> {
        return null;
      }
      async match(): Promise<void> {
        return;
      }
      public relationName(): string | undefined {
        return (this as unknown as { name?: string }).name;
      }
    }

    try {
      (global as unknown as { Error: unknown }).Error = StackThrowsError as unknown as ErrorConstructor;
      const rel = new DummyRelation(null, "x_id", "id");
      expect(rel.relationName()).toBeUndefined();
    } finally {
      (global as unknown as { Error: unknown }).Error = originalError;
    }
  });

  test("BelongsTo/HasOne/HasMany cover empty-parent early returns and null-related-model throws", async () => {
    const belongsTo = new BelongsTo(null as never, "user_id", "id");
    await expect(belongsTo.match([])).resolves.toBeUndefined();
    await expect(belongsTo.getResults({ user_id: 1 })).rejects.toThrow("Related model is not defined.");
    await expect(belongsTo.match([{ user_id: 1 }])).rejects.toThrow("Related model is not defined.");

    const hasOne = new HasOne(null as never, "user_id", "id");
    await expect(hasOne.match([])).resolves.toBeUndefined();
    await expect(hasOne.getResults({ id: 1 })).rejects.toThrow("Related model is not defined.");
    await expect(hasOne.match([{ id: 1 }])).rejects.toThrow("Related model is not defined.");

    const hasMany = new HasMany(null as never, "user_id", "id");
    await expect(hasMany.match([])).resolves.toBeUndefined();
    await expect(hasMany.getResults({ id: 1 })).rejects.toThrow("Related model is not defined.");
    await expect(hasMany.match([{ id: 1 }])).rejects.toThrow("Related model is not defined.");
  });

  test("BelongsToMany covers null-related-model throws across API methods", async () => {
    const relation = new BelongsToMany(null as never, "post_tags", "post_id", "tag_id");

    await expect(relation.match([])).resolves.toBeUndefined();
    await expect(relation.getResults({ tag_id: 1 })).rejects.toThrow("Related model is not defined.");
    await expect(relation.match([{ tag_id: 1 }])).rejects.toThrow("Related model is not defined.");
    await expect(relation.attach(1, 2)).rejects.toThrow("Related model is not defined.");
    await expect(relation.detach(1, 2)).rejects.toThrow("Related model is not defined.");
    await expect(relation.sync(1, [2, 3])).rejects.toThrow("Related model is not defined.");
  });

  test("MorphTo covers null morph type and empty parent branches", async () => {
    const relation = new MorphTo("commentable_type", "commentable_id");

    await expect(relation.getResults({ commentable_id: 10 })).resolves.toBeNull();
    await expect(relation.match([])).resolves.toBeUndefined();
  });

  test("MorphOne/MorphMany use constructor.name fallback and default relation name", async () => {
    const adapter = makeAdapter("pg_test");
    adapter.queryOne.mockResolvedValue({ id: 80, imageable_id: 10, imageable_type: "ParentRecord" });
    adapter.query.mockResolvedValue([
      { id: 80, imageable_id: 10, imageable_type: "ParentRecord" },
      { id: 90, imageable_id: 10, imageable_type: "ParentRecord" },
      { id: 91, imageable_id: 11, imageable_type: "ParentRecord" },
    ]);

    const RelatedModel = makeRelatedModel(adapter, "images");
    const one = new MorphOne(RelatedModel, "imageable_type", "imageable_id");
    const many = new MorphMany(RelatedModel, "imageable_type", "imageable_id");
    (one as unknown as { name?: string }).name = undefined;
    (many as unknown as { name?: string }).name = undefined;

    class ParentRecord {
      constructor(public id: number) {}
    }
    const oneParent = new ParentRecord(10) as unknown as Record<string, unknown>;
    const oneRow = await one.getResults(oneParent);
    expect(oneRow).toEqual({ id: 80, imageable_id: 10, imageable_type: "ParentRecord" });
    expect(adapter.queryOne).toHaveBeenCalledWith(expect.any(String), [10, "ParentRecord"]);

    const manyRows = await many.getResults(oneParent);
    expect(manyRows).toHaveLength(3);

    const parents = [
      new ParentRecord(10) as unknown as Record<string, unknown>,
      new ParentRecord(11) as unknown as Record<string, unknown>,
      new ParentRecord(12) as unknown as Record<string, unknown>,
    ];
    await one.match(parents);
    expect((parents[0] as Row).relation).toEqual({
      id: 90,
      imageable_id: 10,
      imageable_type: "ParentRecord",
    });
    expect((parents[2] as Row).relation).toBeNull();

    await many.match(parents);
    expect(((parents[0] as Row).relation as Row[]).length).toBe(2);
    expect(((parents[1] as Row).relation as Row[]).length).toBe(1);
    expect(((parents[2] as Row).relation as Row[]).length).toBe(0);
  });

  test("MorphOne/MorphMany skip rows when hydrateRow returns null", async () => {
    const adapter = makeAdapter("pg_test");
    adapter.query.mockResolvedValue([{ id: 1, imageable_id: 10, imageable_type: "ParentRecord" }]);
    const RelatedModel = makeRelatedModel(adapter, "images", () => null);

    const one = new MorphOne(RelatedModel, "imageable_type", "imageable_id");
    const many = new MorphMany(RelatedModel, "imageable_type", "imageable_id");
    (one as unknown as { name?: string }).name = "image";
    (many as unknown as { name?: string }).name = "images";

    class ParentRecord {
      constructor(public id: number) {}
    }
    const parents = [new ParentRecord(10) as unknown as Record<string, unknown>];

    await one.match(parents);
    await many.match(parents);

    expect((parents[0] as Row).image).toBeNull();
    expect((parents[0] as Row).images).toEqual([]);
  });
});

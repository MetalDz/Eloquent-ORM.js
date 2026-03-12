import { getAdapter, getConnection } from "../core/connection/ConnectionFactory";
import type { DriverAdapter } from "../core/connection/DriverAdapter";
import { BaseModel } from "../core/model/BaseModel";
import { column, relation, validate } from "../core/schema/SchemaBlueprint";

jest.mock("../core/connection/ConnectionFactory", () => ({
  getAdapter: jest.fn(),
  getConnection: jest.fn(),
}));

const mockedGetAdapter = getAdapter as jest.MockedFunction<typeof getAdapter>;
const mockedGetConnection = getConnection as jest.MockedFunction<typeof getConnection>;

function makePgAdapter(): DriverAdapter & {
  query: jest.Mock;
  queryOne: jest.Mock;
  execute: jest.Mock;
  insert: jest.Mock;
} {
  const query = jest.fn();
  const queryOne = jest.fn();
  const execute = jest.fn();
  const insert = jest.fn();

  return {
    name: "pg_test",
    kind: "sql",
    query,
    queryOne,
    execute,
    insert,
    placeholder: (index: number) => `$${index}`,
    placeholders: (count: number, startIndex = 1) =>
      Array.from({ length: count }, (_, idx) => `$${startIndex + idx}`).join(", "),
    inClause: (field: string, values: unknown[], startIndex = 1) => ({
      sql: `${field} = ANY($${startIndex})`,
      params: [values],
      nextIndex: startIndex + 1,
    }),
    wrapId: (id: string) => {
      for (const part of id.split(".")) {
        if (part !== "*" && !/^[A-Za-z_][A-Za-z0-9_]*$/.test(part)) {
          throw new Error(`Unsafe SQL identifier: ${part}`);
        }
      }
      return `"${id}"`;
    },
  };
}

describe("Safe finder API runtime", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("SQL safe finder uses schema-validated fields, wrapped identifiers, params, order, and limit", async () => {
    class SqlFinderModel extends BaseModel {
      static schema = {
        id: column("increments", undefined, { primary: true }),
        status: validate(column("string", 255), { required: true }),
        role: validate(column("string", 255), { required: true }),
        created_at: column("timestamp"),
        posts: relation("hasMany", "Post", { foreignKey: "user_id" }),
      };

      constructor() {
        super("users", "pg_test");
      }

      posts() {
        return {
          name: "posts",
          getResults: async () => [],
          match: async (records: Array<Record<string, unknown>>) => {
            for (const record of records) {
              record.posts = [{ id: 101, title: "Hello" }];
            }
          },
        };
      }
    }

    const adapter = makePgAdapter();
    adapter.query.mockResolvedValue([
      { id: 9, status: "active", role: "admin", created_at: "2026-03-12T00:00:00Z" },
    ]);
    adapter.queryOne.mockResolvedValue({
      id: 7,
      status: "active",
      role: "admin",
      created_at: "2026-03-11T00:00:00Z",
    });
    mockedGetAdapter.mockResolvedValue(adapter as unknown as DriverAdapter);

    const rows = await SqlFinderModel.where("status", "active")
      .orderBy("created_at", "desc")
      .limit(10)
      .get();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toBeInstanceOf(SqlFinderModel);
    expect(adapter.query).toHaveBeenCalledWith(
      'SELECT * FROM "users" WHERE "status" = $1 ORDER BY "created_at" DESC LIMIT 10',
      ["active"]
    );

    const first = await SqlFinderModel.findOneBy("role", "admin");
    expect(first).toBeInstanceOf(SqlFinderModel);
    expect(adapter.queryOne).toHaveBeenCalledWith(
      'SELECT * FROM "users" WHERE "role" = $1 LIMIT 1',
      ["admin"]
    );

    const multi = await SqlFinderModel.findAllBy({ status: "active", role: "admin" });
    expect(multi).toHaveLength(1);
    expect(adapter.query).toHaveBeenNthCalledWith(
      2,
      'SELECT * FROM "users" WHERE "status" = $1 AND "role" = $2',
      ["active", "admin"]
    );

    expect(() => SqlFinderModel.where("posts", 1)).toThrow("Unknown filter field 'posts'");
    expect(() => SqlFinderModel.orderBy("posts")).toThrow("Unknown sort field 'posts'");
    expect(() => SqlFinderModel.orderBy("created_at", "sideways" as never)).toThrow(
      "Unsupported sort direction"
    );
    expect(() => SqlFinderModel.limit(0)).toThrow("limit() expects a positive integer.");
  });

  test("safe finder supports eager loading via with() and active scope fallback/custom scope", async () => {
    class ScopeAwareModel extends BaseModel {
      static schema = {
        id: column("increments", undefined, { primary: true }),
        status: validate(column("string", 255), { required: true }),
        created_at: column("timestamp"),
        posts: relation("hasMany", "Post", { foreignKey: "user_id" }),
      };

      static scopeActive(query: any) {
        return query.where("status", "active");
      }

      constructor() {
        super("users", "pg_test");
      }

      posts() {
        return {
          name: "posts",
          getResults: async () => [],
          match: async (records: Array<Record<string, unknown>>) => {
            for (const record of records) {
              record.posts = [{ id: 201, title: "Scoped" }];
            }
          },
        };
      }
    }

    class FallbackActiveModel extends BaseModel {
      static schema = {
        id: column("increments", undefined, { primary: true }),
        active: column("boolean"),
      };

      constructor() {
        super("users", "pg_test");
      }
    }

    const adapter = makePgAdapter();
    adapter.query.mockResolvedValue([{ id: 8, status: "active" }]);
    adapter.queryOne.mockResolvedValue({ id: 7, status: "active" });
    mockedGetAdapter.mockResolvedValue(adapter as unknown as DriverAdapter);

    const record = await ScopeAwareModel.where("id", 7).with("posts").active().first();
    expect(record).toBeInstanceOf(ScopeAwareModel);
    expect(record).toEqual(
      expect.objectContaining({
        id: 7,
        status: "active",
        posts: [{ id: 201, title: "Scoped" }],
      })
    );
    expect(adapter.queryOne).toHaveBeenCalledWith(
      'SELECT * FROM "users" WHERE "id" = $1 AND "status" = $2 LIMIT 1',
      [7, "active"]
    );

    const rows = await ScopeAwareModel.with("posts").active().get();
    expect(rows[0]).toEqual(
      expect.objectContaining({
        posts: [{ id: 201, title: "Scoped" }],
      })
    );
    expect(adapter.query).toHaveBeenCalledWith(
      'SELECT * FROM "users" WHERE "status" = $1',
      ["active"]
    );

    await FallbackActiveModel.active().get();
    expect(adapter.query).toHaveBeenNthCalledWith(
      2,
      'SELECT * FROM "users" WHERE "active" = $1',
      [true]
    );

    class NoActiveScopeModel extends BaseModel {
      static schema = {
        id: column("increments", undefined, { primary: true }),
      };

      constructor() {
        super("users", "pg_test");
      }
    }

    expect(() => NoActiveScopeModel.active()).toThrow(
      "No active scope available on NoActiveScopeModel"
    );
  });

  test("mongo safe finder translates filters, sort, limit, and existence checks", async () => {
    const toArray = jest.fn();
    const sort = jest.fn();
    const limit = jest.fn();
    const cursor = { sort, limit, toArray };
    sort.mockImplementation(() => cursor);
    limit.mockImplementation(() => cursor);

    const collection = {
      find: jest.fn(() => cursor),
    };
    const db = {
      collection: jest.fn(() => collection),
    };

    class MongoFinderModel extends BaseModel {
      static schema = {
        id: column("uuid"),
        status: validate(column("string", 255), { required: true }),
        created_at: column("timestamp"),
      };

      constructor() {
        super("geo_locations", "mongo");
      }
    }

    toArray.mockResolvedValueOnce([
      { id: "geo-1", status: "active", created_at: "2026-03-12T00:00:00Z" },
    ]);
    toArray.mockResolvedValueOnce([]);
    toArray.mockResolvedValueOnce([{ id: "geo-2", status: "active" }]);
    mockedGetConnection.mockResolvedValue(db as never);

    const rows = await MongoFinderModel.where("status", "active")
      .orderBy("created_at", "desc")
      .limit(5)
      .get();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toBeInstanceOf(MongoFinderModel);
    expect(collection.find).toHaveBeenNthCalledWith(1, { status: "active" });
    expect(sort).toHaveBeenNthCalledWith(1, { created_at: -1 });
    expect(limit).toHaveBeenNthCalledWith(1, 5);

    const exists = await MongoFinderModel.existsBy({ status: "inactive" });
    expect(exists).toBe(false);
    expect(collection.find).toHaveBeenNthCalledWith(2, { status: "inactive" });
    expect(limit).toHaveBeenNthCalledWith(2, 1);

    const first = await MongoFinderModel.first();
    expect(first).toBeInstanceOf(MongoFinderModel);
    expect(collection.find).toHaveBeenNthCalledWith(3, {});
    expect(limit).toHaveBeenNthCalledWith(3, 1);
  });
});

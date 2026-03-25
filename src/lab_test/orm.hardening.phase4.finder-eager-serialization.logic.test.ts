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
    wrapId: (id: string) => `"${id}"`,
  };
}

describe("ORM hardening phase 4 finder eager serialization", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("SQL safe-finder eager-loaded results keep recursive serialization through first()", async () => {
    class SqlPostModel extends BaseModel {
      static schema = {
        id: column("increments", undefined, { primary: true }),
        title: validate(column("string", 255), { required: true }),
        secret: column("string", 255),
      };

      constructor() {
        super("posts", "pg_test");
      }
    }

    class SqlUserModel extends BaseModel {
      static schema = {
        id: column("increments", undefined, { primary: true }),
        status: validate(column("string", 255), { required: true }),
        posts: relation("hasMany", "SqlPostModel", { foreignKey: "user_id" }),
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
              const post = new SqlPostModel() as SqlPostModel & Record<string, unknown>;
              post.id = 901;
              post.title = "SQL Related";
              post.secret = "sql-hidden";
              post.hidden = ["secret"];
              record.posts = [post];
            }
          },
        };
      }
    }

    const adapter = makePgAdapter();
    adapter.queryOne.mockResolvedValue({
      id: 7,
      status: "active",
    });
    mockedGetAdapter.mockResolvedValue(adapter as unknown as DriverAdapter);

    const user = await SqlUserModel.where("id", 7).with("posts").first();
    expect(user).toBeInstanceOf(SqlUserModel);

    const serialized = user!.toObject() as Record<string, unknown>;
    const fromJson = user!.toJSON() as Record<string, unknown>;

    expect(serialized).toEqual(
      expect.objectContaining({
        id: 7,
        status: "active",
        posts: [
          expect.objectContaining({
            id: 901,
            title: "SQL Related",
          }),
        ],
      })
    );
    expect((serialized.posts as Array<Record<string, unknown>>)[0]).not.toHaveProperty("secret");
    expect(fromJson).toEqual(expect.objectContaining(serialized));
  });

  test("Mongo safe-finder eager-loaded results keep recursive serialization through get()", async () => {
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

    class MongoPostModel extends BaseModel {
      static schema = {
        id: column("uuid"),
        title: validate(column("string", 255), { required: true }),
        secret: column("string", 255),
      };

      constructor() {
        super("posts", "mongo");
      }
    }

    class MongoUserModel extends BaseModel {
      static schema = {
        id: column("uuid"),
        status: validate(column("string", 255), { required: true }),
        posts: relation("hasMany", "MongoPostModel", { foreignKey: "user_id" }),
      };

      constructor() {
        super("users", "mongo");
      }

      posts() {
        return {
          name: "posts",
          getResults: async () => [],
          match: async (records: Array<Record<string, unknown>>) => {
            for (const record of records) {
              const post = new MongoPostModel() as MongoPostModel & Record<string, unknown>;
              post.id = "mongo-post-1";
              post.title = "Mongo Related";
              post.secret = "mongo-hidden";
              post.hidden = ["secret"];
              record.posts = [post];
            }
          },
        };
      }
    }

    toArray.mockResolvedValueOnce([
      {
        id: "mongo-user-1",
        status: "active",
      },
    ]);
    mockedGetConnection.mockResolvedValue(db as never);

    const users = await MongoUserModel.where("status", "active").with("posts").get();
    expect(users).toHaveLength(1);

    const serialized = users[0].toObject() as Record<string, unknown>;
    const fromJson = users[0].toJSON() as Record<string, unknown>;

    expect(collection.find).toHaveBeenCalledWith({ status: "active" });
    expect(serialized).toEqual(
      expect.objectContaining({
        id: "mongo-user-1",
        status: "active",
        posts: [
          expect.objectContaining({
            id: "mongo-post-1",
            title: "Mongo Related",
          }),
        ],
      })
    );
    expect((serialized.posts as Array<Record<string, unknown>>)[0]).not.toHaveProperty("secret");
    expect(fromJson).toEqual(expect.objectContaining(serialized));
  });
});

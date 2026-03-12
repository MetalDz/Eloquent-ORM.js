import { BaseModel } from "../core/model/BaseModel";
import type { DriverAdapter } from "../core/connection/DriverAdapter";
import { getAdapter, getConnection } from "../core/connection/ConnectionFactory";
import { column, relation, validate } from "../core/schema/SchemaBlueprint";

jest.mock("../core/connection/ConnectionFactory", () => ({
  getAdapter: jest.fn(),
  getConnection: jest.fn(),
}));

const mockedGetAdapter = getAdapter as jest.MockedFunction<typeof getAdapter>;
const mockedGetConnection = getConnection as jest.MockedFunction<typeof getConnection>;

function makeSqlAdapter(): DriverAdapter & {
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
    name: "mysql",
    kind: "sql",
    query,
    queryOne,
    execute,
    insert,
    placeholder: () => "?",
    placeholders: (count: number) => Array.from({ length: count }, () => "?").join(", "),
    inClause: (field: string, values: unknown[], startIndex = 1) => ({
      sql: `${field} IN (${Array.from({ length: values.length }, () => "?").join(", ")})`,
      params: values,
      nextIndex: startIndex + values.length,
    }),
    wrapId: (id: string) => `\`${id}\``,
  };
}

describe("Instance persistence layer runtime", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  class UserModel extends BaseModel {
    static schema = {
      id: column("increments", undefined, { primary: true }),
      name: validate(column("string", 255), { required: true, min: 3 }),
      email: validate(column("string", 255), { required: true, email: true }),
      status: column("string", 255),
      posts: relation("hasMany", "Post", { foreignKey: "user_id" }),
    };

    constructor(connectionName: "mysql" | "mongo" = "mysql") {
      super("users", connectionName as any);
    }
  }

  class GeoModel extends BaseModel {
    static schema = {
      _id: column("string", 255, { primary: true }),
      name: validate(column("string", 255), { required: true, min: 3 }),
    };

    constructor() {
      super("geo_locations", "mongo" as any);
    }
  }

  class SchemaLessModel extends BaseModel {
    constructor() {
      super("users", "mysql");
    }
  }

  test("fill() assigns schema-backed column fields only", () => {
    const user = new UserModel() as UserModel & Record<string, unknown>;

    expect(user.fill({ name: "Alice", email: "alice@example.com" })).toBe(user);
    expect(user.name).toBe("Alice");
    expect(user.email).toBe("alice@example.com");
    expect(() => user.fill({ posts: [] })).toThrow("Unknown fill field 'posts' on UserModel.");
    expect(() => user.fill({ role: "admin" })).toThrow("Unknown fill field 'role' on UserModel.");
  });

  test("save() creates new SQL records and later updates only dirty fields", async () => {
    const adapter = makeSqlAdapter();
    adapter.insert.mockResolvedValue({
      id: 11,
      row: {
        id: 11,
        name: "Alice",
        email: "alice@example.com",
        status: "active",
      },
    });
    mockedGetAdapter.mockResolvedValue(adapter as unknown as DriverAdapter);

    const user = new UserModel();
    user.fill({
      name: "Alice",
      email: "alice@example.com",
      status: "active",
    });

    await user.save();

    expect(adapter.insert).toHaveBeenCalledWith(
      "INSERT INTO `users` (`name`, `email`, `status`) VALUES (?, ?, ?)",
      ["Alice", "alice@example.com", "active"]
    );
    expect((user as unknown as Record<string, unknown>).id).toBe(11);

    user.fill({ name: "Alice 2" });
    await user.save();
    expect(adapter.execute).toHaveBeenNthCalledWith(
      1,
      "UPDATE `users` SET `name` = ? WHERE `id` = ?",
      ["Alice 2", 11]
    );

    await user.save();
    expect(adapter.execute).toHaveBeenCalledTimes(1);
  });

  test("patch() updates only provided fields and blocks persisted primary-key mutation", async () => {
    const adapter = makeSqlAdapter();
    adapter.insert.mockResolvedValue({
      id: 7,
      row: {
        id: 7,
        name: "Alice",
        email: "alice@example.com",
        status: "active",
      },
    });
    mockedGetAdapter.mockResolvedValue(adapter as unknown as DriverAdapter);

    const user = new UserModel();
    user.fill({
      name: "Alice",
      email: "alice@example.com",
      status: "active",
    });
    await user.save();

    await user.patch({ email: "alice-2@example.com" });
    expect(adapter.execute).toHaveBeenNthCalledWith(
      1,
      "UPDATE `users` SET `email` = ? WHERE `id` = ?",
      ["alice-2@example.com", 7]
    );
    expect((user as unknown as Record<string, unknown>).email).toBe("alice-2@example.com");

    await expect(user.patch({ id: 9 })).rejects.toThrow(
      "Cannot change persisted primary key 'id' on UserModel."
    );

    (user as unknown as Record<string, unknown>).id = 12;
    await expect(user.save()).rejects.toThrow(
      "Cannot change persisted primary key 'id' on UserModel."
    );
  });

  test("save() and patch() reuse mongo create/update paths with _id fallback", async () => {
    const collection = {
      insertOne: jest.fn(async () => ({ insertedId: "mongo-geo-1" })),
      updateOne: jest.fn(async () => ({ matchedCount: 1, modifiedCount: 1 })),
    };
    const mongoDb = {
      collection: jest.fn(() => collection),
    };
    mockedGetConnection.mockResolvedValue(mongoDb as never);

    const geo = new GeoModel();
    geo.fill({ name: "Geo Point" });

    await geo.save();
    expect(collection.insertOne).toHaveBeenCalledWith({ name: "Geo Point" });
    expect((geo as unknown as Record<string, unknown>).id).toBe("mongo-geo-1");

    geo.fill({ name: "Geo Point 2" });
    await geo.save();
    expect(collection.updateOne).toHaveBeenNthCalledWith(
      1,
      { _id: "mongo-geo-1" },
      { $set: { name: "Geo Point 2" } }
    );

    await geo.patch({ name: "Geo Point 3" });
    expect(collection.updateOne).toHaveBeenNthCalledWith(
      2,
      { _id: "mongo-geo-1" },
      { $set: { name: "Geo Point 3" } }
    );
  });

  test("save()/patch() require schema and persisted patch targets", async () => {
    const adapter = makeSqlAdapter();
    mockedGetAdapter.mockResolvedValue(adapter as unknown as DriverAdapter);

    await expect(new SchemaLessModel().save()).rejects.toThrow(
      "SchemaLessModel must define a schema to use fill(), save(), or patch()."
    );
    await expect(new UserModel().patch({ email: "alice@example.com" })).rejects.toThrow(
      "patch() requires a persisted model instance for UserModel."
    );
  });
});

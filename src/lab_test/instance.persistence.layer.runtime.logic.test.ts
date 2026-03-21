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

  class SoftUserModel extends BaseModel {
    static schema = {
      id: column("increments", undefined, { primary: true }),
      name: column("string", 255),
      status: column("string", 255),
      deleted_at: column("timestamp"),
    };

    constructor() {
      super("users", "mysql");
    }
  }

  class SoftGeoModel extends BaseModel {
    static schema = {
      _id: column("string", 255, { primary: true }),
      name: column("string", 255),
      deleted_at: column("timestamp"),
    };

    constructor() {
      super("geo_locations", "mongo" as any);
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

    user.update({ name: "Alice 2" });
    await user.save();
    expect(adapter.execute).toHaveBeenNthCalledWith(
      1,
      "UPDATE `users` SET `name` = ? WHERE `id` = ?",
      ["Alice 2", 11]
    );

    await user.save();
    expect(adapter.execute).toHaveBeenCalledTimes(1);
  });

  test("static create() and static find() expose Laravel-like SQL runtime entry points", async () => {
    const adapter = makeSqlAdapter();
    adapter.insert.mockResolvedValue({
      id: 19,
      row: {
        id: 19,
        name: "Taylor",
        email: "taylor@example.com",
      },
    });
    adapter.queryOne.mockResolvedValue({
      id: 19,
      name: "Taylor",
      email: "taylor@example.com",
    });
    mockedGetAdapter.mockResolvedValue(adapter as unknown as DriverAdapter);

    const created = await UserModel.create({
      name: "Taylor",
      email: "taylor@example.com",
    });
    expect(created).toBeInstanceOf(UserModel);

    const found = await UserModel.find(19);
    expect(found).toBeInstanceOf(UserModel);
    expect(adapter.queryOne).toHaveBeenCalledWith(
      "SELECT * FROM `users` WHERE `id` = ?",
      [19]
    );
  });

  test("static updateById() and deleteById() expose explicit SQL low-level helpers", async () => {
    const adapter = makeSqlAdapter();
    mockedGetAdapter.mockResolvedValue(adapter as unknown as DriverAdapter);

    await SoftUserModel.updateById(21, { status: "inactive" });
    await SoftUserModel.deleteById(21);

    expect(adapter.execute).toHaveBeenNthCalledWith(
      1,
      "UPDATE `users` SET `status` = ? WHERE `id` = ?",
      ["inactive", 21]
    );
    expect(adapter.execute).toHaveBeenNthCalledWith(
      2,
      "UPDATE `users` SET `deleted_at` = ? WHERE `id` = ?",
      [expect.any(String), 21]
    );
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

    geo.update({ name: "Geo Point 2" });
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

  test("static create() and static find() expose Laravel-like Mongo runtime entry points", async () => {
    const collection = {
      insertOne: jest.fn(async () => ({ insertedId: "mongo-geo-9" })),
      findOne: jest.fn(async () => ({ id: "mongo-geo-9", name: "Geo Static" })),
    };
    const mongoDb = {
      collection: jest.fn(() => collection),
    };
    mockedGetConnection.mockResolvedValue(mongoDb as never);

    const created = await GeoModel.create({ name: "Geo Static" });
    expect(created).toBeInstanceOf(GeoModel);

    const found = await GeoModel.find("mongo-geo-9");
    expect(found).toBeInstanceOf(GeoModel);
    expect(collection.findOne).toHaveBeenCalledWith({
      $or: [{ id: "mongo-geo-9" }, { _id: "mongo-geo-9" }],
    });
  });

  test("static updateById() and deleteById() expose explicit Mongo low-level helpers", async () => {
    const collection = {
      updateOne: jest.fn(async () => ({ matchedCount: 1, modifiedCount: 1 })),
    };
    const mongoDb = {
      collection: jest.fn(() => collection),
    };
    mockedGetConnection.mockResolvedValue(mongoDb as never);

    await SoftGeoModel.updateById("mongo-geo-5", { name: "Geo Update" }, "_id");
    await SoftGeoModel.deleteById("mongo-geo-5", "_id");

    expect(collection.updateOne).toHaveBeenNthCalledWith(
      1,
      { _id: "mongo-geo-5" },
      { $set: { name: "Geo Update" } }
    );
    expect(collection.updateOne).toHaveBeenNthCalledWith(
      2,
      { _id: "mongo-geo-5" },
      { $set: { deleted_at: expect.any(String) } }
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

  test("restoreById() works for soft-deletable models", async () => {
    const adapter = makeSqlAdapter();
    mockedGetAdapter.mockResolvedValue(adapter as unknown as DriverAdapter);

    await SoftUserModel.restoreById(44);
    expect(adapter.execute).toHaveBeenCalledWith(
      "UPDATE `users` SET `deleted_at` = ? WHERE `id` = ?",
      [null, 44]
    );
  });

  test("bulk SQL helpers preserve order and per-id execution contracts", async () => {
    const adapter = makeSqlAdapter();
    adapter.insert
      .mockResolvedValueOnce({
        id: 31,
        row: { id: 31, name: "Alice", email: "alice@example.com", status: "active" },
      })
      .mockResolvedValueOnce({
        id: 32,
        row: { id: 32, name: "Bob", email: "bob@example.com", status: "active" },
      });
    mockedGetAdapter.mockResolvedValue(adapter as unknown as DriverAdapter);

    const created = await UserModel.createMany([
      { name: "Alice", email: "alice@example.com", status: "active" },
      { name: "Bob", email: "bob@example.com", status: "active" },
    ]);
    expect(created).toHaveLength(2);
    expect(created[0]).toBeInstanceOf(UserModel);
    expect((created[0] as unknown as Record<string, unknown>).id).toBe(31);
    expect((created[1] as unknown as Record<string, unknown>).id).toBe(32);

    await SoftUserModel.updateMany([31, 32], { status: "inactive" });
    await UserModel.patchMany([
      { id: 31, email: "alice+1@example.com" },
      { id: 32, email: "bob+1@example.com" },
    ]);
    await SoftUserModel.deleteMany([31, 32]);
    await SoftUserModel.restoreMany([31, 32]);

    expect(adapter.execute).toHaveBeenNthCalledWith(
      1,
      "UPDATE `users` SET `status` = ? WHERE `id` = ?",
      ["inactive", 31]
    );
    expect(adapter.execute).toHaveBeenNthCalledWith(
      2,
      "UPDATE `users` SET `status` = ? WHERE `id` = ?",
      ["inactive", 32]
    );
    expect(adapter.execute).toHaveBeenNthCalledWith(
      3,
      "UPDATE `users` SET `email` = ? WHERE `id` = ?",
      ["alice+1@example.com", 31]
    );
    expect(adapter.execute).toHaveBeenNthCalledWith(
      4,
      "UPDATE `users` SET `email` = ? WHERE `id` = ?",
      ["bob+1@example.com", 32]
    );
    expect(adapter.execute).toHaveBeenNthCalledWith(
      5,
      "UPDATE `users` SET `deleted_at` = ? WHERE `id` = ?",
      [expect.any(String), 31]
    );
    expect(adapter.execute).toHaveBeenNthCalledWith(
      6,
      "UPDATE `users` SET `deleted_at` = ? WHERE `id` = ?",
      [expect.any(String), 32]
    );
    expect(adapter.execute).toHaveBeenNthCalledWith(
      7,
      "UPDATE `users` SET `deleted_at` = ? WHERE `id` = ?",
      [null, 31]
    );
    expect(adapter.execute).toHaveBeenNthCalledWith(
      8,
      "UPDATE `users` SET `deleted_at` = ? WHERE `id` = ?",
      [null, 32]
    );
  });

  test("bulk helper guardrails reject malformed payloads and unsupported restore", async () => {
    const adapter = makeSqlAdapter();
    mockedGetAdapter.mockResolvedValue(adapter as unknown as DriverAdapter);

    await expect(UserModel.patchMany([{ email: "missing-id@example.com" }])).rejects.toThrow(
      "UserModel.patchMany() requires primary key 'id' on every item."
    );
    await expect(UserModel.restoreMany({} as never)).rejects.toThrow(
      "UserModel.restoreMany() expects an array of primary keys."
    );
    await expect(UserModel.createMany({} as never)).rejects.toThrow(
      "UserModel.createMany() expects an array of payload objects."
    );
  });

  test("bulk Mongo helpers reuse native per-record execution paths", async () => {
    const collection = {
      insertOne: jest
        .fn(async () => ({ insertedId: "mongo-geo-31" }))
        .mockImplementationOnce(async () => ({ insertedId: "mongo-geo-31" }))
        .mockImplementationOnce(async () => ({ insertedId: "mongo-geo-32" })),
      updateOne: jest.fn(async () => ({ matchedCount: 1, modifiedCount: 1 })),
    };
    const mongoDb = {
      collection: jest.fn(() => collection),
    };
    mockedGetConnection.mockResolvedValue(mongoDb as never);

    const created = await GeoModel.createMany([{ name: "Geo A" }, { name: "Geo B" }]);
    expect(created).toHaveLength(2);
    expect(created[0]).toBeInstanceOf(GeoModel);
    expect((created[0] as unknown as Record<string, unknown>).id).toBe("mongo-geo-31");
    expect((created[1] as unknown as Record<string, unknown>).id).toBe("mongo-geo-32");

    await SoftGeoModel.updateMany(["mongo-geo-31", "mongo-geo-32"], { name: "Geo Updated" }, "_id");
    await GeoModel.patchMany(
      [
        { _id: "mongo-geo-31", name: "Geo Patch A" },
        { _id: "mongo-geo-32", name: "Geo Patch B" },
      ],
      "_id"
    );
    await SoftGeoModel.deleteMany(["mongo-geo-31", "mongo-geo-32"], "_id");
    await SoftGeoModel.restoreMany(["mongo-geo-31", "mongo-geo-32"], "_id");

    expect(collection.updateOne).toHaveBeenNthCalledWith(
      1,
      { _id: "mongo-geo-31" },
      { $set: { name: "Geo Updated" } }
    );
    expect(collection.updateOne).toHaveBeenNthCalledWith(
      2,
      { _id: "mongo-geo-32" },
      { $set: { name: "Geo Updated" } }
    );
    expect(collection.updateOne).toHaveBeenNthCalledWith(
      3,
      { _id: "mongo-geo-31" },
      { $set: { name: "Geo Patch A" } }
    );
    expect(collection.updateOne).toHaveBeenNthCalledWith(
      4,
      { _id: "mongo-geo-32" },
      { $set: { name: "Geo Patch B" } }
    );
    expect(collection.updateOne).toHaveBeenNthCalledWith(
      5,
      { _id: "mongo-geo-31" },
      { $set: { deleted_at: expect.any(String) } }
    );
    expect(collection.updateOne).toHaveBeenNthCalledWith(
      6,
      { _id: "mongo-geo-32" },
      { $set: { deleted_at: expect.any(String) } }
    );
    expect(collection.updateOne).toHaveBeenNthCalledWith(
      7,
      { _id: "mongo-geo-31" },
      { $set: { deleted_at: null } }
    );
    expect(collection.updateOne).toHaveBeenNthCalledWith(
      8,
      { _id: "mongo-geo-32" },
      { $set: { deleted_at: null } }
    );
  });

});

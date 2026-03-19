import { BaseModel } from "../core/model/BaseModel";
import type { DriverAdapter } from "../core/connection/DriverAdapter";
import { getAdapter, getConnection } from "../core/connection/ConnectionFactory";
import { column, validate } from "../core/schema/SchemaBlueprint";

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

describe("ORM hardening phase 4 soft-delete instance state", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("SQL persisted instances sync deleted_at state across delete() and restore()", async () => {
    class SoftSqlModel extends BaseModel {
      static schema = {
        id: column("increments", undefined, { primary: true }),
        name: validate(column("string", 255), { required: true, min: 3 }),
        deleted_at: column("timestamp"),
      };

      constructor() {
        super("users", "mysql");
      }
    }

    const adapter = makeSqlAdapter();
    adapter.insert.mockResolvedValue({
      id: 31,
      row: {
        id: 31,
        name: "Soft SQL User",
        deleted_at: null,
      },
    });
    mockedGetAdapter.mockResolvedValue(adapter as unknown as DriverAdapter);

    const model = new SoftSqlModel() as SoftSqlModel & Record<string, unknown>;
    model.fill({ name: "Soft SQL User" });
    await model.save();

    await model.delete();
    expect(typeof model.deleted_at).toBe("string");
    expect(adapter.execute).toHaveBeenNthCalledWith(
      1,
      "UPDATE `users` SET `deleted_at` = ? WHERE `id` = ?",
      [expect.any(String), 31]
    );

    await model.save();
    expect(adapter.execute).toHaveBeenCalledTimes(1);

    await (model as any).restore();
    expect(model.deleted_at).toBeNull();
    expect(adapter.execute).toHaveBeenNthCalledWith(
      2,
      "UPDATE `users` SET `deleted_at` = ? WHERE `id` = ?",
      [null, 31]
    );

    await model.save();
    expect(adapter.execute).toHaveBeenCalledTimes(2);
  });

  test("Mongo persisted instances sync deleted_at state across delete() and restore()", async () => {
    const collection = {
      insertOne: jest.fn(async () => ({ insertedId: "soft-mongo-31" })),
      updateOne: jest.fn(async () => ({ matchedCount: 1, modifiedCount: 1 })),
    };
    const mongoDb = {
      collection: jest.fn(() => collection),
    };
    mockedGetConnection.mockResolvedValue(mongoDb as never);

    class SoftMongoModel extends BaseModel {
      static schema = {
        _id: column("string", 255, { primary: true }),
        name: validate(column("string", 255), { required: true, min: 3 }),
        deleted_at: column("timestamp"),
      };

      constructor() {
        super("users", "mongo" as any);
      }
    }

    const model = new SoftMongoModel() as SoftMongoModel & Record<string, unknown>;
    model.fill({ name: "Soft Mongo User" });
    await model.save();

    await model.delete(undefined as never, "_id");
    expect(typeof model.deleted_at).toBe("string");
    expect(collection.updateOne).toHaveBeenNthCalledWith(
      1,
      { _id: "soft-mongo-31" },
      { $set: { deleted_at: expect.any(String) } }
    );

    await model.save("_id");
    expect(collection.updateOne).toHaveBeenCalledTimes(1);

    await (model as any).restore(undefined, "_id");
    expect(model.deleted_at).toBeNull();
    expect(collection.updateOne).toHaveBeenNthCalledWith(
      2,
      { _id: "soft-mongo-31" },
      { $set: { deleted_at: null } }
    );

    await model.save("_id");
    expect(collection.updateOne).toHaveBeenCalledTimes(2);
  });
});

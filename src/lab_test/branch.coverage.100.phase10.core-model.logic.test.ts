import { CoreModel, MongoModel } from "../core/model/CoreModel";
import type { DriverAdapter } from "../core/connection/DriverAdapter";
import { getAdapter, getConnection } from "../core/connection/ConnectionFactory";
import { SchemaValidator } from "../core/schema/SchemaValidator";

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

class SqlModel extends CoreModel {
  constructor(connectionName: any = "mysql") {
    super("users", connectionName);
  }
}

class CoreMongoModel extends CoreModel {
  constructor() {
    super("users", "mongo");
  }
}

class ExplicitMongoModel extends MongoModel {
  constructor() {
    super("users");
  }
}

describe("Branch coverage 100% - phase 10 CoreModel branches", () => {
  const previousDisableHooks = process.env.ELOQUENT_DISABLE_MODEL_HOOKS;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.ELOQUENT_DISABLE_MODEL_HOOKS;
  });

  afterEach(() => {
    if (previousDisableHooks === undefined) {
      delete process.env.ELOQUENT_DISABLE_MODEL_HOOKS;
    } else {
      process.env.ELOQUENT_DISABLE_MODEL_HOOKS = previousDisableHooks;
    }
  });

  test("hydrateRow/hydrateMany create model instances and keep null behavior", () => {
    class HydratedModel extends CoreModel {
      constructor() {
        super("users", "mysql");
      }
    }

    const one = HydratedModel.hydrateRow({ id: 1, name: "A" }) as HydratedModel | null;
    const none = HydratedModel.hydrateRow(null);
    const many = HydratedModel.hydrateMany([{ id: 1 }, { id: 2 }]);

    expect(one).toBeInstanceOf(HydratedModel);
    expect(none).toBeNull();
    expect(many).toHaveLength(2);
    expect(many[0]).toBeInstanceOf(HydratedModel);
  });

  test("uses mongo connection path in CoreModel.getDB and MongoModel.getDB", async () => {
    const mongoDb = {
      collection: jest.fn(),
    };
    mockedGetConnection.mockResolvedValue(mongoDb as any);

    const baseMongo = new CoreMongoModel();
    const explicitMongo = new ExplicitMongoModel();

    await expect(baseMongo.getDB()).resolves.toBe(mongoDb);
    await expect(explicitMongo.getDB()).resolves.toBe(mongoDb);
    expect(mockedGetConnection).toHaveBeenCalledWith("mongo");
  });

  test("model events can cancel create/update/delete and block SQL execution", async () => {
    const adapter = makeSqlAdapter();
    mockedGetAdapter.mockResolvedValue(adapter as unknown as DriverAdapter);

    class CancelModel extends CoreModel {
      static modelEvents = {
        beforeCreate: () => false,
        beforeUpdate: () => false,
        beforeDelete: () => false,
      };

      constructor() {
        super("users", "mysql");
      }
    }

    const model = new CancelModel();
    await expect(model.create({ name: "blocked" })).resolves.toBeNull();
    await expect(model.update(1, { name: "blocked" })).resolves.toBeUndefined();
    await expect(model.delete(1)).resolves.toBeUndefined();

    expect(adapter.insert).not.toHaveBeenCalled();
    expect(adapter.execute).not.toHaveBeenCalled();
  });

  test("runs mongo CRUD branches for find/all/create/update/delete", async () => {
    const collection = {
      findOne: jest.fn(async () => ({ id: 7, name: "Mona" })),
      find: jest.fn(() => ({ toArray: jest.fn(async () => [{ id: 7 }, { id: 8 }]) })),
      insertOne: jest.fn(async () => ({ insertedId: "abc123" })),
      updateOne: jest.fn(async () => ({ matchedCount: 1 })),
      deleteOne: jest.fn(async () => ({ deletedCount: 1 })),
    };
    const mongoDb = {
      collection: jest.fn(() => collection),
    };
    mockedGetConnection.mockResolvedValue(mongoDb as any);

    const model = new CoreMongoModel();

    const found = await model.find(7);
    const allRows = await model.all();
    const created = await model.create({ name: "Mona" });
    await model.update(7, { name: "Updated" });
    await model.delete(7);

    expect(found).toBeInstanceOf(CoreMongoModel);
    expect(allRows).toHaveLength(2);
    expect(created).toBeInstanceOf(CoreMongoModel);
    expect(collection.findOne).toHaveBeenCalledWith({ id: 7 });
    expect(collection.insertOne).toHaveBeenCalledWith({ name: "Mona" });
    expect(collection.updateOne).toHaveBeenCalledWith({ id: 7 }, { $set: { name: "Updated" } });
    expect(collection.deleteOne).toHaveBeenCalledWith({ id: 7 });
  });

  test("throws unsupported-driver errors across CRUD operations", async () => {
    mockedGetAdapter.mockResolvedValue({} as DriverAdapter);
    const model = new SqlModel("unknown_conn");

    await expect(model.find(1)).rejects.toThrow("Unsupported driver: unknown_conn");
    await expect(model.all()).rejects.toThrow("Unsupported driver: unknown_conn");
    await expect(model.create({ name: "X" })).rejects.toThrow("Unsupported driver: unknown_conn");
    await expect(model.update(1, { name: "Y" })).rejects.toThrow(
      "Unsupported driver: unknown_conn"
    );
    await expect(model.delete(1)).rejects.toThrow("Unsupported driver: unknown_conn");
  });

  test("throws on empty SQL create payload and executes model events when not skipped", async () => {
    const adapter = makeSqlAdapter();
    adapter.insert.mockResolvedValue({ id: 9 });
    mockedGetAdapter.mockResolvedValue(adapter as unknown as DriverAdapter);

    const beforeCreate = jest.fn(() => true);
    const afterCreate = jest.fn();

    class EventfulModel extends CoreModel {
      static modelEvents = {
        beforeCreate,
        afterCreate,
      };

      constructor() {
        super("users", "mysql");
      }
    }

    const model = new EventfulModel();
    await expect(model.create({})).rejects.toThrow("Cannot create a record with empty data.");
    await expect(model.create({ name: "runs" })).resolves.toBeInstanceOf(EventfulModel);

    expect(beforeCreate).toHaveBeenCalledTimes(2);
    expect(afterCreate).toHaveBeenCalledTimes(1);
    expect(adapter.insert).toHaveBeenCalledTimes(1);
  });

  test("CoreModel default connection and non-column schema fields are handled correctly", async () => {
    const adapter = makeSqlAdapter();
    adapter.insert.mockResolvedValue({ id: 42, row: { id: 42, name: "ok" } });
    mockedGetAdapter.mockResolvedValue(adapter as unknown as DriverAdapter);

    const validateSpy = jest.spyOn(SchemaValidator, "validateData").mockResolvedValue([]);

    class DefaultConnModel extends CoreModel {
      static schema = {
        comments: {
          kind: "relation",
          relation: "hasMany",
          model: "Comment",
          options: {},
        },
        name: {
          kind: "column",
          type: "string",
          options: {},
          validate: { required: true },
        },
      } as never;

      constructor() {
        super("users");
      }
    }

    try {
      const model = new DefaultConnModel();
      await expect(model.create({ name: "ok" })).resolves.toBeInstanceOf(DefaultConnModel);

      expect(model.connectionName).toBe("mysql");
      expect(validateSpy).toHaveBeenCalledWith(
        { name: "ok" },
        { name: expect.any(Object) },
        expect.any(Object)
      );
    } finally {
      validateSpy.mockRestore();
    }
  });
});

import { CoreModel } from "../core/model/CoreModel.js";
import { getAdapter, getConnection } from "../core/connection/ConnectionFactory.js";
import { column, validate } from "../core/schema/SchemaBlueprint.js";

jest.mock("../core/connection/ConnectionFactory", () => ({
  getAdapter: jest.fn(),
  getConnection: jest.fn(),
}));

const mockedGetConnection = getConnection as jest.MockedFunction<typeof getConnection>;
const mockedGetAdapter = getAdapter as jest.MockedFunction<typeof getAdapter>;

describe("NoSQL validation on Mongo runtime", () => {
  const originalDisableHooks = process.env.ELOQUENT_DISABLE_MODEL_HOOKS;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.ELOQUENT_DISABLE_MODEL_HOOKS;
  });

  afterAll(() => {
    if (originalDisableHooks === undefined) {
      delete process.env.ELOQUENT_DISABLE_MODEL_HOOKS;
    } else {
      process.env.ELOQUENT_DISABLE_MODEL_HOOKS = originalDisableHooks;
    }
  });

  function buildMongoDb() {
    const collection = {
      insertOne: jest.fn(async (doc: Record<string, unknown>) => ({
        insertedId: doc.name === "geo-primary" ? "mongo-geo-1" : "mongo-generic-1",
      })),
      updateOne: jest.fn(async () => ({ matchedCount: 1, modifiedCount: 1 })),
      findOne: jest.fn(async () => null),
    };
    return {
      db: {
        collection: jest.fn(() => collection),
      },
      collection,
    };
  }

  test("create validates payload on mongo and blocks insert when invalid", async () => {
    const beforeValidate = jest.fn();
    const afterValidate = jest.fn();

    class GeoModel extends CoreModel {
      static schema = {
        name: validate(column("string", 255), { required: true, min: 3 }),
        email: validate(column("string", 255), { required: true, email: true }),
      };

      static validationHooks = {
        beforeValidate,
        afterValidate,
      };

      constructor() {
        super("geo_locations", "mongo");
      }
    }

    const mongo = buildMongoDb();
    mockedGetConnection.mockResolvedValue(mongo.db as never);

    const model = new GeoModel();

    await expect(
      model.create({
        name: "ab",
        email: "not-an-email",
      })
    ).rejects.toThrow("Validation failed for geo_locations");

    expect(beforeValidate).toHaveBeenCalledTimes(1);
    expect(afterValidate).toHaveBeenCalledTimes(1);
    expect(mongo.collection.insertOne).not.toHaveBeenCalled();
    expect(mockedGetAdapter).not.toHaveBeenCalled();
    expect(mockedGetConnection).not.toHaveBeenCalled();
  });

  test("mongo create/update honor partial validation and custom primary-key filter", async () => {
    class GeoModel extends CoreModel {
      static schema = {
        name: validate(column("string", 255), { required: true, min: 3 }),
        email: validate(column("string", 255), { required: true, email: true }),
      };

      constructor() {
        super("geo_locations", "mongo");
      }
    }

    const mongo = buildMongoDb();
    mockedGetConnection.mockResolvedValue(mongo.db as never);

    const model = new GeoModel();
    const created = await model.create({
      name: "geo-primary",
      email: "geo@example.com",
    });
    expect(created).not.toBeNull();
    expect((created as unknown as { id?: string }).id).toBe("mongo-geo-1");

    await expect(model.update(7, { email: "bad-email" })).rejects.toThrow(
      "email is not a valid email address"
    );
    await expect(model.update(7, { name: "ok-name" })).resolves.toBeUndefined();
    await expect(model.update("mongo-doc-id", { name: "doc-name" }, "_id")).resolves.toBeUndefined();

    expect(mongo.collection.updateOne).toHaveBeenNthCalledWith(
      1,
      { $or: [{ id: 7 }, { _id: 7 }] },
      { $set: { name: "ok-name" } }
    );
    expect(mongo.collection.updateOne).toHaveBeenNthCalledWith(
      2,
      { _id: "mongo-doc-id" },
      { $set: { name: "doc-name" } }
    );
  });

  test("ELOQUENT_DISABLE_MODEL_HOOKS disables validation hooks on mongo without disabling rules", async () => {
    const beforeValidate = jest.fn();
    const afterValidate = jest.fn();

    class HookAwareMongoModel extends CoreModel {
      static schema = {
        name: validate(column("string", 255), { required: true, min: 3 }),
        email: validate(column("string", 255), { required: true, email: true }),
      };

      static validationHooks = {
        beforeValidate,
        afterValidate,
      };

      constructor() {
        super("geo_locations", "mongo");
      }
    }

    const mongo = buildMongoDb();
    mockedGetConnection.mockResolvedValue(mongo.db as never);
    process.env.ELOQUENT_DISABLE_MODEL_HOOKS = "true";

    const model = new HookAwareMongoModel();

    await expect(
      model.create({
        name: "geo-valid",
      })
    ).rejects.toThrow("email is required");

    expect(beforeValidate).not.toHaveBeenCalled();
    expect(afterValidate).not.toHaveBeenCalled();
    expect(mongo.collection.insertOne).not.toHaveBeenCalled();
  });
});

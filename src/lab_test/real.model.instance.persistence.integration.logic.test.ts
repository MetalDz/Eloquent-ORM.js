import type { DriverAdapter } from "../core/connection/DriverAdapter";
import { getAdapter, getConnection } from "../core/connection/ConnectionFactory";

jest.mock("../core/connection/ConnectionFactory", () => ({
  getAdapter: jest.fn(),
  getConnection: jest.fn(),
}));

import { AppSmoke } from "../app/models/AppSmoke";
import { GeoLocalisation } from "../app/models/GeoLocalisation";

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

describe("Real model instance persistence integration", () => {
  const originalDbConnection = process.env.DB_CONNECTION;
  const originalDisableHooks = process.env.ELOQUENT_DISABLE_MODEL_HOOKS;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.DB_CONNECTION = "mysql";
    process.env.ELOQUENT_DISABLE_MODEL_HOOKS = "true";
  });

  afterAll(() => {
    if (originalDbConnection === undefined) {
      delete process.env.DB_CONNECTION;
    } else {
      process.env.DB_CONNECTION = originalDbConnection;
    }

    if (originalDisableHooks === undefined) {
      delete process.env.ELOQUENT_DISABLE_MODEL_HOOKS;
    } else {
      process.env.ELOQUENT_DISABLE_MODEL_HOOKS = originalDisableHooks;
    }
  });

  test("AppSmoke supports fill().save().patch() through the SQL runtime path", async () => {
    const adapter = makeSqlAdapter();
    adapter.insert.mockResolvedValue({
      id: 21,
      row: {
        id: 21,
        name: "Smoke Alpha",
      },
    });
    mockedGetAdapter.mockResolvedValue(adapter as unknown as DriverAdapter);

    const model = new AppSmoke() as AppSmoke & Record<string, unknown>;

    model.fill({ name: "Smoke Alpha" });
    await model.save();

    expect(adapter.insert).toHaveBeenCalledWith(
      "INSERT INTO `appsmokes` (`name`) VALUES (?)",
      ["Smoke Alpha"]
    );
    expect(model.id).toBe(21);

    model.fill({ name: "Smoke Beta" });
    await model.save();

    expect(adapter.execute).toHaveBeenNthCalledWith(
      1,
      "UPDATE `appsmokes` SET `name` = ? WHERE `id` = ?",
      ["Smoke Beta", 21]
    );

    await model.patch({ name: "Smoke Gamma" });

    expect(adapter.execute).toHaveBeenNthCalledWith(
      2,
      "UPDATE `appsmokes` SET `name` = ? WHERE `id` = ?",
      ["Smoke Gamma", 21]
    );
    expect(model.name).toBe("Smoke Gamma");

    model.fill({ name: "ab" });
    await expect(model.save()).rejects.toThrow("Validation failed for appsmokes");
  });

  test("GeoLocalisation supports fill().save().patch() through the Mongo runtime path", async () => {
    const collection = {
      insertOne: jest.fn(async () => ({ insertedId: "mongo-geo-21" })),
      updateOne: jest.fn(async () => ({ matchedCount: 1, modifiedCount: 1 })),
    };
    const mongoDb = {
      collection: jest.fn(() => collection),
    };
    mockedGetConnection.mockResolvedValue(mongoDb as never);

    const model = new GeoLocalisation() as GeoLocalisation & Record<string, unknown>;

    model.fill({ name: "Geo Alpha" });
    await model.save();

    expect(collection.insertOne).toHaveBeenCalledWith({ name: "Geo Alpha" });
    expect(model.id).toBe("mongo-geo-21");

    model.fill({ name: "Geo Beta" });
    await model.save();

    expect(collection.updateOne).toHaveBeenNthCalledWith(
      1,
      { $or: [{ id: "mongo-geo-21" }, { _id: "mongo-geo-21" }] },
      { $set: { name: "Geo Beta" } }
    );

    await model.patch({ name: "Geo Gamma" });

    expect(collection.updateOne).toHaveBeenNthCalledWith(
      2,
      { $or: [{ id: "mongo-geo-21" }, { _id: "mongo-geo-21" }] },
      { $set: { name: "Geo Gamma" } }
    );
    expect(model.name).toBe("Geo Gamma");

    model.fill({ name: "ab" });
    await expect(model.save()).rejects.toThrow("Validation failed for geolocalisations");
  });
});

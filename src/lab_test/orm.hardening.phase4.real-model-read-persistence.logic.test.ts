import type { DriverAdapter } from "../core/connection/DriverAdapter";
import { getAdapter, getConnection } from "../core/connection/ConnectionFactory";
import { loadAppModel } from "./support/appModelResolver";

jest.mock("../core/connection/ConnectionFactory", () => ({
  getAdapter: jest.fn(),
  getConnection: jest.fn(),
}));

const mockedGetAdapter = getAdapter as jest.MockedFunction<typeof getAdapter>;
const mockedGetConnection = getConnection as jest.MockedFunction<typeof getConnection>;

function loadAppSmokeModel() {
  return loadAppModel<{
    new (): Record<string, unknown> & {
      fill(data: Record<string, unknown>): unknown;
      save(): Promise<void>;
      patch(data: Record<string, unknown>): Promise<void>;
      toObject(): Record<string, unknown>;
      toJSON(): string;
    };
    findOneBy(field: string, value: unknown): Promise<Record<string, unknown> | null>;
  }>("AppSmoke").exported;
}

function loadGeoLocalisationModel() {
  return loadAppModel<{
    new (): Record<string, unknown> & {
      fill(data: Record<string, unknown>): unknown;
      save(pk?: string): Promise<void>;
      patch(data: Record<string, unknown>, pk?: string): Promise<void>;
      toObject(): Record<string, unknown>;
      toJSON(): string;
    };
    findOneBy(field: string, value: unknown): Promise<Record<string, unknown> | null>;
  }>("GeoLocalisation").exported;
}

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

describe("ORM hardening phase 4 real-model read and persistence integration", () => {
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

  test("AppSmoke supports finder hydration, serialization, and persisted updates through the SQL runtime path", async () => {
    const AppSmoke = loadAppSmokeModel();
    const adapter = makeSqlAdapter();
    adapter.queryOne.mockResolvedValueOnce({
      id: 41,
      name: "Smoke Alpha",
      created_at: "2026-03-14T00:00:00Z",
      updated_at: "2026-03-14T00:00:00Z",
    });
    mockedGetAdapter.mockResolvedValue(adapter as unknown as DriverAdapter);

    const found = await AppSmoke.findOneBy("name", "Smoke Alpha");
    expect(found).toBeInstanceOf(AppSmoke);
    expect(adapter.queryOne).toHaveBeenCalledWith(
      "SELECT * FROM `appsmokes` WHERE `name` = ? LIMIT 1",
      ["Smoke Alpha"]
    );

    const foundModel = found as InstanceType<typeof AppSmoke> & Record<string, unknown>;
    expect(foundModel.toObject()).toEqual(
      expect.objectContaining({
        id: 41,
        name: "Smoke Alpha",
      })
    );
    expect(JSON.parse(foundModel.toJSON())).toEqual(
      expect.objectContaining({
        id: 41,
        name: "Smoke Alpha",
      })
    );

    foundModel.fill({ name: "Smoke Beta" });
    await foundModel.save();
    expect(adapter.execute).toHaveBeenNthCalledWith(
      1,
      "UPDATE `appsmokes` SET `name` = ? WHERE `id` = ?",
      ["Smoke Beta", 41]
    );

    await foundModel.patch({ name: "Smoke Gamma" });
    expect(adapter.execute).toHaveBeenNthCalledWith(
      2,
      "UPDATE `appsmokes` SET `name` = ? WHERE `id` = ?",
      ["Smoke Gamma", 41]
    );
    expect(foundModel.name).toBe("Smoke Gamma");
  });

  test("GeoLocalisation supports finder hydration, serialization, and persisted updates through the Mongo runtime path", async () => {
    const GeoLocalisation = loadGeoLocalisationModel();
    const toArray = jest.fn();
    const limit = jest.fn();
    const cursor = { limit, toArray };
    limit.mockImplementation(() => cursor);

    const collection = {
      find: jest.fn(() => cursor),
      updateOne: jest.fn(async () => ({ matchedCount: 1, modifiedCount: 1 })),
    };
    const mongoDb = {
      collection: jest.fn(() => collection),
    };

    toArray.mockResolvedValueOnce([
      {
        id: "geo-41",
        name: "Geo Alpha",
        created_at: "2026-03-14T00:00:00Z",
        updated_at: "2026-03-14T00:00:00Z",
      },
    ]);
    mockedGetConnection.mockResolvedValue(mongoDb as never);

    const found = await GeoLocalisation.findOneBy("name", "Geo Alpha");
    expect(found).toBeInstanceOf(GeoLocalisation);
    expect(collection.find).toHaveBeenCalledWith({ name: "Geo Alpha" });

    const foundModel = found as InstanceType<typeof GeoLocalisation> & Record<string, unknown>;
    expect(foundModel.toObject()).toEqual(
      expect.objectContaining({
        id: "geo-41",
        name: "Geo Alpha",
      })
    );
    expect(JSON.parse(foundModel.toJSON())).toEqual(
      expect.objectContaining({
        id: "geo-41",
        name: "Geo Alpha",
      })
    );

    foundModel.fill({ name: "Geo Beta" });
    await foundModel.save();
    expect(collection.updateOne).toHaveBeenNthCalledWith(
      1,
      { $or: [{ id: "geo-41" }, { _id: "geo-41" }] },
      { $set: { name: "Geo Beta" } }
    );

    await foundModel.patch({ name: "Geo Gamma" });
    expect(collection.updateOne).toHaveBeenNthCalledWith(
      2,
      { $or: [{ id: "geo-41" }, { _id: "geo-41" }] },
      { $set: { name: "Geo Gamma" } }
    );
    expect(foundModel.name).toBe("Geo Gamma");
  });
});

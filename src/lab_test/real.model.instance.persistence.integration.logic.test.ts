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
      update(data: Record<string, unknown>): unknown;
      save(): Promise<void>;
      patch(data: Record<string, unknown>): Promise<void>;
    };
    create(data: Record<string, unknown>): Promise<Record<string, unknown> | null>;
    find(id: number | string): Promise<Record<string, unknown> | null>;
    createMany(data: Record<string, unknown>[]): Promise<Record<string, unknown>[]>;
    updateMany(ids: Array<number | string>, data: Record<string, unknown>, pk?: string): Promise<void>;
    patchMany(rows: Record<string, unknown>[], pk?: string): Promise<void>;
    deleteMany(ids: Array<number | string>, pk?: string): Promise<void>;
    restoreMany(ids: Array<number | string>, pk?: string): Promise<void>;
  }>("AppSmoke").exported;
}

function loadGeoLocalisationModel() {
  return loadAppModel<{
    new (): Record<string, unknown> & {
      fill(data: Record<string, unknown>): unknown;
      update(data: Record<string, unknown>): unknown;
      save(): Promise<void>;
      patch(data: Record<string, unknown>): Promise<void>;
    };
    create(data: Record<string, unknown>): Promise<Record<string, unknown> | null>;
    find(id: number | string): Promise<Record<string, unknown> | null>;
    createMany(data: Record<string, unknown>[]): Promise<Record<string, unknown>[]>;
    updateMany(ids: Array<number | string>, data: Record<string, unknown>, pk?: string): Promise<void>;
    patchMany(rows: Record<string, unknown>[], pk?: string): Promise<void>;
    deleteMany(ids: Array<number | string>, pk?: string): Promise<void>;
    restoreMany(ids: Array<number | string>, pk?: string): Promise<void>;
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
    const AppSmoke = loadAppSmokeModel();
    const adapter = makeSqlAdapter();
    adapter.insert
      .mockResolvedValueOnce({
        id: 21,
        row: {
          id: 21,
          name: "Smoke Alpha",
        },
      })
      .mockResolvedValueOnce({
        id: 22,
        row: {
          id: 22,
          name: "Smoke Bulk A",
        },
      })
      .mockResolvedValueOnce({
        id: 23,
        row: {
          id: 23,
          name: "Smoke Bulk B",
        },
      })
      .mockResolvedValue({
        id: 24,
        row: {
          id: 24,
          name: "Smoke Static",
        },
      });
    mockedGetAdapter.mockResolvedValue(adapter as unknown as DriverAdapter);

    const model = new AppSmoke();

    model.fill({ name: "Smoke Alpha" });
    await model.save();

    expect(adapter.insert).toHaveBeenCalledWith(
      "INSERT INTO `appsmokes` (`name`) VALUES (?)",
      ["Smoke Alpha"]
    );
    expect(model.id).toBe(21);

    model.update({ name: "Smoke Beta" });
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

    const createdMany = await AppSmoke.createMany([
      { name: "Smoke Bulk A" },
      { name: "Smoke Bulk B" },
    ]);
    expect(createdMany).toHaveLength(2);
    expect(createdMany[0].id).toBe(22);
    expect(createdMany[1].id).toBe(23);

    await AppSmoke.updateMany([22, 23], { name: "Smoke Bulk Updated" });
    await AppSmoke.patchMany([
      { id: 22, name: "Smoke Patch A" },
      { id: 23, name: "Smoke Patch B" },
    ]);
    await AppSmoke.deleteMany([22, 23]);
    await AppSmoke.restoreMany([22, 23]);

    const created = await AppSmoke.create({ name: "Smoke Static" });
    expect(created).toBeInstanceOf(AppSmoke);

    adapter.queryOne.mockResolvedValueOnce({ id: 21, name: "Smoke Gamma" });
    const found = await AppSmoke.find(21);
    expect(found).toBeInstanceOf(AppSmoke);
  });

  test("GeoLocalisation supports fill().save().patch() through the Mongo runtime path", async () => {
    const GeoLocalisation = loadGeoLocalisationModel();
    const collection = {
      insertOne: jest
        .fn(async () => ({ insertedId: "mongo-geo-21" }))
        .mockImplementationOnce(async () => ({ insertedId: "mongo-geo-21" }))
        .mockImplementationOnce(async () => ({ insertedId: "mongo-geo-22" }))
        .mockImplementationOnce(async () => ({ insertedId: "mongo-geo-23" }))
        .mockImplementation(async () => ({ insertedId: "mongo-geo-24" })),
      updateOne: jest.fn(async () => ({ matchedCount: 1, modifiedCount: 1 })),
      deleteOne: jest.fn(async () => ({ deletedCount: 1 })),
    };
    const mongoDb = {
      collection: jest.fn(() => collection),
    };
    mockedGetConnection.mockResolvedValue(mongoDb as never);

    const model = new GeoLocalisation();

    model.fill({ name: "Geo Alpha" });
    await model.save();

    expect(collection.insertOne).toHaveBeenCalledWith({ name: "Geo Alpha" });
    expect(model.id).toBe("mongo-geo-21");

    model.update({ name: "Geo Beta" });
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

    const createdMany = await GeoLocalisation.createMany([
      { name: "Geo Bulk A" },
      { name: "Geo Bulk B" },
    ]);
    expect(createdMany).toHaveLength(2);
    expect(createdMany[0].id).toBe("mongo-geo-22");
    expect(createdMany[1].id).toBe("mongo-geo-23");

    await GeoLocalisation.updateMany(["mongo-geo-22", "mongo-geo-23"], { name: "Geo Bulk Updated" });
    await GeoLocalisation.patchMany([
      { id: "mongo-geo-22", name: "Geo Patch A" },
      { id: "mongo-geo-23", name: "Geo Patch B" },
    ]);
    await GeoLocalisation.deleteMany(["mongo-geo-22", "mongo-geo-23"]);
    await GeoLocalisation.restoreMany(["mongo-geo-22", "mongo-geo-23"]);

    const created = await GeoLocalisation.create({ name: "Geo Static" });
    expect(created).toBeInstanceOf(GeoLocalisation);

    const findOne = jest.fn(async () => ({ id: "mongo-geo-21", name: "Geo Found" }));
    mongoDb.collection = jest.fn(() => ({
      ...collection,
      findOne,
    }));
    const found = await GeoLocalisation.find("mongo-geo-21");
    expect(found).toBeInstanceOf(GeoLocalisation);
  });
});

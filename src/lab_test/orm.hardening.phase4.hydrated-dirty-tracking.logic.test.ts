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

describe("ORM hardening phase 4 hydrated dirty tracking", () => {
  const originalDbConnection = process.env.DB_CONNECTION;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.DB_CONNECTION = "mysql";
  });

  afterAll(() => {
    if (originalDbConnection === undefined) {
      delete process.env.DB_CONNECTION;
    } else {
      process.env.DB_CONNECTION = originalDbConnection;
    }
  });

  test("hydrated SQL app models keep save()/patch() no-op behavior for unchanged values", async () => {
    const AppSmoke = loadAppSmokeModel();
    const adapter = makeSqlAdapter();
    adapter.queryOne.mockResolvedValue({
      id: 51,
      name: "Smoke Alpha",
      created_at: "2026-03-14T00:00:00Z",
      updated_at: "2026-03-14T00:00:00Z",
    });
    mockedGetAdapter.mockResolvedValue(adapter as unknown as DriverAdapter);

    const found = (await AppSmoke.findOneBy("name", "Smoke Alpha")) as InstanceType<typeof AppSmoke> &
      Record<string, unknown>;

    found.fill({ name: "Smoke Alpha" });
    await found.save();
    await found.patch({ name: "Smoke Alpha" });
    expect(adapter.execute).not.toHaveBeenCalled();

    found.fill({ name: "Smoke Beta" });
    await found.save();
    expect(adapter.execute).toHaveBeenNthCalledWith(
      1,
      "UPDATE `appsmokes` SET `name` = ? WHERE `id` = ?",
      ["Smoke Beta", 51]
    );

    await found.patch({ name: "Smoke Gamma" });
    expect(adapter.execute).toHaveBeenNthCalledWith(
      2,
      "UPDATE `appsmokes` SET `name` = ? WHERE `id` = ?",
      ["Smoke Gamma", 51]
    );
  });

  test("hydrated Mongo app models keep save()/patch() no-op behavior for unchanged values", async () => {
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
        id: "geo-51",
        name: "Geo Alpha",
        created_at: "2026-03-14T00:00:00Z",
        updated_at: "2026-03-14T00:00:00Z",
      },
    ]);
    mockedGetConnection.mockResolvedValue(mongoDb as never);

    const found = (await GeoLocalisation.findOneBy("name", "Geo Alpha")) as InstanceType<
      typeof GeoLocalisation
    > &
      Record<string, unknown>;

    found.fill({ name: "Geo Alpha" });
    await found.save();
    await found.patch({ name: "Geo Alpha" });
    expect(collection.updateOne).not.toHaveBeenCalled();

    found.fill({ name: "Geo Beta" });
    await found.save();
    expect(collection.updateOne).toHaveBeenNthCalledWith(
      1,
      { $or: [{ id: "geo-51" }, { _id: "geo-51" }] },
      { $set: { name: "Geo Beta" } }
    );

    await found.patch({ name: "Geo Gamma" });
    expect(collection.updateOne).toHaveBeenNthCalledWith(
      2,
      { $or: [{ id: "geo-51" }, { _id: "geo-51" }] },
      { $set: { name: "Geo Gamma" } }
    );
  });
});

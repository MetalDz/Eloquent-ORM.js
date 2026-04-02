import fs from "fs";
import type { DriverAdapter } from "../core/connection/DriverAdapter.js";
import { loadAppModel, resolveAppModelPath } from "./support/appModelResolver.js";
import {
  clearRuntimeConnectionFactoryHarnessCache,
  loadRuntimeConnectionFactoryModule,
} from "./support/runtimeConnectionFactoryHarness.js";

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

function pinGeneratedSqlConnection(filePath: string, connectionName = "mysql"): () => void {
  const original = fs.readFileSync(filePath, "utf8");
  const pinned = original.replace(
    /process\.env\.DB_CONNECTION\s*\?\?\s*"[^"]+"/g,
    `"${connectionName}"`
  );
  fs.writeFileSync(filePath, pinned, "utf8");
  return () => {
    fs.writeFileSync(filePath, original, "utf8");
  };
}

describe("ORM hardening phase 4 hydrated dirty tracking", () => {
  const originalDbConnection = process.env.DB_CONNECTION;
  const originalDisableHooks = process.env.ELOQUENT_DISABLE_MODEL_HOOKS;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.DB_CONNECTION = "mysql";
    process.env.ELOQUENT_DISABLE_MODEL_HOOKS = "true";
    clearRuntimeConnectionFactoryHarnessCache();
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

  test("hydrated SQL app models keep save()/patch() no-op behavior for unchanged values", async () => {
    const runtimeConnectionFactory = loadRuntimeConnectionFactoryModule();
    const adapter = makeSqlAdapter();
    adapter.queryOne.mockResolvedValue({
      id: 51,
      name: "Smoke Alpha",
      created_at: "2026-03-14T00:00:00Z",
      updated_at: "2026-03-14T00:00:00Z",
    });
    runtimeConnectionFactory.getAdapter = jest.fn(
      async () => adapter as unknown as DriverAdapter
    );
    runtimeConnectionFactory.getConnection = jest.fn(
      async () => adapter as unknown as DriverAdapter
    );
    runtimeConnectionFactory.closeAllConnections = jest.fn(async () => undefined);

    const appSmokePath = resolveAppModelPath("AppSmoke");
    const restoreAppSmoke = pinGeneratedSqlConnection(appSmokePath, "mysql");

    try {
      process.env.DB_CONNECTION = "mysql";
      const AppSmoke = loadAppSmokeModel();
      const found = (await AppSmoke.findOneBy("name", "Smoke Alpha")) as InstanceType<
        typeof AppSmoke
      > &
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
    } finally {
      restoreAppSmoke();
    }
  });

  test("hydrated Mongo app models keep save()/patch() no-op behavior for unchanged values", async () => {
    const runtimeConnectionFactory = loadRuntimeConnectionFactoryModule();
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
    runtimeConnectionFactory.getConnection = jest.fn(async () => mongoDb as never);
    runtimeConnectionFactory.getAdapter = jest.fn(async () => {
      throw new Error("Mongo dirty-tracking test should not resolve a SQL adapter.");
    });
    runtimeConnectionFactory.closeAllConnections = jest.fn(async () => undefined);

    process.env.DB_CONNECTION = "mongo";
    const GeoLocalisation = loadGeoLocalisationModel();
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

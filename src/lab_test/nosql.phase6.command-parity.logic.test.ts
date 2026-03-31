import fs from "fs";
import os from "os";
import path from "path";
import { dbConfig } from "../config/database.js";
import { PathMap } from "../cli/utils/PathMap.js";
import { makeModel } from "../cli/commands/makeModel.js";
import { TypeScriptCompiler } from "../cli/utils/typescript/TypeScriptCompiler.js";
import * as tsRuntime from "../cli/utils/typescript/tsRuntime.js";
import * as makeMigrationCommand from "../cli/commands/makeMigration.js";
import { resolveConnectionName } from "../core/connection/resolveConnectionName.js";

jest.mock("chalk", () => ({
  __esModule: true,
  default: new Proxy(
    (value: unknown): string => String(value ?? ""),
    {
      get: () => (value: unknown): string => String(value ?? ""),
      apply: (_target, _thisArg, args: unknown[]) => String(args[0] ?? ""),
    }
  ),
}));

const passthroughChalk = {
  __esModule: true,
  default: {
    gray: (value: string) => value,
    yellow: (value: string) => value,
    cyan: (value: string) => value,
    green: (value: string) => value,
    greenBright: (value: string) => value,
    red: (value: string) => value,
    redBright: (value: string) => value,
  },
};

describe("NoSQL phase 6 command parity", () => {
  const originalConnections = dbConfig.connections;
  const originalDbConnection = process.env.DB_CONNECTION;
  const originalDbTestConnection = process.env.DB_TEST_CONNECTION;

  beforeEach(() => {
    jest.restoreAllMocks();
    dbConfig.connections = { ...originalConnections };
    jest.spyOn(console, "log").mockImplementation(() => undefined);
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
    jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
    jest.clearAllMocks();
    dbConfig.connections = { ...originalConnections };
    if (originalDbConnection === undefined) {
      delete process.env.DB_CONNECTION;
    } else {
      process.env.DB_CONNECTION = originalDbConnection;
    }
    if (originalDbTestConnection === undefined) {
      delete process.env.DB_TEST_CONNECTION;
    } else {
      process.env.DB_TEST_CONNECTION = originalDbTestConnection;
    }
    process.exitCode = 0;
  });

  test("resolveConnectionName keeps explicit mongo/test model targets ahead of generic DB_TEST_CONNECTION", () => {
    (dbConfig.connections as Record<string, { driver?: string }>).mysql = { driver: "mysql" };
    (dbConfig.connections as Record<string, { driver?: string }>).sqlite_test = {
      driver: "sqlite",
    };
    (dbConfig.connections as Record<string, { driver?: string }>).mongo_test = {
      driver: "mongo",
    };

    delete process.env.DB_CONNECTION;
    process.env.DB_TEST_CONNECTION = "sqlite_test";

    expect(resolveConnectionName({ connectionName: "mongo_test" }, { test: true })).toBe(
      "mongo_test"
    );
    expect(resolveConnectionName({ connectionName: "mysql" }, { test: true })).toBe(
      "sqlite_test"
    );
  });

  test("resolveConnectionName keeps explicit mongo runtime targets in test mode", () => {
    (dbConfig.connections as Record<string, { driver?: string }>).mongo = { driver: "mongo" };
    (dbConfig.connections as Record<string, { driver?: string }>).sqlite_test = {
      driver: "sqlite",
    };

    delete process.env.DB_CONNECTION;
    process.env.DB_TEST_CONNECTION = "sqlite_test";

    expect(resolveConnectionName({ connectionName: "mongo" }, { test: true })).toBe("mongo");
  });

  test("resolveConnectionName falls back through configured test connections when DB_TEST_CONNECTION is invalid", () => {
    (dbConfig.connections as Record<string, { driver?: string }>).pg_test = { driver: "pg" };
    (dbConfig.connections as Record<string, { driver?: string }>).mongo_test = {
      driver: "mongo",
    };

    delete process.env.DB_CONNECTION;
    process.env.DB_TEST_CONNECTION = "missing_test";

    expect(resolveConnectionName(undefined, { test: true })).toBe("mysql_test");
  });

  test("resolveConnectionName warns and falls back to mysql for invalid app connection names", () => {
    (dbConfig.connections as Record<string, { driver?: string }>).mysql = { driver: "mysql" };
    delete process.env.DB_CONNECTION;
    delete process.env.DB_TEST_CONNECTION;

    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);

    expect(resolveConnectionName({ connectionName: "missing_connection" })).toBe("mysql");
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Invalid connection "missing_connection"')
    );
  });

  test("make:model --mongo --with-migration routes app/test migrations to mongo targets", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-nosql-phase6-model-"));
    const appModels = path.join(root, "app-models");
    const testModels = path.join(root, "test-models");
    const appMigrations = path.join(root, "app-migrations");
    const testMigrations = path.join(root, "test-migrations");

    fs.mkdirSync(appModels, { recursive: true });
    fs.mkdirSync(testModels, { recursive: true });
    fs.mkdirSync(appMigrations, { recursive: true });
    fs.mkdirSync(testMigrations, { recursive: true });

    (dbConfig.connections as Record<string, { driver?: string }>).mongo = { driver: "mongo" };
    (dbConfig.connections as Record<string, { driver?: string }>).mongo_test = {
      driver: "mongo",
    };
    (dbConfig.connections as Record<string, { driver?: string }>).sqlite_test = {
      driver: "sqlite",
    };
    delete process.env.DB_CONNECTION;
    process.env.DB_TEST_CONNECTION = "sqlite_test";

    jest.spyOn(PathMap, "ensureDirs").mockImplementation(() => undefined);
    jest
      .spyOn(PathMap, "models")
      .mockImplementation((isTest?: boolean) => (isTest ? testModels : appModels));
    jest.spyOn(PathMap, "appMigrations").mockReturnValue(appMigrations);
    jest.spyOn(PathMap, "testMigrations").mockReturnValue(testMigrations);
    jest
      .spyOn(PathMap, "migrations")
      .mockImplementation((_isTest?: boolean, connectionName?: string) => {
        const dir = path.join(root, "connections", String(connectionName ?? "default"));
        fs.mkdirSync(dir, { recursive: true });
        return dir;
      });

    jest.spyOn(TypeScriptCompiler, "compile").mockReturnValue(true);
    jest
      .spyOn(tsRuntime, "loadModule")
      .mockReturnValueOnce({
        GeoLocation: {
          tableName: "geolocations",
          schema: {
            id: { kind: "column", type: "increments" },
            name: { kind: "column", type: "string" },
          },
          connectionName: "mongo",
        },
      } as never)
      .mockReturnValueOnce({
        GeoLocation: {
          tableName: "geolocations",
          schema: {
            id: { kind: "column", type: "increments" },
            name: { kind: "column", type: "string" },
          },
          connectionName: "mongo_test",
        },
      } as never);

    const makeMigrationSpy = jest
      .spyOn(makeMigrationCommand, "makeMigration")
      .mockImplementation(async () => undefined);

    await makeModel("GeoLocation", { mongo: true, withMigration: true, force: true });
    await makeModel("GeoLocation", {
      mongo: true,
      test: true,
      withMigration: true,
      force: true,
    });

    const appModel = fs.readFileSync(path.join(appModels, "GeoLocation.ts"), "utf8");
    const testModel = fs.readFileSync(path.join(testModels, "GeoLocation.ts"), "utf8");

    expect(appModel).toContain("extends MongoModel");
    expect(appModel).toContain('static connectionName = "mongo"');
    expect(testModel).toContain("extends MongoModel");
    expect(testModel).toContain('static connectionName = "mongo_test"');

    expect(makeMigrationSpy).toHaveBeenNthCalledWith(
      1,
      "GeoLocation",
      expect.objectContaining({
        test: false,
        connectionName: "mongo",
        exit: false,
      })
    );
    expect(makeMigrationSpy).toHaveBeenNthCalledWith(
      2,
      "GeoLocation",
      expect.objectContaining({
        test: true,
        connectionName: "mongo_test",
        exit: false,
      })
    );

    fs.rmSync(root, { recursive: true, force: true });
  });

  test("migrate:fresh --mongo --all-migrations regenerates and reruns explicit mongo target", async () => {
    jest.resetModules();

    const drop = jest.fn(async () => undefined);
    const mongoDb = {
      listCollections: jest.fn(() => ({
        toArray: async () => [{ name: "geo_locations" }, { name: "system.profile" }],
      })),
      collection: jest.fn(() => ({
        drop,
      })),
    };

    const getAdapter = jest.fn(async () => ({}));
    const getConnection = jest.fn(async () => mongoDb);
    const closeAllConnections = jest.fn(async () => undefined);
    const migrateRun = jest.fn(async () => undefined);
    const makeMigration = jest.fn(async () => undefined);

    jest.doMock("chalk", () => passthroughChalk);
    jest.doMock("readline", () => ({
      createInterface: () => ({
        question: (_prompt: string, callback: (answer: string) => void) => callback("y"),
        close: jest.fn(),
      }),
    }));
    jest.doMock("../core/connection/ConnectionFactory", () => ({
      getAdapter,
      getConnection,
      closeAllConnections,
    }));
    jest.doMock("../config/database", () => ({
      dbConfig: {
        connections: {
          mongo_test: { driver: "mongo" },
        },
      },
    }));
    jest.doMock("../cli/commands/migrateRun", () => ({
      migrateRun,
    }));
    jest.doMock("../cli/commands/makeMigration", () => ({
      makeMigration,
    }));

    const { migrateFresh } = await import("../cli/commands/migrateFresh.js");

    await migrateFresh({
      test: true,
      force: true,
      allMigrations: true,
      connectionNames: ["mongo_test" as never],
      auditCommand: "mongo-parity-fresh",
    });

    expect(getConnection).toHaveBeenCalledWith("mongo_test");
    expect(getAdapter).not.toHaveBeenCalled();
    expect(drop).toHaveBeenCalledTimes(1);
    expect(makeMigration).toHaveBeenCalledWith("all", {
      test: true,
      connectionName: "mongo_test",
      exit: false,
    });
    expect(migrateRun).toHaveBeenCalledWith(true, undefined, false, false, {
      connectionNames: ["mongo_test"],
      auditCommand: "mongo-parity-fresh",
    });
    expect(closeAllConnections).toHaveBeenCalled();
  });

  test("migrate:reset --mongo delegates full rollback to mongo target", async () => {
    jest.resetModules();

    const migrateRollback = jest.fn(async () => undefined);
    const resolveConnectionName = jest.fn(() => "mongo_test" as never);

    jest.doMock("chalk", () => passthroughChalk);
    jest.doMock("../cli/commands/migrateRollback", () => ({
      migrateRollback,
    }));
    jest.doMock("../core/connection/resolveConnectionName", () => ({
      resolveConnectionName,
    }));

    const { migrateReset } = await import("../cli/commands/migrateReset.js");

    await migrateReset({
      test: true,
      connectionNames: ["mongo_test" as never],
    });

    expect(resolveConnectionName).not.toHaveBeenCalled();
    expect(migrateRollback).toHaveBeenCalledWith({
      test: true,
      connectionNames: ["mongo_test"],
      allMigrations: true,
      step: Number.MAX_SAFE_INTEGER,
      auditCommand: "migrate:reset",
    });
  });
});

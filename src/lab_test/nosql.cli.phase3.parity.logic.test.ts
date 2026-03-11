import fs from "fs";
import os from "os";
import path from "path";
import { dbConfig } from "../config/database";
import { PathMap } from "../cli/utils/PathMap";
import { makeMigration } from "../cli/commands/makeMigration";
import { makeModel } from "../cli/commands/makeModel";
import { makeScenario } from "../cli/commands/makeScenario";
import { SchemaBuilder } from "../core/schema/SchemaBuilder";
import * as tsRuntime from "../cli/utils/typescript/tsRuntime";
import { TypeScriptCompiler } from "../cli/utils/typescript/TypeScriptCompiler";
import { dbSeed } from "../cli/commands/dbSeed";
import { dbSeedFresh } from "../cli/commands/dbSeedFresh";
import * as dbSeedCommand from "../cli/commands/dbSeed";
import * as migrateFreshCommand from "../cli/commands/migrateFresh";
import * as makeMigrationCommand from "../cli/commands/makeMigration";
import * as makeFactoryCommand from "../cli/commands/makeFactory";
import { demoScenario } from "../cli/commands/demoScenario";
import * as connectionFactory from "../core/connection/ConnectionFactory";
import * as resolveConnectionModule from "../core/connection/resolveConnectionName";
import { runSeedBootstrapPrecheck } from "../cli/utils/SeedBootstrapPrecheck";
import { resolveConnectionNamesFromFlags } from "../cli/utils/resolveConnectionFlags";
import { migrateStatus } from "../cli/commands/migrateStatus";
import { migrateRun } from "../cli/commands/migrateRun";
import * as mongoMigrationTracker from "../cli/utils/migrations/MongoMigrationTracker";

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

describe("NoSQL Phase 3 CLI parity", () => {
  const originalConnections = dbConfig.connections;
  const originalDbConnection = process.env.DB_CONNECTION;
  const originalDbTestConnection = process.env.DB_TEST_CONNECTION;
  const originalCliEnv = process.env.ELOQUENT_CLI;

  beforeEach(() => {
    jest.restoreAllMocks();
    process.exitCode = 0;
    delete process.env.ELOQUENT_CLI;
    dbConfig.connections = { ...originalConnections };
    jest.spyOn(console, "log").mockImplementation(() => undefined);
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
    jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.exitCode = 0;
    dbConfig.connections = { ...originalConnections };
    process.env.DB_CONNECTION = originalDbConnection;
    process.env.DB_TEST_CONNECTION = originalDbTestConnection;
    if (originalCliEnv === undefined) {
      delete process.env.ELOQUENT_CLI;
    } else {
      process.env.ELOQUENT_CLI = originalCliEnv;
    }
  });

  test("resolveConnectionNamesFromFlags supports explicit mongo while keeping --all-connections SQL-only", () => {
    (dbConfig.connections as Record<string, { driver?: string }>).mongo = { driver: "mongo" };
    (dbConfig.connections as Record<string, { driver?: string }>).mongo_test = {
      driver: "mongo",
    };

    expect(resolveConnectionNamesFromFlags(false, { mongo: true })).toEqual(["mongo"]);
    expect(resolveConnectionNamesFromFlags(true, { mongo: true })).toEqual(["mongo_test"]);
    expect(resolveConnectionNamesFromFlags(false, { allConnections: true })).toEqual([
      "mysql",
      "pg",
      "sqlite",
    ]);
  });

  test("make:migration generates mongo-compatible migration files", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-nosql-phase3-make-"));
    const modelsDir = path.join(root, "models");
    const migrationsRoot = path.join(root, "migrations");
    fs.mkdirSync(modelsDir, { recursive: true });
    fs.mkdirSync(migrationsRoot, { recursive: true });
    fs.writeFileSync(path.join(modelsDir, "User.ts"), "export class User {}", "utf8");

    (dbConfig.connections as Record<string, { driver?: string }>).mongo_phase3_make = {
      driver: "mongo",
    };

    jest.spyOn(PathMap, "ensureDirs").mockImplementation(() => undefined);
    jest.spyOn(PathMap, "models").mockReturnValue(modelsDir);
    jest.spyOn(PathMap, "appMigrations").mockReturnValue(migrationsRoot);
    jest.spyOn(PathMap, "testMigrations").mockReturnValue(migrationsRoot);
    jest
      .spyOn(PathMap, "migrations")
      .mockImplementation((_isTest?: boolean, connectionName?: string) => {
        const dir = path.join(migrationsRoot, String(connectionName ?? "default"));
        fs.mkdirSync(dir, { recursive: true });
        return dir;
      });
    jest.spyOn(TypeScriptCompiler, "compile").mockReturnValue(true);
    jest.spyOn(tsRuntime, "loadModule").mockReturnValue({
      User: {
        tableName: "users",
        schema: {
          id: { kind: "column", type: "increments" },
        },
      },
    });

    const schemaSpy = jest.spyOn(SchemaBuilder, "toCreateSQL");

    await makeMigration("User", {
      connectionName: "mongo_phase3_make" as never,
      exit: false,
    });

    expect(schemaSpy).not.toHaveBeenCalled();
    const generatedDir = path.join(migrationsRoot, "mongo_phase3_make");
    const generatedFile = fs
      .readdirSync(generatedDir)
      .find((name) => name.includes("_create_users_table.ts"));
    expect(generatedFile).toBeDefined();
    const content = fs.readFileSync(path.join(generatedDir, generatedFile!), "utf8");
    expect(content).toContain("db.ensureCollection");
    expect(content).not.toContain("id_pk_unique");

    fs.rmSync(root, { recursive: true, force: true });
  });

  test("make:model --mongo generates MongoModel scaffold for app and test", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-nosql-phase3-model-"));
    const appModels = path.join(root, "app-models");
    const testModels = path.join(root, "test-models");
    const migrationsRoot = path.join(root, "migrations");
    fs.mkdirSync(appModels, { recursive: true });
    fs.mkdirSync(testModels, { recursive: true });
    fs.mkdirSync(migrationsRoot, { recursive: true });

    jest.spyOn(PathMap, "ensureDirs").mockImplementation(() => undefined);
    jest
      .spyOn(PathMap, "models")
      .mockImplementation((isTest?: boolean) => (isTest ? testModels : appModels));
    jest.spyOn(PathMap, "appMigrations").mockReturnValue(migrationsRoot);
    jest.spyOn(PathMap, "testMigrations").mockReturnValue(migrationsRoot);

    await makeModel("GeoLocation", { mongo: true, force: true });
    await makeModel("GeoLocation", { mongo: true, test: true, force: true });

    const appModel = fs.readFileSync(path.join(appModels, "GeoLocation.ts"), "utf8");
    const testModel = fs.readFileSync(path.join(testModels, "GeoLocation.ts"), "utf8");

    expect(appModel).toContain("extends MongoModel");
    expect(appModel).toContain('static connectionName = "mongo"');
    expect(testModel).toContain("extends MongoModel");
    expect(testModel).toContain('static connectionName = "mongo_test"');

    fs.rmSync(root, { recursive: true, force: true });
  });

  test("make:scenario --test --mongo routes migration/refresh/seed to mongo_test", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-nosql-phase3-scenario-"));
    const modelsDir = path.join(root, "models");
    const factoriesDir = path.join(root, "factories");
    const seedsDir = path.join(root, "seeds");
    const migrationsRoot = path.join(root, "migrations");
    fs.mkdirSync(modelsDir, { recursive: true });
    fs.mkdirSync(factoriesDir, { recursive: true });
    fs.mkdirSync(seedsDir, { recursive: true });
    fs.mkdirSync(migrationsRoot, { recursive: true });

    jest.spyOn(PathMap, "ensureDirs").mockImplementation(() => undefined);
    jest.spyOn(PathMap, "models").mockReturnValue(modelsDir);
    jest.spyOn(PathMap, "factories").mockReturnValue(factoriesDir);
    jest.spyOn(PathMap, "seeds").mockReturnValue(seedsDir);
    jest.spyOn(PathMap, "appMigrations").mockReturnValue(migrationsRoot);
    jest.spyOn(PathMap, "testMigrations").mockReturnValue(migrationsRoot);
    jest
      .spyOn(PathMap, "migrations")
      .mockImplementation((_isTest?: boolean, connectionName?: string) => {
        const dir = path.join(migrationsRoot, String(connectionName ?? "default"));
        fs.mkdirSync(dir, { recursive: true });
        return dir;
      });

    jest
      .spyOn(makeFactoryCommand, "makeFactory")
      .mockImplementation(async () => undefined);
    const makeMigrationSpy = jest
      .spyOn(makeMigrationCommand, "makeMigration")
      .mockImplementation(async () => undefined);
    const migrateFreshSpy = jest
      .spyOn(migrateFreshCommand, "migrateFresh")
      .mockImplementation(async () => undefined);
    const dbSeedSpy = jest
      .spyOn(dbSeedCommand, "dbSeed")
      .mockImplementation(async () => undefined);

    await makeScenario("blog", {
      test: true,
      mongo: true,
      run: true,
      force: true,
    });

    expect(makeMigrationSpy).toHaveBeenCalledWith(
      "all",
      expect.objectContaining({
        test: true,
        exit: false,
        connectionName: "mongo_test",
      })
    );
    expect(migrateFreshSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        test: true,
        force: true,
        connectionNames: ["mongo_test"],
      })
    );
    expect(dbSeedSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        test: true,
        class: "BlogScenarioSeeder",
        connectionNames: ["mongo_test"],
      })
    );

    const userModel = fs.readFileSync(path.join(modelsDir, "User.ts"), "utf8");
    expect(userModel).toContain("extends MongoModel");
    expect(userModel).toContain('static connectionName = "mongo_test"');

    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(path.resolve(process.cwd(), "src/test/.eloquent-scenario.json"), {
      force: true,
    });
  });

  test("make:scenario --test (without --mongo) uses resolved DB_TEST_CONNECTION target", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-nosql-phase3-scenario-sql-"));
    const modelsDir = path.join(root, "models");
    const factoriesDir = path.join(root, "factories");
    const seedsDir = path.join(root, "seeds");
    const migrationsRoot = path.join(root, "migrations");
    fs.mkdirSync(modelsDir, { recursive: true });
    fs.mkdirSync(factoriesDir, { recursive: true });
    fs.mkdirSync(seedsDir, { recursive: true });
    fs.mkdirSync(migrationsRoot, { recursive: true });

    jest.spyOn(PathMap, "ensureDirs").mockImplementation(() => undefined);
    jest.spyOn(PathMap, "models").mockReturnValue(modelsDir);
    jest.spyOn(PathMap, "factories").mockReturnValue(factoriesDir);
    jest.spyOn(PathMap, "seeds").mockReturnValue(seedsDir);
    jest.spyOn(PathMap, "appMigrations").mockReturnValue(migrationsRoot);
    jest.spyOn(PathMap, "testMigrations").mockReturnValue(migrationsRoot);
    jest
      .spyOn(PathMap, "migrations")
      .mockImplementation((_isTest?: boolean, connectionName?: string) => {
        const dir = path.join(migrationsRoot, String(connectionName ?? "default"));
        fs.mkdirSync(dir, { recursive: true });
        return dir;
      });

    jest
      .spyOn(resolveConnectionModule, "resolveConnectionName")
      .mockReturnValue("sqlite_test" as never);
    jest
      .spyOn(makeFactoryCommand, "makeFactory")
      .mockImplementation(async () => undefined);
    const makeMigrationSpy = jest
      .spyOn(makeMigrationCommand, "makeMigration")
      .mockImplementation(async () => undefined);
    const migrateFreshSpy = jest
      .spyOn(migrateFreshCommand, "migrateFresh")
      .mockImplementation(async () => undefined);
    const dbSeedSpy = jest
      .spyOn(dbSeedCommand, "dbSeed")
      .mockImplementation(async () => undefined);

    await makeScenario("blog", {
      test: true,
      run: true,
      force: true,
    });

    expect(makeMigrationSpy).toHaveBeenCalledWith(
      "all",
      expect.objectContaining({
        test: true,
        exit: false,
        connectionName: "sqlite_test",
      })
    );
    expect(migrateFreshSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        test: true,
        force: true,
        connectionNames: ["sqlite_test"],
      })
    );
    expect(dbSeedSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        test: true,
        class: "BlogScenarioSeeder",
        connectionNames: ["sqlite_test"],
      })
    );

    const userModel = fs.readFileSync(path.join(modelsDir, "User.ts"), "utf8");
    expect(userModel).toContain("extends SqlModel");
    expect(userModel).toContain('process.env.DB_CONNECTION ?? "sqlite_test"');

    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(path.resolve(process.cwd(), "src/test/.eloquent-scenario.json"), {
      force: true,
    });
  });

  test("db:seed and db:seed:fresh keep explicit mongo connection routing", async () => {
    const seen: string[] = [];

    jest.spyOn(PathMap, "seeds").mockReturnValue("virtual-seeds");
    jest.spyOn(fs, "existsSync").mockReturnValue(true);
    jest
      .spyOn(fs, "readdirSync")
      .mockReturnValue(["MongoSeeder.ts"] as unknown as ReturnType<typeof fs.readdirSync>);
    jest.spyOn(tsRuntime, "loadModule").mockReturnValue({
      MongoSeeder: async () => {
        seen.push(`seed:${process.env.DB_CONNECTION}`);
      },
    });

    await dbSeed({
      class: "MongoSeeder",
      connectionNames: ["mongo" as never],
      close: false,
      exit: false,
    });

    jest
      .spyOn(migrateFreshCommand, "migrateFresh")
      .mockImplementation(async () => {
        seen.push(`fresh:${process.env.DB_CONNECTION}`);
      });
    jest
      .spyOn(dbSeedCommand, "dbSeed")
      .mockImplementation(async () => {
        seen.push(`seed_fresh:${process.env.DB_CONNECTION}`);
      });
    jest
      .spyOn(connectionFactory, "closeAllConnections")
      .mockImplementation(async () => undefined);

    await dbSeedFresh({
      connectionNames: ["mongo" as never],
      force: true,
    });

    expect(seen).toEqual(["seed:mongo", "fresh:mongo", "seed_fresh:mongo"]);
  });

  test("demo:scenario and precheck use mongo runtime path (no SQL adapter)", async () => {
    (dbConfig.connections as Record<string, { driver?: string }>).mongo = {
      driver: "mongo",
    };

    const usersCollection = {
      countDocuments: jest.fn(async () => 1),
      findOne: jest.fn(async () => ({ id: 1, _id: "mongo-id" })),
      find: jest.fn(() => ({
        limit: () => ({
          toArray: async () => [{ id: 101 }],
        }),
      })),
      aggregate: jest.fn(() => ({
        toArray: async () => [{ id: 1, _id: "mongo-id" }],
      })),
    };
    const postsCollection = {
      countDocuments: jest.fn(async () => 1),
      find: jest.fn(() => ({
        limit: () => ({
          toArray: async () => [{ id: 101 }],
        }),
      })),
    };
    const commentsCollection = {
      countDocuments: jest.fn(async () => 1),
      find: jest.fn(() => ({
        limit: () => ({
          toArray: async () => [],
        }),
      })),
    };
    const pivotCollection = {
      countDocuments: jest.fn(async () => 1),
      find: jest.fn(() => ({
        limit: () => ({
          toArray: async () => [{ post_id: 101 }],
        }),
      })),
    };
    const db = {
      collection: jest.fn((name: string) => {
        if (name === "users") return usersCollection;
        if (name === "posts") return postsCollection;
        if (name === "comments") return commentsCollection;
        return pivotCollection;
      }),
    };

    jest
      .spyOn(resolveConnectionModule, "resolveConnectionName")
      .mockReturnValue("mongo" as never);
    const getConnectionSpy = jest
      .spyOn(connectionFactory, "getConnection")
      .mockResolvedValue(db as never);
    const getAdapterSpy = jest
      .spyOn(connectionFactory, "getAdapter")
      .mockResolvedValue({} as never);
    jest
      .spyOn(connectionFactory, "closeAllConnections")
      .mockImplementation(async () => undefined);

    await demoScenario({ random: true });

    expect(getConnectionSpy).toHaveBeenCalledWith("mongo");
    expect(getAdapterSpy).not.toHaveBeenCalled();

    const precheck = await runSeedBootstrapPrecheck({
      connectionNames: ["mongo" as never],
    });
    expect(precheck.clean).toBe(true);
  });

  test("status/run execute mongo migration flow without SQL adapter path", async () => {
    const connectionName = "mongo_phase3_migrate";
    (dbConfig.connections as Record<
      string,
      { driver?: string; uri?: string; database?: string }
    >)[connectionName] = {
      driver: "mongo",
      uri: "mongodb://localhost:27017",
      database: "phase3_test",
    };

    const root = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-nosql-phase3-migrate-"));
    const migrationsDir = path.join(root, connectionName);
    fs.mkdirSync(migrationsDir, { recursive: true });
    fs.writeFileSync(
      path.join(migrationsDir, "20260310000000001_create_users_table.ts"),
      "export async function up() {}",
      "utf8"
    );

    jest
      .spyOn(PathMap, "migrations")
      .mockImplementation((_isTest?: boolean, connection?: string) =>
        path.join(root, String(connection ?? "default"))
      );
    const adapterSpy = jest
      .spyOn(connectionFactory, "getAdapter")
      .mockResolvedValue({} as never);
    const getConnectionSpy = jest
      .spyOn(connectionFactory, "getConnection")
      .mockResolvedValue({} as never);
    jest
      .spyOn(connectionFactory, "closeAllConnections")
      .mockImplementation(async () => undefined);
    jest
      .spyOn(mongoMigrationTracker, "ensureMigrationCollection")
      .mockResolvedValue(undefined);
    jest
      .spyOn(mongoMigrationTracker, "readAppliedMigrations")
      .mockResolvedValue([]);
    jest
      .spyOn(mongoMigrationTracker, "validateMigrationHistory")
      .mockResolvedValue([]);
    jest
      .spyOn(mongoMigrationTracker, "readLastBatch")
      .mockResolvedValue(0);
    jest
      .spyOn(mongoMigrationTracker, "recordAppliedMigration")
      .mockResolvedValue(undefined);
    jest
      .spyOn(mongoMigrationTracker, "acquireMigrationLock")
      .mockResolvedValue(undefined);
    jest
      .spyOn(mongoMigrationTracker, "releaseMigrationLock")
      .mockResolvedValue(undefined);

    await migrateStatus({
      connectionNames: [connectionName as never],
    });
    await migrateRun(false, undefined, false, false, {
      connectionNames: [connectionName as never],
    });

    expect(adapterSpy).not.toHaveBeenCalled();
    expect(getConnectionSpy).toHaveBeenCalledTimes(2);

    fs.rmSync(root, { recursive: true, force: true });
  });
});

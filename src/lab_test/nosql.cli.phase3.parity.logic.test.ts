import fs from "fs";
import os from "os";
import path from "path";
import { dbConfig } from "../config/database";
import { PathMap } from "../cli/utils/PathMap";
import { makeMigration } from "../cli/commands/makeMigration";
import { SchemaBuilder } from "../core/schema/SchemaBuilder";
import * as tsRuntime from "../cli/utils/typescript/tsRuntime";
import { TypeScriptCompiler } from "../cli/utils/typescript/TypeScriptCompiler";
import { dbSeed } from "../cli/commands/dbSeed";
import { dbSeedFresh } from "../cli/commands/dbSeedFresh";
import * as dbSeedCommand from "../cli/commands/dbSeed";
import * as migrateFreshCommand from "../cli/commands/migrateFresh";
import { demoScenario } from "../cli/commands/demoScenario";
import * as connectionFactory from "../core/connection/ConnectionFactory";
import * as resolveConnectionModule from "../core/connection/resolveConnectionName";
import { runSeedBootstrapPrecheck } from "../cli/utils/SeedBootstrapPrecheck";
import { resolveConnectionNamesFromFlags } from "../cli/utils/resolveConnectionFlags";
import { migrateStatus } from "../cli/commands/migrateStatus";
import { migrateRun } from "../cli/commands/migrateRun";

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

  test("make:migration skips mongo with actionable non-SQL warning", async () => {
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

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('Skipping make:migration for "mongo_phase3_make"')
    );
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("non-SQL"));
    expect(schemaSpy).not.toHaveBeenCalled();

    fs.rmSync(root, { recursive: true, force: true });
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

  test("status/run SQL-only commands provide actionable mongo skip warnings", async () => {
    const connectionName = "mongo_phase3_migrate";
    (dbConfig.connections as Record<string, { driver?: string }>)[connectionName] = {
      driver: "mongo",
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
    jest
      .spyOn(connectionFactory, "closeAllConnections")
      .mockImplementation(async () => undefined);

    await migrateStatus({
      connectionNames: [connectionName as never],
    });
    await migrateRun(false, undefined, false, false, {
      connectionNames: [connectionName as never],
    });

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("db:seed:precheck")
    );
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("db:seed:fresh, or demo:scenario")
    );
    expect(adapterSpy).not.toHaveBeenCalled();

    fs.rmSync(root, { recursive: true, force: true });
  });
});

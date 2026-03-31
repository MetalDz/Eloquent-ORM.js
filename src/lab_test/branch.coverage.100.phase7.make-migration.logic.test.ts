import fs from "fs";
import os from "os";
import path from "path";
import { column, type SchemaField } from "../core/schema/SchemaBlueprint.js";

describe("Branch coverage 100% - phase 7 makeMigration edge paths", () => {
  const passthroughChalk = {
    __esModule: true,
    default: {
      blue: (v: string) => v,
      blueBright: (v: string) => v,
      green: (v: string) => v,
      greenBright: (v: string) => v,
      yellow: (v: string) => v,
      red: (v: string) => v,
      redBright: (v: string) => v,
      cyan: (v: string) => v,
      cyanBright: (v: string) => v,
      gray: (v: string) => v,
    },
  };

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
    jest.clearAllMocks();
  });

  function setupMakeMigrationContext() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-phase7-make-migration-"));
    const modelsDir = path.join(root, "models");
    const migrationsRoot = path.join(root, "migrations-root");
    fs.mkdirSync(modelsDir, { recursive: true });
    fs.mkdirSync(migrationsRoot, { recursive: true });

    const compile = jest.fn(() => true);
    const loadModule = jest.fn();
    const resolveConnectionName = jest.fn(() => "pg_test");
    const closeAllConnections = jest.fn(async () => undefined);
    const toCreateSQL = jest.fn(
      async (
        tableName: string
      ): Promise<{
        mainSQL: string;
        extraTables: string[];
        rollbackMainSQL: string;
        rollbackExtraTables: string[];
      }> => ({
        mainSQL: `CREATE TABLE ${tableName} (id INT);`,
        extraTables: [],
        rollbackMainSQL: `DROP TABLE IF EXISTS ${tableName};`,
        rollbackExtraTables: [],
      })
    );

    jest.doMock("chalk", () => passthroughChalk);
    jest.doMock("../cli/utils/PathMap", () => ({
      PathMap: {
        ensureDirs: () => undefined,
        models: () => modelsDir,
        testMigrations: (connectionName?: string) =>
          connectionName ? path.join(migrationsRoot, connectionName) : migrationsRoot,
        appMigrations: (connectionName?: string) =>
          connectionName
            ? path.join(root, "app-migrations", connectionName)
            : path.join(root, "app-migrations"),
        migrations: (_isTest: boolean, connectionName?: string) =>
          connectionName ? path.join(migrationsRoot, connectionName) : migrationsRoot,
      },
    }));
    jest.doMock("../cli/utils/typescript/TypeScriptCompiler", () => ({
      TypeScriptCompiler: { compile },
    }));
    jest.doMock("../cli/utils/typescript/tsRuntime", () => ({
      loadModule,
    }));
    jest.doMock("../core/connection/resolveConnectionName", () => ({
      resolveConnectionName,
    }));
    jest.doMock("../core/connection/ConnectionFactory", () => ({
      closeAllConnections,
    }));
    jest.doMock("../core/schema/SchemaBuilder", () => ({
      SchemaBuilder: { toCreateSQL },
    }));

    return {
      root,
      modelsDir,
      migrationsRoot,
      compile,
      loadModule,
      resolveConnectionName,
      closeAllConnections,
      toCreateSQL,
    };
  }

  test("continues processing when one model module throws during load", async () => {
    const ctx = setupMakeMigrationContext();
    fs.writeFileSync(path.join(ctx.modelsDir, "User.ts"), "export class User {}", "utf8");
    fs.writeFileSync(path.join(ctx.modelsDir, "Broken.ts"), "export class Broken {}", "utf8");

    ctx.loadModule.mockImplementation((modulePath: string) => {
      if (modulePath.endsWith("Broken.ts")) {
        throw new Error("broken module");
      }
      return {
        User: {
          tableName: "users",
          schema: {
            id: column("increments", undefined, { primary: true }),
          } satisfies Record<string, SchemaField>,
        },
      };
    });

    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    const { makeMigration } = await import("../cli/commands/makeMigration.js");
    await expect(makeMigration("all", { test: true, exit: false })).rejects.toThrow(
      "Broken.ts"
    );

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("Error processing Broken.ts:"));
    fs.rmSync(ctx.root, { recursive: true, force: true });
  });

  test("handles missing models folder and TS-compile skip branches", async () => {
    const ctx = setupMakeMigrationContext();
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    const { makeMigration } = await import("../cli/commands/makeMigration.js");

    fs.rmSync(ctx.modelsDir, { recursive: true, force: true });
    await makeMigration("User", { test: true, exit: false });
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("Models folder not found"));

    fs.mkdirSync(ctx.modelsDir, { recursive: true });
    fs.writeFileSync(path.join(ctx.modelsDir, "User.ts"), "export class User {}", "utf8");
    ctx.compile.mockReturnValue(false);
    await makeMigration("User", { test: true, exit: false });
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Skipping migration due to TS error in User.ts")
    );

    fs.rmSync(ctx.root, { recursive: true, force: true });
  });

  test("covers pivot migration generation, unchanged pivot detection, and close-warning fallback", async () => {
    const ctx = setupMakeMigrationContext();
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
    fs.writeFileSync(path.join(ctx.modelsDir, "User.ts"), "export class User {}", "utf8");

    ctx.loadModule.mockReturnValue({
      User: {
        tableName: "users",
        softDeletes: true,
        schema: {
          id: column("increments", undefined, { primary: true }),
          deleted_at: { kind: "mixin", name: "SoftDeletes" },
        } satisfies Record<string, SchemaField>,
      },
    });
    ctx.toCreateSQL.mockResolvedValue({
      mainSQL: "CREATE TABLE users (id INT);",
      extraTables: ["CREATE TABLE user_role (user_id INT);"],
      rollbackMainSQL: "DROP TABLE IF EXISTS users;",
      rollbackExtraTables: ["DROP TABLE IF EXISTS user_role;"],
    });
    ctx.closeAllConnections.mockRejectedValue(new Error("close fail"));

    const { makeMigration } = await import("../cli/commands/makeMigration.js");
    await makeMigration("User", { test: true, pivotSeparate: true, exit: false });
    await makeMigration("User", { test: true, pivotSeparate: true, exit: false });

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("Pivot migration saved"));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("Pivot migration unchanged"));
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Could not close DB connections cleanly")
    );
    fs.rmSync(ctx.root, { recursive: true, force: true });
  });

  test("includes rollback extra-table SQL when pivotSeparate is disabled", async () => {
    const ctx = setupMakeMigrationContext();
    fs.writeFileSync(path.join(ctx.modelsDir, "User.ts"), "export class User {}", "utf8");
    ctx.loadModule.mockReturnValue({
      User: {
        tableName: "users",
        schema: {
          id: column("increments", undefined, { primary: true }),
        } satisfies Record<string, SchemaField>,
      },
    });
    ctx.toCreateSQL.mockResolvedValue({
      mainSQL: "ALTER TABLE users ADD COLUMN x INT;",
      extraTables: ["CREATE TABLE user_role (user_id INT);"],
      rollbackMainSQL: "ALTER TABLE users DROP COLUMN x;",
      rollbackExtraTables: ["DROP TABLE IF EXISTS user_role;"],
    });

    const { makeMigration } = await import("../cli/commands/makeMigration.js");
    await makeMigration("User", { test: true, pivotSeparate: false, exit: false });

    const migrationDir = path.join(ctx.migrationsRoot, "pg_test");
    const updateFile = fs
      .readdirSync(migrationDir)
      .find((fileName) => fileName.includes("update_users_table.ts"));
    expect(updateFile).toBeDefined();
    const content = fs.readFileSync(path.join(migrationDir, updateFile!), "utf8");
    expect(content).toContain("DROP TABLE IF EXISTS user_role;");

    fs.rmSync(ctx.root, { recursive: true, force: true });
  });

  test("covers second-stage SQL processing catch and unchanged-body path with missing prior file", async () => {
    const ctx = setupMakeMigrationContext();
    fs.writeFileSync(path.join(ctx.modelsDir, "User.ts"), "export class User {}", "utf8");
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    const { makeMigration } = await import("../cli/commands/makeMigration.js");

    ctx.loadModule.mockReturnValue({
      User: {
        tableName: "users",
        schema: {
          id: column("increments", undefined, { primary: true }),
        } satisfies Record<string, SchemaField>,
      },
    });

    ctx.toCreateSQL.mockRejectedValueOnce(new Error("sql-stage-failure"));
    await expect(makeMigration("User", { test: true, exit: false })).rejects.toThrow(
      "User.ts"
    );
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("Error processing User.ts:"));

    ctx.toCreateSQL.mockResolvedValue({
      mainSQL: "CREATE TABLE users (id INT);",
      extraTables: [],
      rollbackMainSQL: "DROP TABLE IF EXISTS users;",
      rollbackExtraTables: [],
    });
    const migrationDir = path.join(ctx.migrationsRoot, "pg_test");
    const originalReaddirSync = fs.readdirSync;
    jest.spyOn(fs as any, "readdirSync").mockImplementation((target: any) => {
      const normalized = path.resolve(String(target));
      if (normalized === path.resolve(migrationDir)) {
        return ["19990101010101001_create_users_table.ts"] as unknown as ReturnType<
          typeof fs.readdirSync
        >;
      }
      return originalReaddirSync(target);
    });

    await makeMigration("User", { test: true, exit: false });
    const generated = fs
      .readdirSync(migrationDir)
      .filter((fileName) => fileName.includes("create_users_table.ts"));
    expect(generated.length).toBeGreaterThanOrEqual(1);

    fs.rmSync(ctx.root, { recursive: true, force: true });
  });
});

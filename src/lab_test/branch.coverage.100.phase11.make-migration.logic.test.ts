import fs from "fs";
import os from "os";
import path from "path";
import { column, relation, type SchemaField } from "../core/schema/SchemaBlueprint.js";

describe("Branch coverage 100% - phase 11 makeMigration deep edge paths", () => {
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

  function setupContext() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-phase11-make-migration-"));
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
        tableName: string,
        _schema: Record<string, SchemaField>,
        _driver: string,
        _isUpdate: boolean
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

  test("covers empty all-models and missing specific model branches", async () => {
    const ctx = setupContext();
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
    const { makeMigration } = await import("../cli/commands/makeMigration.js");

    await makeMigration("all", { test: true, exit: false });
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("No model files found"));

    await makeMigration("Ghost", { test: true, exit: false });
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("Model not found"));

    fs.rmSync(ctx.root, { recursive: true, force: true });
  });

  test("covers no-schema skip and no-op SQL skip branches", async () => {
    const ctx = setupContext();
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
    fs.writeFileSync(path.join(ctx.modelsDir, "User.ts"), "export class User {}", "utf8");

    ctx.loadModule.mockReturnValueOnce({
      User: {
        tableName: "users",
      },
    });

    const { makeMigration } = await import("../cli/commands/makeMigration.js");
    await makeMigration("User", { test: true, exit: false });
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("No schema found in User"));

    ctx.loadModule.mockReturnValueOnce({
      User: {
        tableName: "users",
        schema: {
          id: column("increments", undefined, { primary: true }),
        } satisfies Record<string, SchemaField>,
      },
    });
    ctx.toCreateSQL.mockResolvedValueOnce({
      mainSQL: "   ",
      extraTables: [],
      rollbackMainSQL: "",
      rollbackExtraTables: [],
    });

    await makeMigration("User", { test: true, exit: false });
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("No new columns or schema changes - skipping")
    );

    fs.rmSync(ctx.root, { recursive: true, force: true });
  });

  test("covers belongsTo dependency ordering in all-model mode", async () => {
    const ctx = setupContext();
    fs.writeFileSync(path.join(ctx.modelsDir, "User.ts"), "export class User {}", "utf8");
    fs.writeFileSync(path.join(ctx.modelsDir, "Post.ts"), "export class Post {}", "utf8");

    ctx.loadModule.mockImplementation((modulePath: string) => {
      if (modulePath.endsWith("Post.ts")) {
        return {
          Post: {
            tableName: "posts",
            schema: {
              id: column("increments", undefined, { primary: true }),
              user: relation("belongsTo", "User"),
            } satisfies Record<string, SchemaField>,
          },
        };
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

    const { makeMigration } = await import("../cli/commands/makeMigration.js");
    await makeMigration("all", { test: true, exit: false });

    const orderedTables = ctx.toCreateSQL.mock.calls.map((args) => args[0]);
    expect(orderedTables.indexOf("users")).toBeLessThan(orderedTables.indexOf("posts"));

    fs.rmSync(ctx.root, { recursive: true, force: true });
  });

  test("covers missing previous update file in body compare and default process exit branch", async () => {
    const ctx = setupContext();
    fs.writeFileSync(path.join(ctx.modelsDir, "User.ts"), "export class User {}", "utf8");

    ctx.loadModule.mockReturnValue({
      User: {
        tableName: "users",
        schema: {
          id: column("increments", undefined, { primary: true }),
          name: column("string"),
        } satisfies Record<string, SchemaField>,
      },
    });

    ctx.toCreateSQL.mockResolvedValue({
      mainSQL: "ALTER TABLE users ADD COLUMN name VARCHAR(255);",
      extraTables: [],
      rollbackMainSQL: "ALTER TABLE users DROP COLUMN name;",
      rollbackExtraTables: [],
    });

    const migrationDir = path.join(ctx.migrationsRoot, "pg_test");
    const originalReaddirSync = fs.readdirSync;
    jest.spyOn(fs as any, "readdirSync").mockImplementation((target: any) => {
      const resolved = path.resolve(String(target));
      if (resolved === path.resolve(migrationDir)) {
        return ["19990101010101001_update_users_table.ts"] as unknown as ReturnType<
          typeof fs.readdirSync
        >;
      }
      return originalReaddirSync(target);
    });

    const exitSpy = jest
      .spyOn(process, "exit")
      .mockImplementation(((code?: number) => {
        throw new Error(`exit:${String(code)}`);
      }) as never);

    const { makeMigration } = await import("../cli/commands/makeMigration.js");
    await expect(makeMigration("User", { test: true })).rejects.toThrow("exit:0");
    expect(exitSpy).toHaveBeenCalledWith(0);

    const updates = fs
      .readdirSync(migrationDir)
      .filter((fileName) => fileName.includes("update_users_table.ts"));
    expect(updates.length).toBeGreaterThanOrEqual(1);

    fs.rmSync(ctx.root, { recursive: true, force: true });
  });
});

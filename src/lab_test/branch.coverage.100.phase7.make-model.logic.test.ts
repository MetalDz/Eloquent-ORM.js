import fs from "fs";
import os from "os";
import path from "path";
import { column, type SchemaField } from "../core/schema/SchemaBlueprint";

describe("Branch coverage 100% - phase 7 makeModel edge paths", () => {
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

  function setupMakeModelContext() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-phase7-make-model-"));
    const modelsDir = path.join(root, "models");
    const migrationsRoot = path.join(root, "migrations-root");
    fs.mkdirSync(modelsDir, { recursive: true });
    fs.mkdirSync(migrationsRoot, { recursive: true });

    const compile = jest.fn(() => true);
    const loadModule = jest.fn();
    const resolveConnectionName = jest.fn(() => "pg_test");
    const closeAllConnections = jest.fn(async () => undefined);
    const toCreateSQL = jest.fn(
      async (): Promise<{
        mainSQL: string;
        extraTables: string[];
        rollbackMainSQL: string;
        rollbackExtraTables: string[];
      }> => ({
        mainSQL: 'CREATE TABLE "users" ("id" INT);',
        extraTables: [],
        rollbackMainSQL: 'DROP TABLE IF EXISTS "users";',
        rollbackExtraTables: [],
      })
    );

    const templateLoad = jest.fn(() => "template");
    const templateRender = jest.fn((_tpl: string, data: Record<string, unknown>) => {
      return `export interface ${String(data.ModelName)}Attrs {\n${String(data.attrsTypeBody ?? "")}\n}\n`;
    });
    const templateSave = jest.fn((filePath: string, content: string) => {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, content, "utf8");
    });

    jest.doMock("chalk", () => passthroughChalk);
    jest.doMock("../cli/utils/PathMap", () => ({
      PathMap: {
        ensureDirs: () => undefined,
        models: () => modelsDir,
        testMigrations: (connectionName?: string) =>
          connectionName ? path.join(migrationsRoot, connectionName) : migrationsRoot,
        appMigrations: (connectionName?: string) =>
          connectionName ? path.join(root, "app-migrations", connectionName) : path.join(root, "app-migrations"),
        migrations: (_isTest: boolean, connectionName?: string) =>
          connectionName ? path.join(migrationsRoot, connectionName) : migrationsRoot,
      },
    }));
    jest.doMock("../cli/utils/TemplateEngine", () => ({
      TemplateEngine: {
        load: templateLoad,
        render: templateRender,
        save: templateSave,
      },
    }));
    jest.doMock("../cli/utils/ImportResolver", () => ({
      ImportResolver: {
        coreImportPath: () => "../../core",
        schemaImportPath: () => "../../core/schema",
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
      templateLoad,
      templateRender,
      templateSave,
    };
  }

  test("handles template rendering failures cleanly", async () => {
    const ctx = setupMakeModelContext();
    ctx.templateLoad.mockImplementation(() => {
      throw new Error("template missing");
    });

    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    const { makeModel } = await import("../cli/commands/makeModel");

    await makeModel("User", { test: true, force: true });

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("Error rendering model template:"),
      expect.any(Error)
    );
    fs.rmSync(ctx.root, { recursive: true, force: true });
  });

  test("covers attrs inference branches for timestamps/softDeletes, compile failure, schema missing, and inference errors", async () => {
    const ctx = setupMakeModelContext();
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    const { makeModel } = await import("../cli/commands/makeModel");

    ctx.compile.mockReturnValue(true);
    ctx.loadModule.mockReturnValue({
      User: {
        tableName: "users",
        schema: {
          audit: { kind: "column", type: "timestamps", options: {} },
          recycle: { kind: "column", type: "softDeletes", options: {} },
        } satisfies Record<string, SchemaField>,
      },
    });
    await makeModel("User", { test: true, attrsFromSchema: true, force: true });
    const userModelPath = path.join(ctx.modelsDir, "User.ts");
    const inferredContent = fs.readFileSync(userModelPath, "utf8");
    expect(inferredContent).toContain("created_at?: string | Date | null;");
    expect(inferredContent).toContain("updated_at?: string | Date | null;");
    expect(inferredContent).toContain("deleted_at?: string | Date | null;");

    ctx.compile.mockReturnValue(false);
    await makeModel("User", { test: true, attrsFromSchema: true, force: true });
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("Skipping attrs inference"));

    ctx.compile.mockReturnValue(true);
    ctx.loadModule.mockReturnValue({ User: {} });
    await makeModel("User", { test: true, attrsFromSchema: true, force: true });
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("Schema not found"));

    ctx.loadModule.mockImplementation(() => {
      throw new Error("load fail");
    });
    await makeModel("User", { test: true, attrsFromSchema: true, force: true });
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("Error inferring attrs from schema:"),
      expect.any(Error)
    );

    fs.rmSync(ctx.root, { recursive: true, force: true });
  });

  test("covers withMigration schema-missing, directory-create, opposite-cleanup, and existing-migration branches", async () => {
    const ctx = setupMakeModelContext();
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
    const { makeModel } = await import("../cli/commands/makeModel");

    ctx.loadModule.mockReturnValueOnce({ User: { tableName: "users" } });
    await makeModel("User", { test: true, withMigration: true, force: true });
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("Schema not found"));

    const connectionDir = path.join(ctx.migrationsRoot, "pg_test");
    if (fs.existsSync(connectionDir)) {
      fs.rmSync(connectionDir, { recursive: true, force: true });
    }

    ctx.loadModule.mockReturnValue({
      User: {
        tableName: "users",
        softDeletes: true,
        schema: {
          id: column("increments", undefined, { primary: true }),
          name: column("string", undefined, { notNull: true }),
        } satisfies Record<string, SchemaField>,
      },
    });
    await makeModel("User", { test: true, withMigration: true, force: true });

    fs.writeFileSync(
      path.join(connectionDir, "202603080001_update_users_table.ts"),
      "export async function up(){}",
      "utf8"
    );
    fs.writeFileSync(
      path.join(connectionDir, "202603080002_create_users_table.ts"),
      "export async function up(){}",
      "utf8"
    );

    await makeModel("User", { test: true, withMigration: true, force: false });
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("Removed old update migration"));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("Migration already exists"));

    fs.rmSync(ctx.root, { recursive: true, force: true });
  });

  test("handles migration generation errors and close-connection warning fallback", async () => {
    const ctx = setupMakeModelContext();
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    const { makeModel } = await import("../cli/commands/makeModel");

    ctx.loadModule.mockReturnValue({
      User: {
        tableName: "users",
        schema: {
          id: column("increments", undefined, { primary: true }),
        } satisfies Record<string, SchemaField>,
      },
    });
    ctx.toCreateSQL.mockRejectedValue(new Error("sql build failed"));
    ctx.closeAllConnections.mockRejectedValue(new Error("close failed"));

    await makeModel("User", { test: true, withMigration: true, force: true });

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("Error generating migration:"),
      expect.any(Error)
    );
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Could not close DB connections cleanly")
    );
    fs.rmSync(ctx.root, { recursive: true, force: true });
  });

  test("includes rollback extra-table SQL in generated migration down()", async () => {
    const ctx = setupMakeModelContext();
    fs.mkdirSync(path.join(ctx.migrationsRoot, "pg_test"), { recursive: true });
    ctx.loadModule.mockReturnValue({
      User: {
        tableName: "users",
        schema: {
          id: column("increments", undefined, { primary: true }),
        } satisfies Record<string, SchemaField>,
      },
    });
    ctx.toCreateSQL.mockResolvedValue({
      mainSQL: "ALTER TABLE users ADD COLUMN score INT;",
      extraTables: [],
      rollbackMainSQL: "ALTER TABLE users DROP COLUMN score;",
      rollbackExtraTables: ["DROP TABLE IF EXISTS user_role;"],
    });

    const { makeModel } = await import("../cli/commands/makeModel");
    await makeModel("User", { test: true, withMigration: true, force: true });

    const migrationDir = path.join(ctx.migrationsRoot, "pg_test");
    const updateFile = fs
      .readdirSync(migrationDir)
      .find((fileName) => fileName.includes("update_users_table.ts"));
    expect(updateFile).toBeDefined();
    const content = fs.readFileSync(path.join(migrationDir, updateFile!), "utf8");
    expect(content).toContain("DROP TABLE IF EXISTS user_role;");

    fs.rmSync(ctx.root, { recursive: true, force: true });
  });
});

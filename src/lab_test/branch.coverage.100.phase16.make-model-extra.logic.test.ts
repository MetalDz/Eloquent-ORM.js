import fs from "fs";
import os from "os";
import path from "path";
import { dbConfig } from "../config/database";
import { column, relation, type SchemaField } from "../core/schema/SchemaBlueprint";

describe("Branch coverage 100% - phase 16 makeModel extra branches", () => {
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

  const originalConnections = { ...dbConfig.connections };

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
    jest.clearAllMocks();
    (dbConfig as { connections: typeof dbConfig.connections }).connections = {
      ...originalConnections,
    };
  });

  function setupContext() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-phase16-make-model-"));
    const modelsDir = path.join(root, "models");
    const testMigrationsRoot = path.join(root, "test-migrations");
    const appMigrationsRoot = path.join(root, "app-migrations");
    fs.mkdirSync(modelsDir, { recursive: true });
    fs.mkdirSync(testMigrationsRoot, { recursive: true });
    fs.mkdirSync(appMigrationsRoot, { recursive: true });

    const compile = jest.fn(() => true);
    const loadModule = jest.fn();
    const resolveConnectionName = jest.fn(() => "custom_conn");
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

    const templateLoad = jest.fn(() => "MODEL_TEMPLATE");
    const templateRender = jest.fn((_tpl: string, data: Record<string, unknown>) => {
      return [
        `// table:${String(data.tableName)}`,
        `export interface ${String(data.ModelName)}Attrs {`,
        String(data.attrsTypeBody ?? ""),
        "}",
      ].join("\n");
    });
    const templateSave = jest.fn((filePath: string, content: string) => {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, content, "utf8");
    });

    jest.doMock("chalk", () => passthroughChalk);
    jest.doMock("../cli/utils/PathMap", () => ({
      PathMap: {
        ensureDirs: () => undefined,
        models: (_isTest = false) => modelsDir,
        testMigrations: (connectionName?: string) =>
          connectionName ? path.join(testMigrationsRoot, connectionName) : testMigrationsRoot,
        appMigrations: (connectionName?: string) =>
          connectionName ? path.join(appMigrationsRoot, connectionName) : appMigrationsRoot,
        migrations: (isTest = false, connectionName?: string) => {
          const base = isTest ? testMigrationsRoot : appMigrationsRoot;
          return connectionName ? path.join(base, connectionName) : base;
        },
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
      testMigrationsRoot,
      appMigrationsRoot,
      compile,
      loadModule,
      resolveConnectionName,
      closeAllConnections,
      toCreateSQL,
      templateRender,
    };
  }

  test("covers attrs inference type mapping, optionality branches, duplicate fields, and empty-schema fallback", async () => {
    const ctx = setupContext();
    fs.writeFileSync(path.join(ctx.modelsDir, "Status.ts"), "export class Status {}", "utf8");
    fs.writeFileSync(path.join(ctx.modelsDir, "Ghost.ts"), "export class Ghost {}", "utf8");

    const complexSchema = {
      id: column("increments"),
      amount: column("decimal"),
      flag: column("boolean", undefined, { default: false }),
      title: column("string", undefined, { notNull: true }),
      body: column("text"),
      uuid_col: column("uuid"),
      int_col: column("int"),
      big_col: column("bigint" as any),
      float_col: column("float" as any),
      meta: column("json"),
      published_at: column("timestamp"),
      audit: column("timestamps" as any),
      recycle: column("softDeletes" as any),
      custom: { kind: "column", type: "mystery", options: {} } as any,
      created_at: column("string"),
    } satisfies Record<string, SchemaField>;

    ctx.loadModule
      .mockReturnValueOnce({
        Status: {
          tableName: "status",
          timestamps: true,
          softDeletes: true,
          schema: complexSchema,
        },
      })
      .mockReturnValueOnce({
        Ghost: {
          tableName: "ghosts",
          schema: {
            owner: relation("belongsTo", "User"),
          } satisfies Record<string, SchemaField>,
        },
      });

    const { makeModel } = await import("../cli/commands/makeModel");
    await makeModel("Status", { test: true, attrsFromSchema: true, force: true });
    await makeModel("Ghost", { test: true, attrsFromSchema: true, force: true });
    await makeModel("User");

    const statusContent = fs.readFileSync(path.join(ctx.modelsDir, "Status.ts"), "utf8");
    expect(statusContent).toContain("// table:status");
    expect(statusContent).toContain("id?: number | null;");
    expect(statusContent).toContain("amount?: number | null;");
    expect(statusContent).toContain("flag?: boolean | null;");
    expect(statusContent).toContain("title: string;");
    expect(statusContent).toContain("meta?: Record<string, unknown> | null;");
    expect(statusContent).toContain("published_at?: string | Date | null;");
    expect(statusContent).toContain("custom?: unknown | null;");
    expect(statusContent).toContain("deleted_at?: string | Date | null;");

    const ghostContent = fs.readFileSync(path.join(ctx.modelsDir, "Ghost.ts"), "utf8");
    expect(ghostContent).toContain("// No columns found in schema");

    const userContent = fs.readFileSync(path.join(ctx.modelsDir, "User.ts"), "utf8");
    expect(userContent).toContain("// table:users");

    fs.rmSync(ctx.root, { recursive: true, force: true });
  });

  test("covers normalized soft-delete schema branches and connection driver fallback/explicit driver", async () => {
    const ctx = setupContext();
    fs.writeFileSync(path.join(ctx.modelsDir, "Post.ts"), "export class Post {}", "utf8");
    (dbConfig.connections as Record<string, { driver?: string }>).custom_conn = {};
    ctx.resolveConnectionName
      .mockImplementationOnce(() => "custom_conn")
      .mockImplementationOnce(() => "pg_test")
      .mockImplementationOnce(() => "custom_conn");

    ctx.loadModule
      .mockReturnValueOnce({
        Post: {
          tableName: "posts",
          softDeletes: true,
          schema: {
            id: column("increments"),
            deleted_at: column("timestamp"),
          } satisfies Record<string, SchemaField>,
        },
      })
      .mockReturnValueOnce({
        Post: {
          tableName: "posts",
          softDeletes: true,
          schema: {
            id: column("increments"),
          } satisfies Record<string, SchemaField>,
        },
      })
      .mockReturnValueOnce({
        Post: {
          tableName: "posts",
          softDeletes: true,
          schema: {
            id: column("increments"),
            removed: { kind: "mixin", name: "SoftDeletes" } as any,
          } satisfies Record<string, SchemaField>,
        },
      });

    const { makeModel } = await import("../cli/commands/makeModel");
    await makeModel("Post", { test: true, withMigration: true, force: true });

    await makeModel("Post", { test: true, withMigration: true, force: true });
    await makeModel("Post", { test: true, withMigration: true, force: true });

    const calls = ctx.toCreateSQL.mock.calls as unknown[][];
    expect(calls.length).toBeGreaterThanOrEqual(3);

    const firstSchema = calls[0][1] as Record<string, SchemaField>;
    const secondSchema = calls[1][1] as Record<string, SchemaField>;
    const thirdSchema = calls[2][1] as Record<string, SchemaField>;
    const firstDriver = calls[0][2] as string;
    const secondDriver = calls[1][2] as string;

    expect(firstSchema.deleted_at.kind).toBe("column");
    expect(secondSchema.deleted_at).toEqual({ kind: "mixin", name: "SoftDeletes" });
    expect(thirdSchema.removed).toEqual({ kind: "mixin", name: "SoftDeletes" });
    expect(firstDriver).toBe("custom_conn");
    expect(secondDriver).toBe("pg");

    fs.rmSync(ctx.root, { recursive: true, force: true });
  });

  test("covers migration content branch when main SQL is empty (no SQL changes detected comments)", async () => {
    const ctx = setupContext();
    fs.writeFileSync(path.join(ctx.modelsDir, "Account.ts"), "export class Account {}", "utf8");
    fs.mkdirSync(path.join(ctx.appMigrationsRoot, "custom_conn"), { recursive: true });

    ctx.loadModule.mockReturnValue({
      Account: {
        tableName: "accounts",
        schema: {
          id: column("increments"),
        } satisfies Record<string, SchemaField>,
      },
    });
    ctx.toCreateSQL.mockResolvedValue({
      mainSQL: "   ",
      extraTables: [],
      rollbackMainSQL: "   ",
      rollbackExtraTables: [],
    });

    const { makeModel } = await import("../cli/commands/makeModel");
    await makeModel("Account", { test: false, withMigration: true, force: true });

    const migrationDir = path.join(ctx.appMigrationsRoot, "custom_conn");
    const fileName = fs
      .readdirSync(migrationDir)
      .find((file) => file.includes("update_accounts_table.ts"));
    expect(fileName).toBeDefined();
    const content = fs.readFileSync(path.join(migrationDir, fileName!), "utf8");
    expect(content).toContain("// (no SQL changes detected)");
    expect(content).toContain("// (no rollback SQL generated)");

    fs.rmSync(ctx.root, { recursive: true, force: true });
  });
});

import fs from "fs";
import os from "os";
import path from "path";
import { column, type SchemaField } from "../core/schema/SchemaBlueprint.js";

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

describe("Branch coverage 100% - phase 31 makeModel/makeMigration helper edges", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
    jest.clearAllMocks();
  });

  function setupMakeMigrationContext() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-phase31-make-migration-"));
    const modelsDir = path.join(root, "models");
    const migrationsRoot = path.join(root, "migrations-root");
    fs.mkdirSync(modelsDir, { recursive: true });
    fs.mkdirSync(migrationsRoot, { recursive: true });

    const compile = jest.fn(() => true);
    const loadModule = jest.fn();
    const resolveConnectionName = jest.fn(() => "pg_test");
    const closeAllConnections = jest.fn(async () => undefined);
    const toCreateSQL = jest.fn(
      async (tableName: string) => ({
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
          connectionName ? path.join(root, "app-migrations", connectionName) : path.join(root, "app-migrations"),
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

    return { root, modelsDir, toCreateSQL, loadModule };
  }

  function setupMakeModelContext() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-phase31-make-model-"));
    const modelsDir = path.join(root, "models");
    const migrationsRoot = path.join(root, "migrations-root");
    fs.mkdirSync(modelsDir, { recursive: true });
    fs.mkdirSync(migrationsRoot, { recursive: true });

    const compile = jest.fn(() => true);
    const loadModule = jest.fn();
    const resolveConnectionName = jest.fn(() => "pg_test");
    const closeAllConnections = jest.fn(async () => undefined);
    const toCreateSQL = jest.fn(async () => ({
      mainSQL: 'CREATE TABLE "users" ("id" INT);',
      extraTables: [],
      rollbackMainSQL: 'DROP TABLE IF EXISTS "users";',
      rollbackExtraTables: [],
    }));
    const templateLoad = jest.fn(() => "template");
    const templateRender = jest.fn(
      (_tpl: string, data: Record<string, unknown>) =>
        `export interface ${String(data.ModelName)}Attrs {\n${String(data.attrsTypeBody ?? "")}\n}\n`
    );
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

    return { root, modelsDir, toCreateSQL, loadModule };
  }

  test("makeMigration handles cyclic belongsTo graphs and injects softDeletes only when missing", async () => {
    const ctx = setupMakeMigrationContext();
    fs.writeFileSync(path.join(ctx.modelsDir, "User.ts"), "export class User {}", "utf8");
    fs.writeFileSync(path.join(ctx.modelsDir, "Post.ts"), "export class Post {}", "utf8");

    const relationToPost = {
      kind: "relation",
      relation: "belongsTo",
      model: "Post",
    } as unknown as SchemaField;
    const relationToUser = {
      kind: "relation",
      relation: "belongsTo",
      model: "User",
    } as unknown as SchemaField;

    ctx.loadModule.mockImplementation((modulePath: string) => {
      if (modulePath.endsWith("User.ts")) {
        return {
          User: {
            tableName: "users",
            softDeletes: true,
            schema: {
              id: column("increments", undefined, { primary: true }),
              post: relationToPost,
            } satisfies Record<string, SchemaField>,
          },
        };
      }

      return {
        Post: {
          tableName: "posts",
          schema: {
            id: column("increments", undefined, { primary: true }),
            user: relationToUser,
          } satisfies Record<string, SchemaField>,
        },
      };
    });

    const { makeMigration } = await import("../cli/commands/makeMigration.js");
    await makeMigration("all", { test: true, exit: false });

    expect(ctx.toCreateSQL).toHaveBeenCalledTimes(2);
    const byTable = new Map(
      ctx.toCreateSQL.mock.calls.map((call) => {
        const args = call as unknown[];
        return [String(args[0]), args[1] as Record<string, SchemaField>];
      })
    );
    expect(byTable.get("users")?.deleted_at).toEqual({ kind: "mixin", name: "SoftDeletes" });
    expect(byTable.get("posts")?.deleted_at).toBeUndefined();

    fs.rmSync(ctx.root, { recursive: true, force: true });
  });

  test("makeModel keeps explicit softDeletes column and does not inject deleted_at mixin", async () => {
    const ctx = setupMakeModelContext();
    ctx.loadModule.mockReturnValue({
      User: {
        tableName: "users",
        softDeletes: true,
        schema: {
          id: column("increments", undefined, { primary: true }),
          post: {
            kind: "relation",
            relation: "belongsTo",
            model: "Post",
          } as unknown as SchemaField,
          archived: {
            kind: "column",
            type: "softDeletes",
            options: {},
          } as unknown as SchemaField,
        } satisfies Record<string, SchemaField>,
      },
    });

    const { makeModel } = await import("../cli/commands/makeModel.js");
    await makeModel("User", { test: true, withMigration: true, force: true });

    const firstCallArgs = ctx.toCreateSQL.mock.calls[0] as unknown[] | undefined;
    const schemaArg = firstCallArgs?.[1] as Record<string, SchemaField>;
    expect(schemaArg).toBeDefined();
    expect(schemaArg.archived).toBeDefined();
    expect(schemaArg.deleted_at).toBeUndefined();

    fs.rmSync(ctx.root, { recursive: true, force: true });
  });
});

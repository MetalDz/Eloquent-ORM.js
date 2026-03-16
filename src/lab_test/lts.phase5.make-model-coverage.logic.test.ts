import fs from "fs";
import os from "os";
import path from "path";
import { dbConfig } from "../config/database";
import { column } from "../core/schema/SchemaBlueprint";

describe("LTS phase 5 makeModel coverage", () => {
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

  test("plan tracks the dedicated makeModel coverage slice", () => {
    const planPath = path.resolve(
      process.cwd(),
      "validation tasks/LTS-Phase5-MakeModel-Coverage-Plan.md",
    );
    const content = fs.readFileSync(planPath, "utf8");

    expect(content).toContain("# LTS Phase 5 MakeModel Coverage Plan");
    expect(content).toContain("Status: COMPLETED");
    expect(content).toContain("src/cli/commands/makeModel.ts");
    expect(content).toContain("src/lab_test/lts.phase5.make-model-coverage.logic.test.ts");
  });

  test("mongo withMigration delegates directly to makeMigration and skips SQL generation", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-lts-phase5-make-model-"));
    const modelsDir = path.join(root, "models");
    const migrationsRoot = path.join(root, "migrations");
    fs.mkdirSync(modelsDir, { recursive: true });
    fs.mkdirSync(migrationsRoot, { recursive: true });

    const compile = jest.fn(() => true);
    const loadModule = jest.fn(() => ({
      GeoPhoto: {
        tableName: "geo_photos",
        schema: {
          id: column("increments"),
        },
      },
    }));
    const resolveConnectionName = jest.fn(() => "mongo_test");
    const closeAllConnections = jest.fn(async () => undefined);
    const makeMigration = jest.fn(async () => undefined);
    const toCreateSQL = jest.fn();
    const templateLoad = jest.fn(() => "MODEL_TEMPLATE");
    const templateRender = jest.fn((_tpl: string, data: Record<string, unknown>) =>
      [
        `export class ${String(data.ModelName)} extends ${String(data.modelBaseClass)} {}`,
        `export const connection = ${String(data.connectionDescription)}`,
      ].join("\n"),
    );
    const templateSave = jest.fn((filePath: string, content: string) => {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, content, "utf8");
    });

    (dbConfig.connections as Record<string, { driver?: string }>).mongo_test = {
      driver: "mongo",
    };

    jest.doMock("chalk", () => passthroughChalk);
    jest.doMock("../cli/utils/PathMap", () => ({
      PathMap: {
        ensureDirs: () => undefined,
        models: () => modelsDir,
        testMigrations: () => migrationsRoot,
        appMigrations: () => migrationsRoot,
        migrations: (_isTest = false, connectionName?: string) => {
          const dir = path.join(migrationsRoot, String(connectionName ?? "default"));
          fs.mkdirSync(dir, { recursive: true });
          return dir;
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
    jest.doMock("../cli/commands/makeMigration", () => ({
      makeMigration,
    }));

    try {
      const { makeModel } = await import("../cli/commands/makeModel");

      await makeModel("GeoPhoto", {
        test: true,
        mongo: true,
        withMigration: true,
        force: true,
      });

      expect(resolveConnectionName).toHaveBeenCalledWith(
        expect.objectContaining({
          tableName: "geo_photos",
        }),
        { test: true },
      );
      expect(makeMigration).toHaveBeenCalledWith("GeoPhoto", {
        test: true,
        connectionName: "mongo_test",
        exit: false,
      });
      expect(toCreateSQL).not.toHaveBeenCalled();
      expect(closeAllConnections).toHaveBeenCalledTimes(1);

      const modelContent = fs.readFileSync(path.join(modelsDir, "GeoPhoto.ts"), "utf8");
      expect(modelContent).toContain("extends MongoModel");
      expect(modelContent).toContain("mongo_test");
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test("sql withMigration writes extra up/down statements from SchemaBuilder helper arrays", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-lts-phase5-make-model-sql-"));
    const modelsDir = path.join(root, "models");
    const migrationsRoot = path.join(root, "migrations");
    fs.mkdirSync(modelsDir, { recursive: true });
    fs.mkdirSync(migrationsRoot, { recursive: true });

    const compile = jest.fn(() => true);
    const loadModule = jest.fn(() => ({
      PostAudit: {
        tableName: "post_audits",
        schema: {
          id: column("increments"),
        },
      },
    }));
    const resolveConnectionName = jest.fn(() => "pg_test");
    const closeAllConnections = jest.fn(async () => undefined);
    const makeMigration = jest.fn(async () => undefined);
    const toCreateSQL = jest.fn(async () => ({
      mainSQL: "CREATE TABLE post_audits (id INT);",
      extraTables: [
        "CREATE INDEX post_audits_id_idx ON post_audits (id);",
      ],
      rollbackMainSQL: "DROP TABLE IF EXISTS post_audits;",
      rollbackExtraTables: [
        "DROP INDEX IF EXISTS post_audits_id_idx;",
      ],
    }));
    const templateLoad = jest.fn(() => "MODEL_TEMPLATE");
    const templateRender = jest.fn((_tpl: string, data: Record<string, unknown>) =>
      [
        `export class ${String(data.ModelName)} extends ${String(data.modelBaseClass)} {}`,
        `export const connection = ${String(data.connectionDescription)}`,
      ].join("\n"),
    );
    const templateSave = jest.fn((filePath: string, content: string) => {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, content, "utf8");
    });

    (dbConfig.connections as Record<string, { driver?: string }>).pg_test = {
      driver: "pg",
    };

    jest.doMock("chalk", () => passthroughChalk);
    jest.doMock("../cli/utils/PathMap", () => ({
      PathMap: {
        ensureDirs: () => undefined,
        models: () => modelsDir,
        testMigrations: () => migrationsRoot,
        appMigrations: () => migrationsRoot,
        migrations: (_isTest = false, connectionName?: string) => {
          const dir = path.join(migrationsRoot, String(connectionName ?? "default"));
          fs.mkdirSync(dir, { recursive: true });
          return dir;
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
    jest.doMock("../cli/commands/makeMigration", () => ({
      makeMigration,
    }));

    try {
      const { makeModel } = await import("../cli/commands/makeModel");

      await makeModel("PostAudit", {
        test: true,
        withMigration: true,
        force: true,
      });

      expect(toCreateSQL).toHaveBeenCalledTimes(1);
      expect(makeMigration).not.toHaveBeenCalled();

      const migrationDir = path.join(migrationsRoot, "pg_test");
      const migrationFile = fs
        .readdirSync(migrationDir)
        .find((file) => file.includes("create_post_audits_table.ts"));
      expect(migrationFile).toBeDefined();

      const content = fs.readFileSync(path.join(migrationDir, migrationFile!), "utf8");
      expect(content).toContain("await db.query(`CREATE TABLE post_audits (id INT);`);");
      expect(content).toContain(
        "await db.query(`CREATE INDEX post_audits_id_idx ON post_audits (id);`);",
      );
      expect(content).toContain(
        "await db.query(`DROP INDEX IF EXISTS post_audits_id_idx;`);",
      );
      expect(content).toContain("await db.query(`DROP TABLE IF EXISTS post_audits;`);");
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

import fs from "fs";
import os from "os";
import path from "path";
import { PathMap } from "../cli/utils/PathMap";
import { TypeScriptCompiler } from "../cli/utils/typescript/TypeScriptCompiler";
import { loadModule } from "../cli/utils/typescript/tsRuntime";
import { resolveConnectionName } from "../core/connection/resolveConnectionName";
import { closeAllConnections } from "../core/connection/ConnectionFactory";
import { SchemaBuilder, type SchemaBuildResult } from "../core/schema/SchemaBuilder";
import { column, type SchemaField } from "../core/schema/SchemaBlueprint";

type MakeModelFn = typeof import("../cli/commands/makeModel").makeModel;
let makeModel: MakeModelFn;

jest.mock("chalk", () => ({
  __esModule: true,
  default: {
    blue: (value: string) => value,
    green: (value: string) => value,
    yellow: (value: string) => value,
    red: (value: string) => value,
    cyan: (value: string) => value,
    cyanBright: (value: string) => value,
    gray: (value: string) => value,
  },
}));

jest.mock("../cli/utils/typescript/TypeScriptCompiler", () => ({
  TypeScriptCompiler: {
    compile: jest.fn(),
  },
}));

jest.mock("../cli/utils/typescript/tsRuntime", () => ({
  loadModule: jest.fn(),
}));

jest.mock("../core/connection/resolveConnectionName", () => ({
  resolveConnectionName: jest.fn(),
}));

jest.mock("../core/connection/ConnectionFactory", () => ({
  closeAllConnections: jest.fn(),
}));

const mockedCompile = TypeScriptCompiler.compile as jest.MockedFunction<
  typeof TypeScriptCompiler.compile
>;
const mockedLoadModule = loadModule as jest.MockedFunction<typeof loadModule>;
const mockedResolveConnectionName =
  resolveConnectionName as jest.MockedFunction<typeof resolveConnectionName>;
const mockedCloseAllConnections =
  closeAllConnections as jest.MockedFunction<typeof closeAllConnections>;

describe("makeModel --with-migration rollback safety", () => {
  let tempRoot: string;
  let modelsDir: string;
  let testMigrationsRoot: string;
  let connectionMigrationsDir: string;

  beforeEach(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-make-model-rollback-"));
    modelsDir = path.join(tempRoot, "models");
    testMigrationsRoot = path.join(tempRoot, "migrations-root");
    connectionMigrationsDir = path.join(testMigrationsRoot, "pg_test");

    fs.mkdirSync(modelsDir, { recursive: true });
    fs.mkdirSync(connectionMigrationsDir, { recursive: true });

    jest.spyOn(PathMap, "ensureDirs").mockImplementation(() => undefined);
    jest.spyOn(PathMap, "models").mockImplementation((isTest = false) => {
      return isTest ? modelsDir : path.join(tempRoot, "app-models");
    });
    jest.spyOn(PathMap, "migrations").mockImplementation((isTest = false, connectionName?: string) => {
      if (isTest) {
        return connectionName ? connectionMigrationsDir : testMigrationsRoot;
      }
      return connectionName
        ? path.join(tempRoot, "app-migrations", String(connectionName))
        : path.join(tempRoot, "app-migrations");
    });
    jest.spyOn(PathMap, "testMigrations").mockImplementation((connectionName?: string) => {
      return connectionName ? connectionMigrationsDir : testMigrationsRoot;
    });
    jest.spyOn(PathMap, "appMigrations").mockImplementation((connectionName?: string) => {
      return connectionName
        ? path.join(tempRoot, "app-migrations", String(connectionName))
        : path.join(tempRoot, "app-migrations");
    });

    mockedCompile.mockReturnValue(true);
    mockedResolveConnectionName.mockReturnValue("pg_test" as never);
    mockedCloseAllConnections.mockResolvedValue(undefined);
    mockedLoadModule.mockImplementation((modulePath: string) => {
      if (modulePath.endsWith("Post.ts")) {
        return {
          Post: {
            tableName: "posts",
            connectionName: "pg_test",
            schema: {
              id: column("increments", undefined, { primary: true }),
              title: column("string"),
            } satisfies Record<string, SchemaField>,
          },
        };
      }
      return {};
    });

    makeModel = require("../cli/commands/makeModel").makeModel as MakeModelFn;
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  test("uses inverse rollback SQL for UPDATE migrations instead of DROP TABLE", async () => {
    const updateBuild: SchemaBuildResult = {
      mainSQL: 'ALTER TABLE "posts"\n  ADD COLUMN "title" VARCHAR(255);',
      extraTables: [],
      rollbackMainSQL: 'ALTER TABLE "posts"\n  DROP COLUMN "title";',
      rollbackExtraTables: [],
    };
    jest.spyOn(SchemaBuilder, "toCreateSQL").mockResolvedValue(updateBuild);

    await makeModel("Post", { test: true, withMigration: true, force: true });

    const updateFile = fs
      .readdirSync(connectionMigrationsDir)
      .find((file) => file.includes("update_posts_table.ts"));
    expect(updateFile).toBeDefined();

    const content = fs.readFileSync(path.join(connectionMigrationsDir, updateFile!), "utf8");
    expect(content).toContain('ADD COLUMN "title" VARCHAR(255)');
    expect(content).toContain('DROP COLUMN "title"');
    expect(content).not.toMatch(/DROP TABLE IF EXISTS/i);
  });

  test("does not fallback to DROP TABLE when UPDATE rollback SQL is empty", async () => {
    const updateWithoutRollback: SchemaBuildResult = {
      mainSQL: 'ALTER TABLE "posts"\n  ADD COLUMN "title" VARCHAR(255);',
      extraTables: [],
      rollbackMainSQL: "",
      rollbackExtraTables: [],
    };
    jest.spyOn(SchemaBuilder, "toCreateSQL").mockResolvedValue(updateWithoutRollback);

    await makeModel("Post", { test: true, withMigration: true, force: true });

    const updateFile = fs
      .readdirSync(connectionMigrationsDir)
      .find((file) => file.includes("update_posts_table.ts"));
    expect(updateFile).toBeDefined();

    const content = fs.readFileSync(path.join(connectionMigrationsDir, updateFile!), "utf8");
    expect(content).toContain("// (no rollback SQL generated)");
    expect(content).not.toMatch(/DROP TABLE IF EXISTS/i);
  });
});

import fs from "fs";
import os from "os";
import path from "path";
import { PathMap } from "../cli/utils/PathMap.js";
import { TypeScriptCompiler } from "../cli/utils/typescript/TypeScriptCompiler.js";
import { loadModule } from "../cli/utils/typescript/tsRuntime.js";
import { resolveConnectionName } from "../core/connection/resolveConnectionName.js";
import {
  closeAllConnections,
  getAdapter,
} from "../core/connection/ConnectionFactory.js";
import { column, relation, type SchemaField } from "../core/schema/SchemaBlueprint.js";

type MakeMigrationFn = typeof import("../cli/commands/makeMigration.js").makeMigration;
let makeMigration: MakeMigrationFn;

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
  getAdapter: jest.fn(),
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
const mockedGetAdapter = getAdapter as jest.MockedFunction<typeof getAdapter>;

describe("makeMigration append-only tracking behavior", () => {
  let tempRoot: string;
  let modelsDir: string;
  let migrationsDir: string;
  let testMigrationsRoot: string;
  let appMigrationsRoot: string;

  const existingCreateMigration = "20260304090000001_create_posts_table.ts";
  const existingUpdateMigration = "20260304090000002_update_posts_table.ts";

  beforeEach(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-make-migration-append-only-"));
    modelsDir = path.join(tempRoot, "models");
    testMigrationsRoot = path.join(tempRoot, "migrations-root");
    migrationsDir = path.join(testMigrationsRoot, "pg_test");
    appMigrationsRoot = path.join(tempRoot, "app-migrations-root");

    fs.mkdirSync(modelsDir, { recursive: true });
    fs.mkdirSync(migrationsDir, { recursive: true });
    fs.writeFileSync(path.join(modelsDir, "Post.ts"), "export class Post {}", "utf8");
    fs.writeFileSync(
      path.join(migrationsDir, existingCreateMigration),
      `export async function up() {}
export async function down() {}
`,
      "utf8"
    );
    fs.writeFileSync(
      path.join(migrationsDir, existingUpdateMigration),
      `export async function up() {}
export async function down() {}
`,
      "utf8"
    );

    jest.spyOn(PathMap, "ensureDirs").mockImplementation(() => undefined);
    jest.spyOn(PathMap, "models").mockImplementation((isTest = false) => {
      return isTest ? modelsDir : path.join(tempRoot, "app-models");
    });
    jest.spyOn(PathMap, "migrations").mockImplementation((isTest = false, connectionName?: string) => {
      if (isTest) {
        return connectionName ? migrationsDir : testMigrationsRoot;
      }
      return connectionName
        ? path.join(appMigrationsRoot, String(connectionName))
        : appMigrationsRoot;
    });
    jest.spyOn(PathMap, "testMigrations").mockImplementation((connectionName?: string) => {
      return connectionName ? migrationsDir : testMigrationsRoot;
    });
    jest.spyOn(PathMap, "appMigrations").mockImplementation((connectionName?: string) => {
      return connectionName
        ? path.join(appMigrationsRoot, String(connectionName))
        : appMigrationsRoot;
    });

    mockedCompile.mockReturnValue(true);
    mockedResolveConnectionName.mockReturnValue("pg_test" as never);
    mockedCloseAllConnections.mockResolvedValue(undefined);
    mockedLoadModule.mockImplementation(() => {
      return {
        Post: {
          tableName: "posts",
          connectionName: "pg_test",
          schema: {
            id: column("increments", undefined, { primary: true }),
            author: relation("belongsTo", "User", { foreignKey: "user_id" }),
          } satisfies Record<string, SchemaField>,
        },
      };
    });

    mockedGetAdapter.mockResolvedValue({
      query: jest.fn(async (sql: string) => {
        if (sql.includes("FROM information_schema.columns")) {
          return [
            {
              column_name: "id",
              data_type: "integer",
              udt_name: "int4",
              is_nullable: "NO",
              column_default: "nextval('posts_id_seq'::regclass)",
              character_maximum_length: null,
              numeric_precision: 32,
              numeric_scale: 0,
            },
          ];
        }
        if (sql.includes("constraint_type = 'FOREIGN KEY'")) {
          return [];
        }
        return [];
      }),
      placeholder: (index: number) => `$${index}`,
    } as never);

    makeMigration = require("../cli/commands/makeMigration").makeMigration as MakeMigrationFn;
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  test("keeps existing create/update files and appends a new update migration", async () => {
    await makeMigration("Post", { test: true, exit: false });

    const migrationFiles = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".ts"));
    const updateFiles = migrationFiles.filter((file) => file.includes("update_posts_table"));
    const generatedUpdate = updateFiles.find((file) => file !== existingUpdateMigration);

    expect(migrationFiles).toContain(existingCreateMigration);
    expect(migrationFiles).toContain(existingUpdateMigration);
    expect(updateFiles.length).toBe(2);
    expect(generatedUpdate).toBeDefined();

    const content = fs.readFileSync(path.join(migrationsDir, generatedUpdate!), "utf8");
    expect(content).toContain('ADD COLUMN "user_id" INTEGER');
    expect(content).toContain('DROP COLUMN "user_id"');
  });

  test("does not regenerate CREATE when a baseline create file already exists", async () => {
    mockedGetAdapter.mockResolvedValueOnce({
      query: jest.fn(async (sql: string) => {
        if (sql.includes("FROM information_schema.columns")) {
          return [];
        }
        if (sql.includes("constraint_type = 'FOREIGN KEY'")) {
          return [];
        }
        return [];
      }),
      placeholder: (index: number) => `$${index}`,
    } as never);

    await makeMigration("Post", { test: true, exit: false });

    const migrationFiles = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".ts"));
    const createFiles = migrationFiles.filter((file) => file.includes("create_posts_table"));

    expect(createFiles.length).toBe(1);
    expect(migrationFiles).toContain(existingCreateMigration);
  });
});

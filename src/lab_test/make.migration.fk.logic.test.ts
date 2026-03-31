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

describe("makeMigration FK-aware update generation", () => {
  let tempRoot: string;
  let modelsDir: string;
  let migrationsDir: string;
  let testMigrationsRoot: string;
  let appMigrationsRoot: string;

  beforeEach(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-make-migration-fk-"));
    modelsDir = path.join(tempRoot, "models");
    testMigrationsRoot = path.join(tempRoot, "migrations-root");
    migrationsDir = path.join(testMigrationsRoot, "pg_test");
    appMigrationsRoot = path.join(tempRoot, "app-migrations-root");
    fs.mkdirSync(modelsDir, { recursive: true });
    fs.mkdirSync(migrationsDir, { recursive: true });
    fs.writeFileSync(path.join(modelsDir, "Post.ts"), "export class Post {}", "utf8");
    fs.writeFileSync(path.join(modelsDir, "User.ts"), "export class User {}", "utf8");
    fs.writeFileSync(
      path.join(migrationsDir, "20260304090000001_create_posts_table.ts"),
      `export async function up() {}
export async function down() {}
`,
      "utf8"
    );
    fs.writeFileSync(
      path.join(migrationsDir, "20260304090000002_create_users_table.ts"),
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
    mockedLoadModule.mockImplementation((modulePath: string) => {
      if (modulePath.endsWith("User.ts")) {
        return {
          User: {
            tableName: "users",
            connectionName: "pg_test",
            softDeletes: true,
            schema: {
              id: column("increments", undefined, { primary: true }),
            } satisfies Record<string, SchemaField>,
          },
        };
      }
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

  test("writes update migration with FK add/drop clauses for pg belongsTo diffs", async () => {
    await makeMigration("Post", { test: true, exit: false });

    const migrationFiles = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".ts"));

    expect(migrationFiles.some((file) => file.includes("update_posts_table"))).toBe(true);
    expect(migrationFiles.some((file) => file.includes("create_posts_table"))).toBe(true);

    const updateFile = migrationFiles.find((file) => file.includes("update_posts_table"));
    expect(updateFile).toBeDefined();

    const content = fs.readFileSync(path.join(migrationsDir, updateFile!), "utf8");
    expect(content).toContain('ADD COLUMN "user_id" INTEGER');
    expect(content).toContain(
      'ADD CONSTRAINT "posts_user_id_foreign" FOREIGN KEY ("user_id") REFERENCES "users"("id")'
    );
    expect(content).toContain('DROP CONSTRAINT "posts_user_id_foreign"');
    expect(content).toContain('DROP COLUMN "user_id"');
  });

  test("injects SoftDeletes mixin from static model flag during migration generation", async () => {
    await makeMigration("User", { test: true, exit: false });

    const migrationFiles = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".ts"));
    expect(migrationFiles.some((file) => file.includes("update_users_table"))).toBe(true);
    expect(migrationFiles.some((file) => file.includes("create_users_table"))).toBe(true);

    const updateFile = migrationFiles.find((file) => file.includes("update_users_table"));
    expect(updateFile).toBeDefined();

    const content = fs.readFileSync(path.join(migrationsDir, updateFile!), "utf8");
    expect(content).toContain('ADD COLUMN "deleted_at" TIMESTAMP NULL DEFAULT NULL');
    expect(content).toContain('DROP COLUMN "deleted_at"');
  });

  test("re-running unchanged diff keeps append-only history without creating duplicate updates", async () => {
    await makeMigration("Post", { test: true, exit: false });
    await makeMigration("Post", { test: true, exit: false });

    const migrationFiles = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".ts"));
    const createPostFiles = migrationFiles.filter((file) => file.includes("create_posts_table"));
    const updatePostFiles = migrationFiles.filter((file) => file.includes("update_posts_table"));

    expect(createPostFiles.length).toBe(1);
    expect(updatePostFiles.length).toBe(1);
  });
});

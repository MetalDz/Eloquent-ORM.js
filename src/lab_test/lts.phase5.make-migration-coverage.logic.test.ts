import fs from "fs";
import os from "os";
import path from "path";
import { column, relation, type SchemaField } from "../core/schema/SchemaBlueprint.js";

const passthroughChalk = {
  __esModule: true,
  default: {
    blue: (value: string) => value,
    blueBright: (value: string) => value,
    green: (value: string) => value,
    greenBright: (value: string) => value,
    yellow: (value: string) => value,
    red: (value: string) => value,
    redBright: (value: string) => value,
    cyan: (value: string) => value,
    cyanBright: (value: string) => value,
    gray: (value: string) => value,
  },
};

type HarnessOptions = {
  connectionName?: string;
  driver?: string;
  omitConnectionConfig?: boolean;
};

function setupMakeMigrationHarness(options: HarnessOptions = {}) {
  jest.resetModules();

  const connectionName = options.connectionName ?? "mongo_cov";
  const driver = options.driver ?? "mongo";
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-lts5-make-migration-"));
  const modelsDir = path.join(root, "models");
  const testMigrationsRoot = path.join(root, "test-migrations");
  const appMigrationsRoot = path.join(root, "app-migrations");
  fs.mkdirSync(modelsDir, { recursive: true });
  fs.mkdirSync(testMigrationsRoot, { recursive: true });
  fs.mkdirSync(appMigrationsRoot, { recursive: true });

  const compile = jest.fn(() => true);
  const loadModule = jest.fn();
  const resolveConnectionName = jest.fn(() => connectionName);
  const closeAllConnections = jest.fn(async () => undefined);
  const toCreateSQL = jest.fn(
    async (
      tableName: string,
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
    }),
  );

  jest.doMock("chalk", () => passthroughChalk);
  jest.doMock("../cli/utils/PathMap", () => ({
    PathMap: {
      ensureDirs: () => undefined,
      models: () => modelsDir,
      testMigrations: (name?: string) =>
        name ? path.join(testMigrationsRoot, name) : testMigrationsRoot,
      appMigrations: (name?: string) =>
        name ? path.join(appMigrationsRoot, name) : appMigrationsRoot,
      migrations: (isTest = false, name?: string) => {
        const base = isTest ? testMigrationsRoot : appMigrationsRoot;
        return name ? path.join(base, name) : base;
      },
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
  jest.doMock("../config/database", () => ({
    dbConfig: {
      connections: {
        ...(options.omitConnectionConfig ? {} : { [connectionName]: { driver } }),
      },
    },
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
    connectionName,
    driver,
  };
}

describe("LTS phase 5 makeMigration coverage", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    jest.resetModules();
    process.exitCode = 0;
  });

  test("plan tracks the dedicated makeMigration coverage slice", () => {
    const planPath = path.resolve(
      process.cwd(),
      "validation tasks/LTS-Phase5-MakeMigration-Coverage-Plan.md",
    );
    const content = fs.readFileSync(planPath, "utf8");

    expect(content).toContain("# LTS Phase 5 MakeMigration Coverage Plan");
    expect(content).toContain("Status: COMPLETED");
    expect(content).toContain("src/cli/commands/makeMigration.ts");
    expect(content).toContain("src/lab_test/lts.phase5.make-migration-coverage.logic.test.ts");
  });

  test("covers Mongo index synthesis, duplicate deleted_at dedupe, and embedded pivot generation", async () => {
    const ctx = setupMakeMigrationHarness({
      connectionName: "mongo_embed",
      driver: "mongo",
    });
    fs.writeFileSync(path.join(ctx.modelsDir, "User.ts"), "export class User {}", "utf8");

    ctx.loadModule.mockReturnValue({
      User: {
        tableName: "users",
        schema: {
          id: column("increments"),
          uuid: column("string", undefined, { primary: true }),
          email: column("string", undefined, { unique: true }),
          slug: column("string", undefined, { index: true }),
          deleted_at: column("timestamp"),
          softDeleteMixin: { kind: "mixin", name: "SoftDeletes" } as SchemaField,
          owner: relation("belongsTo", "Account", { foreignKey: "account_id" }),
          manager: relation("belongsTo", "Manager"),
          roles: relation("belongsToMany", "Role"),
          tags: relation("belongsToMany", "Tags"),
        } satisfies Record<string, SchemaField>,
      },
    });

    const { makeMigration } = await import("../cli/commands/makeMigration.js");
    await makeMigration("User", {
      test: true,
      pivotSeparate: false,
      connectionName: "mongo_embed" as never,
      exit: false,
    });

    const migrationDir = path.join(ctx.testMigrationsRoot, "mongo_embed");
    const createFile = fs
      .readdirSync(migrationDir)
      .find((fileName) => fileName.includes("_create_users_table.ts"));
    expect(createFile).toBeDefined();

    const content = fs.readFileSync(path.join(migrationDir, createFile!), "utf8");
    expect(content).toContain('await db.ensureCollection("users");');
    expect(content).toContain("uuid_pk_unique");
    expect(content).toContain("email_unique");
    expect(content).toContain("slug_idx");
    expect(content).toContain("account_id_idx");
    expect(content).toContain('await db.ensureCollection("role_user_pivot");');
    expect(content).toContain('await db.ensureCollection("tag_user_pivot");');
    expect(content).toContain('await db.dropCollection("role_user_pivot");');
    expect(content).toContain('await db.dropCollection("users");');
    expect((content.match(/deleted_at_idx/g) ?? []).length).toBe(1);

    fs.rmSync(ctx.root, { recursive: true, force: true });
  });

  test("covers Mongo softDeletes normalization and unchanged update migration detection", async () => {
    const ctx = setupMakeMigrationHarness({
      connectionName: "mongo_soft",
      driver: "mongo",
    });
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
    fs.writeFileSync(path.join(ctx.modelsDir, "Session.ts"), "export class Session {}", "utf8");

    ctx.loadModule.mockReturnValue({
      Session: {
        tableName: "sessions",
        softDeletes: true,
        schema: {
          id: column("increments"),
          owner: relation("belongsTo", "User"),
        } satisfies Record<string, SchemaField>,
      },
    });

    const { makeMigration } = await import("../cli/commands/makeMigration.js");
    await makeMigration("Session", {
      test: true,
      connectionName: "mongo_soft" as never,
      exit: false,
    });
    await makeMigration("Session", {
      test: true,
      connectionName: "mongo_soft" as never,
      exit: false,
    });
    await makeMigration("Session", {
      test: true,
      connectionName: "mongo_soft" as never,
      exit: false,
    });

    const migrationDir = path.join(ctx.testMigrationsRoot, "mongo_soft");
    const createFile = fs
      .readdirSync(migrationDir)
      .find((fileName) => fileName.includes("_create_sessions_table.ts"));
    expect(createFile).toBeDefined();
    const content = fs.readFileSync(path.join(migrationDir, createFile!), "utf8");
    expect(content).toContain("deleted_at_idx");
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("Migration unchanged:"));

    fs.rmSync(ctx.root, { recursive: true, force: true });
  });

  test("covers softDeletes column detection branch without adding an extra deleted_at mixin", async () => {
    const ctx = setupMakeMigrationHarness({
      connectionName: "mongo_soft_column",
      driver: "mongo",
    });
    fs.writeFileSync(path.join(ctx.modelsDir, "Audit.ts"), "export class Audit {}", "utf8");

    ctx.loadModule.mockReturnValue({
      Audit: {
        tableName: "audits",
        softDeletes: true,
        schema: {
          id: column("increments"),
          removed_at: column("softDeletes" as never),
        } satisfies Record<string, SchemaField>,
      },
    });

    const { makeMigration } = await import("../cli/commands/makeMigration.js");
    await makeMigration("Audit", {
      test: true,
      connectionName: "mongo_soft_column" as never,
      exit: false,
    });

    const migrationDir = path.join(ctx.testMigrationsRoot, "mongo_soft_column");
    const createFile = fs
      .readdirSync(migrationDir)
      .find((fileName) => fileName.includes("_create_audits_table.ts"));
    expect(createFile).toBeDefined();
    const content = fs.readFileSync(path.join(migrationDir, createFile!), "utf8");
    expect(content).toContain("deleted_at_idx");

    fs.rmSync(ctx.root, { recursive: true, force: true });
  });

  test("covers Mongo no-work skip when a baseline create already exists", async () => {
    const ctx = setupMakeMigrationHarness({
      connectionName: "mongo_noop",
      driver: "mongo",
    });
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
    fs.writeFileSync(path.join(ctx.modelsDir, "Plain.ts"), "export class Plain {}", "utf8");
    const migrationDir = path.join(ctx.testMigrationsRoot, "mongo_noop");
    fs.mkdirSync(migrationDir, { recursive: true });
    fs.writeFileSync(
      path.join(migrationDir, "20000101000000001_create_plains_table.ts"),
      "export async function up() {}\nexport async function down() {}\n",
      "utf8",
    );

    ctx.loadModule.mockReturnValue({
      Plain: {
        tableName: "plains",
        schema: {
          id: column("increments"),
        } satisfies Record<string, SchemaField>,
      },
    });

    const { makeMigration } = await import("../cli/commands/makeMigration.js");
    await makeMigration("Plain", {
      test: true,
      connectionName: "mongo_noop" as never,
      exit: false,
    });

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("No new columns or schema changes - skipping."),
    );

    fs.rmSync(ctx.root, { recursive: true, force: true });
  });

  test("covers separate Mongo pivot migration generation", async () => {
    const ctx = setupMakeMigrationHarness({
      connectionName: "mongo_pivot",
      driver: "mongo",
    });
    fs.writeFileSync(path.join(ctx.modelsDir, "User.ts"), "export class User {}", "utf8");

    ctx.loadModule.mockReturnValue({
      User: {
        tableName: "users",
        schema: {
          id: column("increments"),
          roles: relation("belongsToMany", "Role"),
        } satisfies Record<string, SchemaField>,
      },
    });

    const { makeMigration } = await import("../cli/commands/makeMigration.js");
    await makeMigration("User", {
      test: false,
      pivotSeparate: true,
      connectionName: "mongo_pivot" as never,
      exit: false,
    });

    const migrationDir = path.join(ctx.appMigrationsRoot, "mongo_pivot");
    const pivotFile = fs
      .readdirSync(migrationDir)
      .find((fileName) => fileName.includes("_create_role_user_pivot_table.ts"));
    expect(pivotFile).toBeDefined();

    const content = fs.readFileSync(path.join(migrationDir, pivotFile!), "utf8");
    expect(content).toContain('await db.ensureCollection("role_user_pivot");');
    expect(content).toContain("role_user_pivot_pair_unique");

    fs.rmSync(ctx.root, { recursive: true, force: true });
  });

  test("covers TEST-mode separate pivot generation for singular source table names", async () => {
    const ctx = setupMakeMigrationHarness({
      connectionName: "mongo_wifi",
      driver: "mongo",
    });
    fs.writeFileSync(path.join(ctx.modelsDir, "Wifi.ts"), "export class Wifi {}", "utf8");

    ctx.loadModule.mockReturnValue({
      Wifi: {
        tableName: "wifi",
        schema: {
          id: column("increments"),
          roles: relation("belongsToMany", "Role"),
        } satisfies Record<string, SchemaField>,
      },
    });

    const { makeMigration } = await import("../cli/commands/makeMigration.js");
    await makeMigration("Wifi", {
      test: true,
      pivotSeparate: true,
      connectionName: "mongo_wifi" as never,
      exit: false,
    });

    const migrationDir = path.join(ctx.testMigrationsRoot, "mongo_wifi");
    const pivotFile = fs
      .readdirSync(migrationDir)
      .find((fileName) => fileName.includes("_create_role_wifi_pivot_table.ts"));
    expect(pivotFile).toBeDefined();

    const content = fs.readFileSync(path.join(migrationDir, pivotFile!), "utf8");
    expect(content).toContain("Mode: TEST");
    expect(content).toContain('await db.ensureCollection("role_wifi_pivot");');

    fs.rmSync(ctx.root, { recursive: true, force: true });
  });

  test("covers cyclic belongsTo dependency traversal without infinite recursion", async () => {
    const ctx = setupMakeMigrationHarness({
      connectionName: "sql_cycle",
      driver: "sqlite",
    });
    fs.writeFileSync(path.join(ctx.modelsDir, "User.ts"), "export class User {}", "utf8");
    fs.writeFileSync(path.join(ctx.modelsDir, "Post.ts"), "export class Post {}", "utf8");

    ctx.loadModule.mockImplementation((modulePath: string) => {
      if (modulePath.endsWith("User.ts")) {
        return {
          User: {
            tableName: "users",
            schema: {
              id: column("increments"),
              post: relation("belongsTo", "Post"),
            } satisfies Record<string, SchemaField>,
          },
        };
      }
      return {
        Post: {
          tableName: "posts",
          schema: {
            id: column("increments"),
            user: relation("belongsTo", "User"),
          } satisfies Record<string, SchemaField>,
        },
      };
    });
    ctx.toCreateSQL.mockResolvedValue({
      mainSQL: "",
      extraTables: [],
      rollbackMainSQL: "",
      rollbackExtraTables: [],
    });

    const { makeMigration } = await import("../cli/commands/makeMigration.js");
    await makeMigration("all", {
      test: true,
      connectionName: "sql_cycle" as never,
      exit: false,
    });

    expect(ctx.toCreateSQL).toHaveBeenCalledTimes(2);

    fs.rmSync(ctx.root, { recursive: true, force: true });
  });

  test("covers unsupported-driver skip behavior", async () => {
    const ctx = setupMakeMigrationHarness({
      connectionName: "legacy_conn",
      driver: "oracle",
    });
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    fs.writeFileSync(path.join(ctx.modelsDir, "User.ts"), "export class User {}", "utf8");

    ctx.loadModule.mockReturnValue({
      User: {
        tableName: "users",
        schema: {
          id: column("increments"),
        } satisfies Record<string, SchemaField>,
      },
    });

    const { makeMigration } = await import("../cli/commands/makeMigration.js");
    await makeMigration("User", {
      test: true,
      connectionName: "legacy_conn" as never,
      exit: false,
    });

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'Skipping make:migration for "legacy_conn": unsupported driver "oracle".',
      ),
    );

    fs.rmSync(ctx.root, { recursive: true, force: true });
  });

  test("covers connection-name driver fallback when config entry is absent", async () => {
    const ctx = setupMakeMigrationHarness({
      connectionName: "legacy_fallback",
      omitConnectionConfig: true,
    });
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    fs.writeFileSync(path.join(ctx.modelsDir, "User.ts"), "export class User {}", "utf8");

    ctx.loadModule.mockReturnValue({
      User: {
        tableName: "users",
        schema: {
          id: column("increments"),
        } satisfies Record<string, SchemaField>,
      },
    });

    const { makeMigration } = await import("../cli/commands/makeMigration.js");
    await makeMigration("User", {
      test: true,
      connectionName: "legacy_fallback" as never,
      exit: false,
    });

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'Skipping make:migration for "legacy_fallback": unsupported driver "legacy_fallback".',
      ),
    );

    fs.rmSync(ctx.root, { recursive: true, force: true });
  });

  test("covers SQL unchanged update migration detection", async () => {
    const ctx = setupMakeMigrationHarness({
      connectionName: "sql_cov",
      driver: "sqlite",
    });
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
    fs.writeFileSync(path.join(ctx.modelsDir, "User.ts"), "export class User {}", "utf8");
    const migrationDir = path.join(ctx.testMigrationsRoot, "sql_cov");
    fs.mkdirSync(migrationDir, { recursive: true });
    fs.writeFileSync(
      path.join(migrationDir, "20000101000000001_create_users_table.ts"),
      "export async function up() {}\nexport async function down() {}\n",
      "utf8",
    );

    ctx.loadModule.mockReturnValue({
      User: {
        tableName: "users",
        schema: {
          id: column("increments"),
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

    const { makeMigration } = await import("../cli/commands/makeMigration.js");
    await makeMigration("User", {
      test: true,
      connectionName: "sql_cov" as never,
      exit: false,
    });
    await makeMigration("User", {
      test: true,
      connectionName: "sql_cov" as never,
      exit: false,
    });

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("Migration unchanged:"));

    fs.rmSync(ctx.root, { recursive: true, force: true });
  });
});

import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync, type SpawnSyncReturns } from "child_process";
import dotenv from "dotenv";
import mysql from "mysql2/promise";
import { Client as PgClient } from "pg";

dotenv.config();
jest.setTimeout(120000);

type CliResult = SpawnSyncReturns<string> & {
  combined: string;
  durationMs: number;
  timeoutMs: number;
};

const rootDir = process.cwd();
const cliPath = path.resolve(rootDir, "dist/cli/eloquent.js");
const testRootDir = path.resolve(rootDir, "src/test");
const testSeedsDir = path.resolve(rootDir, "src/test/database/seeds");
const integrationSeederClass = "CliIntegrationSeeder";
const blogScenarioSeederClass = "BlogScenarioSeeder";
const integrationSeederFile = path.resolve(
  testSeedsDir,
  `${integrationSeederClass}.ts`
);
const hasBuiltCli = fs.existsSync(cliPath);
const appModelsDir = path.resolve(rootDir, "src/app/models");
const hasAppModels = fs.existsSync(appModelsDir);
const hasTestDbEnv = Boolean(
  process.env.DB_HOST &&
    process.env.DB_TEST_USER &&
    process.env.DB_TEST_NAME
);
const hasAppMysqlEnv = Boolean(
  process.env.DB_HOST &&
    process.env.DB_USER &&
    process.env.DB_NAME
);
const hasPgTestEnv = Boolean(
  process.env.PG_TEST_HOST || process.env.PG_HOST
);
const hasPgAppEnv = Boolean(
  process.env.PG_HOST &&
    process.env.PG_USER &&
    (process.env.PG_NAME || process.env.PG_DB_NAME)
);

const describeIfTestDbAndBuild =
  hasTestDbEnv && hasBuiltCli ? describe : describe.skip;

function sanitizePathSegment(segment: string): string {
  return segment.replace(/[^A-Za-z0-9_-]/g, "_");
}

function currentTestConnectionName(): string {
  return process.env.DB_TEST_CONNECTION || "mysql_test";
}

function testMigrationsDir(): string {
  return path.resolve(
    rootDir,
    "src/test/database/migrations",
    sanitizePathSegment(currentTestConnectionName())
  );
}

function connectionMigrationsDir(
  isTest: boolean,
  connectionName: string
): string {
  return path.resolve(
    rootDir,
    isTest ? "src/test/database/migrations" : "src/app/database/migrations",
    sanitizePathSegment(connectionName)
  );
}

function runCli(
  args: string[],
  timeoutMs = 120000,
  input?: string,
  envOverrides?: NodeJS.ProcessEnv
): CliResult {
  const startedAt = Date.now();
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: rootDir,
    env: { ...process.env, ...envOverrides, FORCE_COLOR: "0" },
    encoding: "utf8",
    timeout: timeoutMs,
    input,
  });

  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";

  return {
    ...result,
    combined: `${stdout}\n${stderr}`,
    durationMs: Date.now() - startedAt,
    timeoutMs,
  };
}

function assertCliSuccess(result: CliResult, args: string[]): void {
  if (result.error) {
    const err = result.error as NodeJS.ErrnoException;
    if (err.code === "ETIMEDOUT") {
      throw new Error(
        `CLI command timed out after ${result.timeoutMs}ms: eloquent ${args.join(
          " "
        )}\n\n${result.combined}`
      );
    }
    throw new Error(
      `CLI command failed to spawn after ${result.durationMs}ms: eloquent ${args.join(
        " "
      )}\n${err.message}\n\n${result.combined}`
    );
  }

  expect(result.signal).toBeNull();
  expect(result.status).toBe(0);
  expect(result.durationMs).toBeLessThan(result.timeoutMs);
}

function assertSafeIdentifier(value: string, label: string): void {
  if (!/^[A-Za-z0-9_]+$/.test(value)) {
    throw new Error(`Unsafe ${label}: ${value}`);
  }
}

async function resetMysqlTestDatabase(): Promise<void> {
  const host = process.env.DB_TEST_HOST || process.env.DB_HOST || "localhost";
  const user = process.env.DB_TEST_USER || process.env.DB_USER || "root";
  const password = process.env.DB_TEST_PASSWORD || process.env.DB_PASSWORD || "";
  const database = process.env.DB_TEST_NAME || "db_test";
  const port = Number(process.env.DB_TEST_PORT || 3306);

  assertSafeIdentifier(database, "database name");

  const connection = await mysql.createConnection({
    host,
    user,
    password,
    port,
    multipleStatements: false,
  });

  try {
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\``);
    await connection.query(`USE \`${database}\``);
    await connection.query("SET FOREIGN_KEY_CHECKS = 0");
    const [rows] = await connection.query("SHOW TABLES");
    const tableRows = rows as Record<string, string>[];

    for (const row of tableRows) {
      const tableName = Object.values(row)[0];
      assertSafeIdentifier(tableName, "table name");
      await connection.query(`DROP TABLE IF EXISTS \`${tableName}\``);
    }

    await connection.query("SET FOREIGN_KEY_CHECKS = 1");
  } finally {
    await connection.end();
  }
}

async function resetMysqlDatabase(
  database: string,
  options: {
    host: string;
    user: string;
    password: string;
    port: number;
  }
): Promise<void> {
  assertSafeIdentifier(database, "database name");

  const connection = await mysql.createConnection({
    host: options.host,
    user: options.user,
    password: options.password,
    port: options.port,
    multipleStatements: false,
  });

  try {
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\``);
    await connection.query(`USE \`${database}\``);
    await connection.query("SET FOREIGN_KEY_CHECKS = 0");
    const [rows] = await connection.query("SHOW TABLES");
    const tableRows = rows as Record<string, string>[];

    for (const row of tableRows) {
      const tableName = Object.values(row)[0];
      assertSafeIdentifier(tableName, "table name");
      await connection.query(`DROP TABLE IF EXISTS \`${tableName}\``);
    }

    await connection.query("SET FOREIGN_KEY_CHECKS = 1");
  } finally {
    await connection.end();
  }
}

async function resetPgDatabase(
  database: string,
  options: {
    host: string;
    user: string;
    password: string;
    port: number;
  }
): Promise<void> {
  assertSafeIdentifier(database, "database name");

  const adminDb =
    database === "postgres" ? "template1" : "postgres";
  const client = new PgClient({
    host: options.host,
    user: options.user,
    password: options.password,
    port: options.port,
    database: adminDb,
  });

  await client.connect();

  try {
    await client.query(`CREATE DATABASE "${database}"`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/already exists/i.test(message)) {
      throw error;
    }
  } finally {
    await client.end();
  }

  const dbClient = new PgClient({
    host: options.host,
    user: options.user,
    password: options.password,
    port: options.port,
    database,
  });

  await dbClient.connect();
  try {
    await dbClient.query("DROP SCHEMA IF EXISTS public CASCADE;");
    await dbClient.query("CREATE SCHEMA public;");
  } finally {
    await dbClient.end();
  }
}

function resetSqliteDatabase(filePath: string): void {
  const resolved = path.resolve(rootDir, filePath);
  if (fs.existsSync(resolved)) {
    fs.rmSync(resolved, { force: true });
  }
}

describeIfTestDbAndBuild("CLI integration: migrations + seed + scenario", () => {
  let testRootBackupDir: string | null = null;

  beforeAll(async () => {
    if (!fs.existsSync(testRootDir)) {
      fs.mkdirSync(testRootDir, { recursive: true });
    }

    const backupRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "eloquent-cli-test-root-")
    );
    testRootBackupDir = path.join(backupRoot, "test");
    fs.cpSync(testRootDir, testRootBackupDir, { recursive: true });

    fs.rmSync(testRootDir, { recursive: true, force: true });
    fs.mkdirSync(testRootDir, { recursive: true });

    fs.mkdirSync(testSeedsDir, { recursive: true });
    fs.writeFileSync(
      integrationSeederFile,
      `export async function ${integrationSeederClass}(): Promise<void> {
  console.log("Running seeder: ${integrationSeederClass}");
}
`,
      "utf8"
    );

    const scenarioArgs = [
      "make:scenario",
      "blog",
      "--test",
      "--controllers",
      "--services",
      "--force",
    ];
    const scenarioResult = runCli(scenarioArgs, 180000);
    assertCliSuccess(scenarioResult, scenarioArgs);
    expect(scenarioResult.combined).toContain("Scenario generation complete");

    await resetMysqlTestDatabase();
  });

  afterAll(() => {
    if (!testRootBackupDir) return;
    if (!fs.existsSync(testRootBackupDir)) return;

    fs.rmSync(testRootDir, { recursive: true, force: true });
    fs.cpSync(testRootBackupDir, testRootDir, { recursive: true });
    fs.rmSync(path.dirname(testRootBackupDir), { recursive: true, force: true });
  });

  test("make:migration --all --test exits cleanly", () => {
    const args = ["make:migration", "--all", "--test"];
    const result = runCli(args);

    assertCliSuccess(result, args);
    expect(result.combined).toContain("Migration generation complete");

    const migrationFiles = fs
      .readdirSync(testMigrationsDir())
      .filter((file) => file.endsWith(".ts") || file.endsWith(".js"));
    expect(migrationFiles.length).toBeGreaterThan(0);
  });

  test("migrate:run --test exits cleanly", () => {
    const args = ["migrate:run", "--test"];
    const result = runCli(args);

    assertCliSuccess(result, args);
    expect(result.combined).toContain("Running migrations in TEST mode");
    expect(result.combined).toMatch(
      /No new migrations to run|migration\(s\) applied successfully/i
    );
  });

  test("db:seed --test --class CliIntegrationSeeder exits cleanly", () => {
    const args = ["db:seed", "--test", "--class", integrationSeederClass];
    const result = runCli(args);

    assertCliSuccess(result, args);
    expect(result.combined).toContain(`Running: ${integrationSeederClass}`);
    expect(result.combined).toContain(`Completed: ${integrationSeederClass}`);
  });

  test("demo:scenario --test --random exits cleanly", () => {
    const seedArgs = ["db:seed", "--test", "--class", blogScenarioSeederClass];
    const seedResult = runCli(seedArgs, 180000);

    assertCliSuccess(seedResult, seedArgs);
    expect(seedResult.combined).toContain(`Running: ${blogScenarioSeederClass}`);
    expect(seedResult.combined).toContain(`Completed: ${blogScenarioSeederClass}`);

    const args = ["demo:scenario", "--test", "--random"];
    const result = runCli(args);

    assertCliSuccess(result, args);
    expect(result.combined).toContain("Scenario check: counts");
  });

  test("migrate:rollback --test --step 1 exits cleanly and migrations can be re-applied", () => {
    const rollbackArgs = ["migrate:rollback", "--test", "--step", "1"];
    const rollbackResult = runCli(rollbackArgs, 180000);

    assertCliSuccess(rollbackResult, rollbackArgs);
    expect(rollbackResult.combined).toContain("Rolling back migrations in TEST mode");
    expect(rollbackResult.combined).toMatch(/migration\(s\) rolled back successfully/i);

    const rerunArgs = ["migrate:run", "--test"];
    const rerunResult = runCli(rerunArgs, 180000);

    assertCliSuccess(rerunResult, rerunArgs);
    expect(rerunResult.combined).toContain("Running migrations in TEST mode");
    expect(rerunResult.combined).toMatch(
      /No new migrations to run|migration\(s\) applied successfully/i
    );
  });

  test("make:scenario media --test exits cleanly", () => {
    const args = [
      "make:scenario",
      "media",
      "--test",
      "--controllers",
      "--services",
      "--force",
    ];
    const result = runCli(args, 180000);

    assertCliSuccess(result, args);
    expect(result.combined).toContain("Scenario generation complete");
    expect(result.combined).toContain("MediaScenarioSeeder");
    expect(result.combined).toContain("Seeder created:");
  });
});

const describeIfBuiltOnly = hasBuiltCli ? describe : describe.skip;

describeIfBuiltOnly("CLI integration: migrate:run connection targeting", () => {
  function appMysqlEnv(): NodeJS.ProcessEnv {
    return {
      DB_CONNECTION: "mysql",
    };
  }

  function appPgEnv(): NodeJS.ProcessEnv {
    return {
      DB_CONNECTION: "pg",
      PG_NAME: process.env.PG_NAME || process.env.PG_DB_NAME || "test_db",
    };
  }

  function appSqliteEnv(): NodeJS.ProcessEnv {
    return {
      DB_CONNECTION: "sqlite",
      SQLITE_PATH: "./cli.integration.app.sqlite",
    };
  }

  function appAllConnectionsEnv(): NodeJS.ProcessEnv {
    return {
      DB_CONNECTION: "mysql",
      PG_NAME: process.env.PG_NAME || process.env.PG_DB_NAME || "test_db",
      SQLITE_PATH: "./cli.integration.app.sqlite",
    };
  }

  function testMysqlEnv(): NodeJS.ProcessEnv {
    return {
      DB_TEST_CONNECTION: "mysql_test",
    };
  }

  function testPgEnv(): NodeJS.ProcessEnv {
    return {
      DB_TEST_CONNECTION: "pg_test",
    };
  }

  function testSqliteEnv(): NodeJS.ProcessEnv {
    return {
      DB_TEST_CONNECTION: "sqlite_test",
      SQLITE_TEST_PATH: "./cli.integration.test.sqlite",
    };
  }

  function testAllConnectionsEnv(): NodeJS.ProcessEnv {
    return {
      DB_TEST_CONNECTION: "mysql_test",
      SQLITE_TEST_PATH: "./cli.integration.test.sqlite",
    };
  }

  async function resetAppMysql(): Promise<void> {
    if (!hasAppMysqlEnv) return;
    await resetMysqlDatabase(process.env.DB_NAME || "eloquentjs", {
      host: process.env.DB_HOST || "localhost",
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      port: Number(process.env.DB_PORT || 3306),
    });
  }

  async function resetAppPg(): Promise<void> {
    if (!hasPgAppEnv) return;
    await resetPgDatabase(process.env.PG_NAME || process.env.PG_DB_NAME || "test_db", {
      host: process.env.PG_HOST || "localhost",
      user: process.env.PG_USER || "postgres",
      password: process.env.PG_PASSWORD || "",
      port: Number(process.env.PG_PORT || 5432),
    });
  }

  async function resetAllTestDatabases(): Promise<void> {
    if (hasTestDbEnv) {
      await resetMysqlTestDatabase();
    }
    if (hasPgTestEnv) {
      await resetTestPg();
    }
    resetSqliteDatabase("./cli.integration.test.sqlite");
  }

  async function resetAllAppDatabases(): Promise<void> {
    if (hasAppMysqlEnv && hasAppModels) {
      await resetAppMysql();
    }
    if (hasPgAppEnv && hasAppModels) {
      await resetAppPg();
    }
    resetSqliteDatabase("./cli.integration.app.sqlite");
  }

  async function resetTestPg(): Promise<void> {
    if (!hasPgTestEnv) return;
    await resetPgDatabase(
      process.env.PG_TEST_NAME ||
        process.env.PG_TEST_DB_NAME ||
        process.env.PG_NAME ||
        process.env.PG_DB_NAME ||
        "db_test_pg",
      {
        host: process.env.PG_TEST_HOST || process.env.PG_HOST || "localhost",
        user: process.env.PG_TEST_USER || process.env.PG_USER || "postgres",
        password: process.env.PG_TEST_PASSWORD || process.env.PG_PASSWORD || "",
        port: Number(process.env.PG_TEST_PORT || process.env.PG_PORT || 5432),
      }
    );
  }

  beforeAll(async () => {
    const scenarioArgs = [
      "make:scenario",
      "blog",
      "--test",
      "--controllers",
      "--services",
      "--force",
    ];
    const scenarioResult = runCli(scenarioArgs, 180000);
    assertCliSuccess(scenarioResult, scenarioArgs);

    if (hasAppMysqlEnv && hasAppModels) {
      await resetAppMysql();
    }
    if (hasPgAppEnv && hasAppModels) {
      await resetAppPg();
    }
    if (hasTestDbEnv) {
      await resetMysqlTestDatabase();
    }
    if (hasPgTestEnv) {
      await resetTestPg();
    }
    resetSqliteDatabase("./cli.integration.app.sqlite");
    resetSqliteDatabase("./cli.integration.test.sqlite");
  });

  function migrateTestConnection(args: string[], env?: NodeJS.ProcessEnv): CliResult {
    const result = runCli(args, 240000, undefined, env);
    assertCliSuccess(result, args);
    return result;
  }

  function migrateAppConnection(args: string[], env?: NodeJS.ProcessEnv): CliResult {
    const result = runCli(args, 240000, undefined, env);
    assertCliSuccess(result, args);
    return result;
  }

  test("migrate:run rejects conflicting app connection flags", () => {
    const args = ["migrate:run", "--mysql", "--pg"];
    const result = runCli(args);

    expect(result.status).toBe(1);
    expect(result.combined).toContain(
      "Choose only one explicit connection flag or use --all-connections."
    );
  });

  test("migrate:run rejects conflicting test connection flags", () => {
    const args = ["migrate:run", "--test", "--mysql", "--pg"];
    const result = runCli(args);

    expect(result.status).toBe(1);
    expect(result.combined).toContain(
      "Choose only one explicit connection flag or use --all-connections."
    );
  });

  test("db:seed rejects conflicting test connection flags", () => {
    const args = ["db:seed", "--test", "--mysql", "--pg", "--class", blogScenarioSeederClass];
    const result = runCli(args);

    expect(result.status).toBe(1);
    expect(result.combined).toContain(
      "Choose only one explicit connection flag or use --all-connections."
    );
  });

  (hasTestDbEnv ? test : test.skip)(
    "make:migration --all --test --pivot-separate emits a separate pivot migration",
    () => {
      const args = [
        "make:migration",
        "--all",
        "--test",
        "--pivot-separate",
      ];
      const result = runCli(args, 240000, undefined, testMysqlEnv());

      assertCliSuccess(result, args);
      expect(result.combined).toContain("Pivot migration saved");

      const migrationFiles = fs
        .readdirSync(connectionMigrationsDir(true, "mysql_test"))
        .filter((file) => file.includes("create_post_user_pivot_table.ts"));
      expect(migrationFiles.length).toBeGreaterThan(0);
    }
  );

  test("make:migration User --test generates only the single model migration", () => {
    resetSqliteDatabase("./cli.integration.test.sqlite");
    const sqliteMigrationsDir = connectionMigrationsDir(true, "sqlite_test");
    fs.rmSync(sqliteMigrationsDir, { recursive: true, force: true });

    const args = ["make:migration", "User", "--test"];
    const result = runCli(args, 240000, undefined, testSqliteEnv());

    assertCliSuccess(result, args);
    expect(result.combined).toContain("create_users_table");
    expect(result.combined).not.toContain("create_posts_table");
    expect(result.combined).not.toContain("create_comments_table");

    const migrationFiles = fs
      .readdirSync(sqliteMigrationsDir)
      .filter((file) => file.endsWith(".ts") || file.endsWith(".js"));
    expect(migrationFiles.some((file) => file.includes("create_users_table"))).toBe(true);
    expect(migrationFiles.some((file) => file.includes("create_posts_table"))).toBe(false);
    expect(migrationFiles.some((file) => file.includes("create_comments_table"))).toBe(false);
  });

  test("migrate:run:test --sqlite --all-migrations --pivot-separate exits cleanly", () => {
    resetSqliteDatabase("./cli.integration.test.sqlite");

    const args = [
      "migrate:run:test",
      "--sqlite",
      "--all-migrations",
      "--pivot-separate",
    ];
    const result = runCli(args, 240000, undefined, testSqliteEnv());

    assertCliSuccess(result, args);
    expect(result.combined).toContain("Pivot migration saved");
    expect(result.combined).toContain('Running migrations in TEST mode on "sqlite_test"');
  });

  (hasAppMysqlEnv && hasAppModels ? test : test.skip)(
    "migrate:run --mysql --all-migrations exits cleanly",
    async () => {
      await resetAppMysql();

      const args = ["migrate:run", "--mysql", "--all-migrations"];
      const result = runCli(args, 180000, undefined, appMysqlEnv());

      assertCliSuccess(result, args);
      expect(result.combined).toContain('Running migrations in DEVELOPMENT mode on "mysql"');
      expect(result.combined).toMatch(
        /No new migrations to run|migration\(s\) applied successfully/i
      );
    }
  );

  (hasPgAppEnv && hasAppModels ? test : test.skip)(
    "migrate:run --pg --all-migrations exits cleanly",
    async () => {
      await resetAppPg();

      const args = ["migrate:run", "--pg", "--all-migrations"];
      const result = runCli(args, 180000, undefined, appPgEnv());

      assertCliSuccess(result, args);
      expect(result.combined).toContain('Running migrations in DEVELOPMENT mode on "pg"');
      expect(result.combined).toMatch(
        /No new migrations to run|migration\(s\) applied successfully/i
      );
    }
  );

  (hasAppModels ? test : test.skip)(
    "migrate:run --sqlite --all-migrations exits cleanly",
    () => {
      resetSqliteDatabase("./cli.integration.app.sqlite");

      const args = ["migrate:run", "--sqlite", "--all-migrations"];
      const result = runCli(args, 180000, undefined, appSqliteEnv());

      assertCliSuccess(result, args);
      expect(result.combined).toContain('Running migrations in DEVELOPMENT mode on "sqlite"');
      expect(result.combined).toMatch(
        /No new migrations to run|migration\(s\) applied successfully/i
      );
    }
  );

  (hasAppModels ? test : test.skip)(
    "migrate:run --sqlite --all-migrations --pivot-separate emits app pivot migration and exits cleanly",
    () => {
      resetSqliteDatabase("./cli.integration.app.sqlite");
      const sqliteMigrationsDir = connectionMigrationsDir(false, "sqlite");
      fs.rmSync(sqliteMigrationsDir, { recursive: true, force: true });

      const args = [
        "migrate:run",
        "--sqlite",
        "--all-migrations",
        "--pivot-separate",
      ];
      const result = runCli(args, 240000, undefined, appSqliteEnv());

      assertCliSuccess(result, args);
      expect(result.combined).toContain("Pivot migration saved");
      expect(result.combined).toContain(
        'Running migrations in DEVELOPMENT mode on "sqlite"'
      );

      const migrationFiles = fs
        .readdirSync(sqliteMigrationsDir)
        .filter((file) => file.endsWith(".ts") || file.endsWith(".js"));
      expect(
        migrationFiles.some((file) => file.includes("create_post_user_pivot_table"))
      ).toBe(true);
    }
  );

  (hasTestDbEnv ? test : test.skip)(
    "migrate:run --test --mysql --all-migrations exits cleanly",
    async () => {
      await resetMysqlTestDatabase();

      const args = ["migrate:run", "--test", "--mysql", "--all-migrations"];
      const result = runCli(args, 180000, undefined, testMysqlEnv());

      assertCliSuccess(result, args);
      expect(result.combined).toContain('Running migrations in TEST mode on "mysql_test"');
      expect(result.combined).toMatch(
        /No new migrations to run|migration\(s\) applied successfully/i
      );
    }
  );

  (hasTestDbEnv ? test : test.skip)(
    "db:seed --test --mysql --class BlogScenarioSeeder exits cleanly",
    async () => {
      await resetMysqlTestDatabase();
      migrateTestConnection(
        ["migrate:run", "--test", "--mysql", "--all-migrations"],
        testMysqlEnv()
      );

      const args = ["db:seed", "--test", "--mysql", "--class", blogScenarioSeederClass];
      const result = runCli(args, 240000, undefined, testMysqlEnv());

      assertCliSuccess(result, args);
      expect(result.combined).toContain("Seeding connection: mysql_test");
      expect(result.combined).toContain(`Completed: ${blogScenarioSeederClass}`);
    }
  );

  (hasPgTestEnv ? test : test.skip)(
    "migrate:run --test --pg --all-migrations exits cleanly",
    async () => {
      await resetTestPg();

      const args = ["migrate:run", "--test", "--pg", "--all-migrations"];
      const result = runCli(args, 180000, undefined, testPgEnv());

      assertCliSuccess(result, args);
      expect(result.combined).toContain('Running migrations in TEST mode on "pg_test"');
      expect(result.combined).toMatch(
        /No new migrations to run|migration\(s\) applied successfully/i
      );
    }
  );

  (hasPgTestEnv ? test : test.skip)(
    "db:seed --test --pg --class BlogScenarioSeeder exits cleanly",
    async () => {
      await resetTestPg();
      migrateTestConnection(
        ["migrate:run", "--test", "--pg", "--all-migrations"],
        testPgEnv()
      );

      const args = ["db:seed", "--test", "--pg", "--class", blogScenarioSeederClass];
      const result = runCli(args, 240000, undefined, testPgEnv());

      assertCliSuccess(result, args);
      expect(result.combined).toContain("Seeding connection: pg_test");
      expect(result.combined).toContain(`Completed: ${blogScenarioSeederClass}`);
    }
  );

  test("migrate:run --test --sqlite --all-migrations exits cleanly", () => {
    resetSqliteDatabase("./cli.integration.test.sqlite");

    const args = ["migrate:run", "--test", "--sqlite", "--all-migrations"];
    const result = runCli(args, 180000, undefined, testSqliteEnv());

    assertCliSuccess(result, args);
    expect(result.combined).toContain('Running migrations in TEST mode on "sqlite_test"');
    expect(result.combined).toMatch(
      /No new migrations to run|migration\(s\) applied successfully/i
    );
  });

  test("db:seed --test --sqlite --class BlogScenarioSeeder exits cleanly", () => {
    resetSqliteDatabase("./cli.integration.test.sqlite");
    migrateTestConnection(
      ["migrate:run", "--test", "--sqlite", "--all-migrations"],
      testSqliteEnv()
    );

    const args = ["db:seed", "--test", "--sqlite", "--class", blogScenarioSeederClass];
    const result = runCli(args, 240000, undefined, testSqliteEnv());

    assertCliSuccess(result, args);
    expect(result.combined).toContain("Seeding connection: sqlite_test");
    expect(result.combined).toContain(`Completed: ${blogScenarioSeederClass}`);
  });

  (hasAppModels ? test : test.skip)(
    "db:seed --sqlite --class UserSeeder exits cleanly",
    () => {
      resetSqliteDatabase("./cli.integration.app.sqlite");
      migrateAppConnection(
        ["migrate:run", "--sqlite", "--all-migrations"],
        appSqliteEnv()
      );

      const args = ["db:seed", "--sqlite", "--class", "UserSeeder"];
      const result = runCli(args, 240000, undefined, appSqliteEnv());

      assertCliSuccess(result, args);
      expect(result.combined).toContain("Seeding connection: sqlite");
      expect(result.combined).toContain("Completed: UserSeeder");
    }
  );

  (hasAppModels ? test : test.skip)(
    "demo:scenario --user 1 exits cleanly in app sqlite mode after BlogScenarioSeeder",
    () => {
      resetSqliteDatabase("./cli.integration.app.sqlite");
      migrateAppConnection(
        ["migrate:run", "--sqlite", "--all-migrations", "--pivot-separate"],
        appSqliteEnv()
      );

      const seedArgs = ["db:seed", "--sqlite", "--class", blogScenarioSeederClass];
      const seedResult = runCli(seedArgs, 240000, undefined, appSqliteEnv());

      assertCliSuccess(seedResult, seedArgs);
      expect(seedResult.combined).toContain("Seeding connection: sqlite");
      expect(seedResult.combined).toContain(`Completed: ${blogScenarioSeederClass}`);

      const args = ["demo:scenario", "--user", "1"];
      const result = runCli(args, 240000, undefined, appSqliteEnv());

      assertCliSuccess(result, args);
      expect(result.combined).toContain("Scenario check: counts");
      expect(result.combined).toContain("Scenario check: relations");
      expect(result.combined).toContain("favorite posts:");
    }
  );

  (hasAppModels ? test : test.skip)(
    "db:seed:fresh --sqlite --class UserSeeder exits cleanly",
    () => {
      resetSqliteDatabase("./cli.integration.app.sqlite");

      const args = [
        "db:seed:fresh",
        "--sqlite",
        "--class",
        "UserSeeder",
        "--force",
      ];
      const result = runCli(args, 240000, undefined, appSqliteEnv());

      assertCliSuccess(result, args);
      expect(result.combined).toContain("Rebuilding database for sqlite");
      expect(result.combined).toContain("Completed: UserSeeder");
    }
  );

  (hasAppMysqlEnv && hasAppModels ? test : test.skip)(
    "db:seed:fresh --mysql --class UserSeeder exits cleanly",
    async () => {
      await resetAppMysql();

      const args = [
        "db:seed:fresh",
        "--mysql",
        "--class",
        "UserSeeder",
        "--force",
      ];
      const result = runCli(args, 300000, undefined, appMysqlEnv());

      assertCliSuccess(result, args);
      expect(result.combined).toContain("Rebuilding database for mysql");
      expect(result.combined).toContain("Completed: UserSeeder");
    }
  );

  (hasPgAppEnv && hasAppModels ? test : test.skip)(
    "db:seed --pg --class UserSeeder exits cleanly",
    async () => {
      await resetAppPg();
      migrateAppConnection(
        ["migrate:run", "--pg", "--all-migrations"],
        appPgEnv()
      );

      const args = ["db:seed", "--pg", "--class", "UserSeeder"];
      const result = runCli(args, 240000, undefined, appPgEnv());

      assertCliSuccess(result, args);
      expect(result.combined).toContain("Seeding connection: pg");
      expect(result.combined).toContain("Completed: UserSeeder");
    }
  );

  (hasPgAppEnv && hasAppModels ? test : test.skip)(
    "db:seed:fresh --pg --class UserSeeder exits cleanly",
    async () => {
      await resetAppPg();

      const args = [
        "db:seed:fresh",
        "--pg",
        "--class",
        "UserSeeder",
        "--force",
      ];
      const result = runCli(args, 300000, undefined, appPgEnv());

      assertCliSuccess(result, args);
      expect(result.combined).toContain("Rebuilding database for pg");
      expect(result.combined).toContain("Completed: UserSeeder");
    }
  );

  (hasAppMysqlEnv && hasPgAppEnv && hasAppModels ? test : test.skip)(
    "migrate:run --all-connections --all-migrations exits cleanly in app mode",
    async () => {
      await resetAllAppDatabases();

      const args = ["migrate:run", "--all-connections", "--all-migrations"];
      const result = runCli(args, 240000, undefined, {
        ...appAllConnectionsEnv(),
      });

      assertCliSuccess(result, args);
      expect(result.combined).toContain('Running migrations in DEVELOPMENT mode on "mysql"');
      expect(result.combined).toContain('Running migrations in DEVELOPMENT mode on "pg"');
      expect(result.combined).toContain('Running migrations in DEVELOPMENT mode on "sqlite"');
    }
  );

  (hasAppMysqlEnv && hasPgAppEnv && hasAppModels ? test : test.skip)(
    "db:seed --all-connections --class UserSeeder exits cleanly in app mode",
    async () => {
      await resetAllAppDatabases();
      migrateAppConnection(
        ["migrate:run", "--all-connections", "--all-migrations"],
        appAllConnectionsEnv()
      );

      const args = ["db:seed", "--all-connections", "--class", "UserSeeder"];
      const result = runCli(args, 240000, undefined, appAllConnectionsEnv());

      assertCliSuccess(result, args);
      expect(result.combined).toContain("Seeding connection: mysql");
      expect(result.combined).toContain("Seeding connection: pg");
      expect(result.combined).toContain("Seeding connection: sqlite");
      expect(result.combined).toContain("Completed: UserSeeder");
    }
  );

  (hasAppMysqlEnv && hasPgAppEnv && hasAppModels ? test : test.skip)(
    "db:seed:fresh --all-connections --class UserSeeder exits cleanly in app mode",
    async () => {
      await resetAllAppDatabases();

      const args = [
        "db:seed:fresh",
        "--all-connections",
        "--class",
        "UserSeeder",
        "--force",
      ];
      const result = runCli(args, 300000, undefined, appAllConnectionsEnv());

      assertCliSuccess(result, args);
      expect(result.combined).toContain("Rebuilding database for mysql");
      expect(result.combined).toContain("Rebuilding database for pg");
      expect(result.combined).toContain("Rebuilding database for sqlite");
      expect(result.combined).toContain("Completed: UserSeeder");
    }
  );

  (hasTestDbEnv && hasPgTestEnv ? test : test.skip)(
    "migrate:run:test --all-connections --all-migrations exits cleanly in test mode",
    async () => {
      await resetAllTestDatabases();

      const args = ["migrate:run:test", "--all-connections", "--all-migrations"];
      const result = runCli(args, 240000, undefined, {
        ...testAllConnectionsEnv(),
      });

      assertCliSuccess(result, args);
      expect(result.combined).toContain('Running migrations in TEST mode on "mysql_test"');
      expect(result.combined).toContain('Running migrations in TEST mode on "pg_test"');
      expect(result.combined).toContain('Running migrations in TEST mode on "sqlite_test"');
    }
  );

  (hasTestDbEnv && hasPgTestEnv ? test : test.skip)(
    "db:seed --test --all-connections --class BlogScenarioSeeder exits cleanly",
    async () => {
      await resetAllTestDatabases();
      migrateTestConnection(
        ["migrate:run:test", "--all-connections", "--all-migrations"],
        testAllConnectionsEnv()
      );

      const args = [
        "db:seed",
        "--test",
        "--all-connections",
        "--class",
        blogScenarioSeederClass,
      ];
      const result = runCli(args, 240000, undefined, {
        ...testAllConnectionsEnv(),
      });

      assertCliSuccess(result, args);
      expect(result.combined).toContain("Seeding connection: mysql_test");
      expect(result.combined).toContain("Seeding connection: pg_test");
      expect(result.combined).toContain("Seeding connection: sqlite_test");
      expect(result.combined).toContain(`Completed: ${blogScenarioSeederClass}`);
    }
  );

  test("db:seed:fresh --test --sqlite --class BlogScenarioSeeder exits cleanly", () => {
    resetSqliteDatabase("./cli.integration.test.sqlite");

    const args = [
      "db:seed:fresh",
      "--test",
      "--sqlite",
      "--class",
      blogScenarioSeederClass,
      "--force",
    ];
    const result = runCli(args, 240000, undefined, testSqliteEnv());

    assertCliSuccess(result, args);
    expect(result.combined).toContain("Rebuilding database for sqlite_test");
    expect(result.combined).toContain(`Completed: ${blogScenarioSeederClass}`);
  });

  (hasAppModels ? test : test.skip)(
    "migrate:status shows app sqlite migration status",
    () => {
      resetSqliteDatabase("./cli.integration.app.sqlite");
      migrateAppConnection(
        ["migrate:run", "--sqlite", "--all-migrations"],
        appSqliteEnv()
      );

      const args = ["migrate:status"];
      const result = runCli(args, 240000, undefined, appSqliteEnv());

      assertCliSuccess(result, args);
      expect(result.combined).toContain("Migration Status");
      expect(result.combined).toContain("create_users_table");
    }
  );

  (hasAppModels ? test : test.skip)(
    "migrate:rollback --step 1 exits cleanly for app sqlite",
    () => {
      resetSqliteDatabase("./cli.integration.app.sqlite");
      migrateAppConnection(
        ["migrate:run", "--sqlite", "--all-migrations"],
        appSqliteEnv()
      );

      const args = ["migrate:rollback", "--step", "1"];
      const result = runCli(args, 240000, undefined, appSqliteEnv());

      assertCliSuccess(result, args);
      expect(result.combined).toContain("Rolling back migrations in DEVELOPMENT mode");
      expect(result.combined).toMatch(/migration\(s\) rolled back successfully/i);
    }
  );

  (hasAppMysqlEnv && hasAppModels ? test : test.skip)(
    "migrate:rollback --step 1 exits cleanly for app mysql",
    async () => {
      await resetAppMysql();
      migrateAppConnection(
        ["migrate:run", "--mysql", "--all-migrations"],
        appMysqlEnv()
      );

      const args = ["migrate:rollback", "--step", "1"];
      const result = runCli(args, 240000, undefined, appMysqlEnv());

      assertCliSuccess(result, args);
      expect(result.combined).toContain("Rolling back migrations in DEVELOPMENT mode");
      expect(result.combined).toContain("Connected to mysql");
      expect(result.combined).toMatch(/migration\(s\) rolled back successfully/i);
    }
  );

  (hasPgAppEnv && hasAppModels ? test : test.skip)(
    "migrate:rollback --step 1 exits cleanly for app pg",
    async () => {
      await resetAppPg();
      migrateAppConnection(
        ["migrate:run", "--pg", "--all-migrations"],
        appPgEnv()
      );

      const args = ["migrate:rollback", "--step", "1"];
      const result = runCli(args, 240000, undefined, appPgEnv());

      assertCliSuccess(result, args);
      expect(result.combined).toContain("Rolling back migrations in DEVELOPMENT mode");
      expect(result.combined).toContain("Connected to pg");
      expect(result.combined).toMatch(/migration\(s\) rolled back successfully/i);
    }
  );

  test("migrate:status --test shows sqlite_test migration status", () => {
    resetSqliteDatabase("./cli.integration.test.sqlite");
    migrateTestConnection(
      ["migrate:run", "--test", "--sqlite", "--all-migrations"],
      testSqliteEnv()
    );

    const args = ["migrate:status", "--test"];
    const result = runCli(args, 240000, undefined, testSqliteEnv());

    assertCliSuccess(result, args);
    expect(result.combined).toContain("Migration Status");
    expect(result.combined).toContain("create_users_table");
  });

  (hasAppModels ? test : test.skip)(
    "migrate:fresh --force exits cleanly for app sqlite",
    () => {
      resetSqliteDatabase("./cli.integration.app.sqlite");
      migrateAppConnection(
        ["migrate:run", "--sqlite", "--all-migrations"],
        appSqliteEnv()
      );

      const args = ["migrate:fresh", "--force"];
      const result = runCli(args, 240000, undefined, appSqliteEnv());

      assertCliSuccess(result, args);
      expect(result.combined).toContain("All tables dropped. Re-running migrations");
      expect(result.combined).toContain('Running migrations in DEVELOPMENT mode on "sqlite"');
    }
  );

  test("migrate:fresh --test --force exits cleanly for sqlite_test", () => {
    resetSqliteDatabase("./cli.integration.test.sqlite");
    migrateTestConnection(
      ["migrate:run", "--test", "--sqlite", "--all-migrations"],
      testSqliteEnv()
    );

    const args = ["migrate:fresh", "--test", "--force"];
    const result = runCli(args, 240000, undefined, testSqliteEnv());

    assertCliSuccess(result, args);
    expect(result.combined).toContain("All tables dropped. Re-running migrations");
    expect(result.combined).toContain('Running migrations in TEST mode on "sqlite_test"');
  });

  (hasAppModels ? test : test.skip)(
    "migrate:reset exits cleanly for app sqlite",
    () => {
      resetSqliteDatabase("./cli.integration.app.sqlite");
      migrateAppConnection(
        ["migrate:run", "--sqlite", "--all-migrations"],
        appSqliteEnv()
      );

      const args = ["migrate:reset"];
      const result = runCli(args, 240000, undefined, appSqliteEnv());

      assertCliSuccess(result, args);
      expect(result.combined).toContain("Resetting development database");
      expect(result.combined).toMatch(/migration\(s\) rolled back successfully/i);
    }
  );

  test("migrate:reset --test exits cleanly for sqlite_test", () => {
    resetSqliteDatabase("./cli.integration.test.sqlite");
    migrateTestConnection(
      ["migrate:run", "--test", "--sqlite", "--all-migrations"],
      testSqliteEnv()
    );

    const args = ["migrate:reset", "--test"];
    const result = runCli(args, 240000, undefined, testSqliteEnv());

    assertCliSuccess(result, args);
    expect(result.combined).toContain("Resetting test database");
    expect(result.combined).toMatch(/migration\(s\) rolled back successfully/i);
  });

  test("demo:scenario --test --user 1 exits cleanly", () => {
    resetSqliteDatabase("./cli.integration.test.sqlite");
    migrateTestConnection(
      ["migrate:run", "--test", "--sqlite", "--all-migrations"],
      testSqliteEnv()
    );
    const seedResult = runCli(
      ["db:seed", "--test", "--sqlite", "--class", blogScenarioSeederClass],
      240000,
      undefined,
      testSqliteEnv()
    );
    assertCliSuccess(seedResult, ["db:seed", "--test", "--sqlite", "--class", blogScenarioSeederClass]);

    const args = ["demo:scenario", "--test", "--user", "1"];
    const result = runCli(args, 240000, undefined, testSqliteEnv());

    assertCliSuccess(result, args);
    expect(result.combined).toContain("Scenario check: relations");
    expect(result.combined).toContain("user:");
  });

  test("factory:status --details --test exits cleanly", () => {
    const args = ["factory:status", "--details", "--test"];
    const result = runCli(args, 240000);

    assertCliSuccess(result, args);
    expect(result.combined).toContain("Factory Status");
    expect(result.combined).toContain("CommentFactory");
  });

  test("factory:status --graph --test exits cleanly", () => {
    const args = ["factory:status", "--graph", "--test"];
    const result = runCli(args, 240000);

    assertCliSuccess(result, args);
    expect(result.combined).toContain("Model Relationship Graph");
    expect(result.combined).toContain("User");
  });

  (hasTestDbEnv && hasPgTestEnv ? test : test.skip)(
    "db:seed:fresh --test --all-connections --class BlogScenarioSeeder exits cleanly",
    async () => {
      await resetAllTestDatabases();

      const args = [
        "db:seed:fresh",
        "--test",
        "--all-connections",
        "--class",
        blogScenarioSeederClass,
        "--force",
      ];
      const result = runCli(args, 300000, undefined, {
        ...testAllConnectionsEnv(),
      });

      assertCliSuccess(result, args);
      expect(result.combined).toContain("Rebuilding database for mysql_test");
      expect(result.combined).toContain("Rebuilding database for pg_test");
      expect(result.combined).toContain("Rebuilding database for sqlite_test");
      expect(result.combined).toContain(`Completed: ${blogScenarioSeederClass}`);
    }
  );
});

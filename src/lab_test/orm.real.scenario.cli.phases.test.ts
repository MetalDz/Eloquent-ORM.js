import fs from "fs";
import path from "path";
import { spawnSync, type SpawnSyncReturns } from "child_process";
import dotenv from "dotenv";
import mysql from "mysql2/promise";
import { Client as PgClient } from "pg";

dotenv.config();
jest.setTimeout(420000);

type CliResult = SpawnSyncReturns<string> & {
  combined: string;
  durationMs: number;
  timeoutMs: number;
};

const rootDir = process.cwd();
const cliPath = path.resolve(rootDir, "dist/cli/eloquent.js");
const hasBuiltCli = fs.existsSync(cliPath);
const spawnProbe = spawnSync(process.execPath, ["-v"], { encoding: "utf8" });
const canSpawn = !spawnProbe.error;

const requestedPhase = (process.env.ELOQUENT_VALIDATION_PHASE || "all").toLowerCase();

const appSqlitePath = "./orm.validation.app.sqlite";
const testSqlitePath = "./orm.validation.test.sqlite";

const hasMysqlAppEnv = Boolean(
  process.env.DB_HOST &&
    process.env.DB_USER &&
    process.env.DB_NAME
);
const hasMysqlTestEnv = Boolean(
  process.env.DB_HOST &&
    process.env.DB_TEST_USER &&
    process.env.DB_TEST_NAME
);
const hasPgAppEnv = Boolean(
  process.env.PG_HOST &&
    process.env.PG_USER &&
    (process.env.PG_NAME || process.env.PG_DB_NAME)
);
const hasPgTestEnv = Boolean(
  process.env.PG_TEST_HOST || process.env.PG_HOST
);

function phaseEnabled(phase: number): boolean {
  const value = String(phase);
  return (
    requestedPhase === "all" ||
    requestedPhase === value ||
    requestedPhase === `phase${value}` ||
    requestedPhase === `phase-${value}`
  );
}

function phaseDescribe(phase: number, label: string, body: () => void): void {
  const runner = phaseEnabled(phase) ? describe : describe.skip;
  runner(`Phase ${phase} - ${label}`, body);
}

function sanitizePathSegment(segment: string): string {
  return segment.replace(/[^A-Za-z0-9_-]/g, "_");
}

function defaultAppMysqlDatabaseName(): string {
  try {
    const packageJsonPath = path.resolve(rootDir, "package.json");
    const raw = fs.readFileSync(packageJsonPath, "utf8");
    const pkg = JSON.parse(raw) as { name?: string };
    const packageName = String(pkg.name || "").trim();
    if (!packageName) {
      return "eloquent_orm_js";
    }
    return packageName.replace(/[^A-Za-z0-9_]/g, "_");
  } catch {
    return "eloquent_orm_js";
  }
}

function resolveAbsolute(filePath: string): string {
  return path.resolve(rootDir, filePath);
}

function resetSqliteDatabase(filePath: string): void {
  const resolved = resolveAbsolute(filePath);
  if (fs.existsSync(resolved)) {
    fs.rmSync(resolved, { force: true });
  }
}

function appMysqlEnv(): NodeJS.ProcessEnv {
  return {
    DB_CONNECTION: "mysql",
  };
}

function appPgEnv(): NodeJS.ProcessEnv {
  return {
    DB_CONNECTION: "pg",
  };
}

function appSqliteEnv(): NodeJS.ProcessEnv {
  return {
    DB_CONNECTION: "sqlite",
    SQLITE_PATH: appSqlitePath,
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
    SQLITE_TEST_PATH: testSqlitePath,
  };
}

function runCli(
  args: string[],
  timeoutMs = 300000,
  envOverrides?: NodeJS.ProcessEnv
): CliResult {
  const startedAt = Date.now();
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: rootDir,
    env: { ...process.env, ...envOverrides, FORCE_COLOR: "0" },
    encoding: "utf8",
    timeout: timeoutMs,
  });

  return {
    ...result,
    combined: `${result.stdout ?? ""}\n${result.stderr ?? ""}`,
    durationMs: Date.now() - startedAt,
    timeoutMs,
  };
}

function assertCliSuccess(result: CliResult, args: string[]): void {
  if (result.error) {
    const err = result.error as NodeJS.ErrnoException;
    if (err.code === "ETIMEDOUT") {
      throw new Error(
        `CLI timed out after ${result.timeoutMs}ms: eloquent ${args.join(" ")}\n\n${result.combined}`
      );
    }
    throw new Error(
      `CLI spawn failed after ${result.durationMs}ms: eloquent ${args.join(" ")}\n${err.message}\n\n${result.combined}`
    );
  }

  expect(result.signal).toBeNull();
  expect(result.status).toBe(0);
}

function assertCliFailure(
  result: CliResult,
  args: string[],
  expectedPattern?: RegExp
): void {
  if (result.error) {
    const err = result.error as NodeJS.ErrnoException;
    throw new Error(
      `CLI spawn failed after ${result.durationMs}ms: eloquent ${args.join(" ")}\n${err.message}\n\n${result.combined}`
    );
  }

  expect(result.signal).toBeNull();
  expect(result.status).not.toBe(0);
  if (expectedPattern) {
    expect(result.combined).toMatch(expectedPattern);
  }
}

function runCliSuccess(
  args: string[],
  envOverrides?: NodeJS.ProcessEnv,
  timeoutMs = 300000
): void {
  const result = runCli(args, timeoutMs, envOverrides);
  assertCliSuccess(result, args);
}

function maybeTest(
  condition: boolean,
  name: string,
  fn: () => PromiseLike<unknown> | void
): void {
  const callback = fn as jest.ProvidesCallback;
  if (condition) {
    test(name, callback);
    return;
  }

  test.skip(name, callback);
}

function assertSafeIdentifier(value: string, label: string): void {
  if (!/^[A-Za-z0-9_]+$/.test(value)) {
    throw new Error(`Unsafe ${label}: ${value}`);
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

  const adminDb = database === "postgres" ? "template1" : "postgres";
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

async function resetAppMysqlDatabase(): Promise<void> {
  await resetMysqlDatabase(process.env.DB_NAME || defaultAppMysqlDatabaseName(), {
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    port: Number(process.env.DB_PORT || 3306),
  });
}

async function resetTestMysqlDatabase(): Promise<void> {
  await resetMysqlDatabase(process.env.DB_TEST_NAME || "db_test", {
    host: process.env.DB_TEST_HOST || process.env.DB_HOST || "localhost",
    user: process.env.DB_TEST_USER || process.env.DB_USER || "root",
    password: process.env.DB_TEST_PASSWORD || process.env.DB_PASSWORD || "",
    port: Number(process.env.DB_TEST_PORT || 3306),
  });
}

async function resetAppPgDatabase(): Promise<void> {
  await resetPgDatabase(process.env.PG_NAME || process.env.PG_DB_NAME || "test_db", {
    host: process.env.PG_HOST || "localhost",
    user: process.env.PG_USER || "postgres",
    password: process.env.PG_PASSWORD || "",
    port: Number(process.env.PG_PORT || 5432),
  });
}

async function resetTestPgDatabase(): Promise<void> {
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

const describeIfRunnable = hasBuiltCli && canSpawn ? describe : describe.skip;

describeIfRunnable("ORM real-situation validation via CLI phases", () => {
  phaseDescribe(1, "Scenario scaffolding + migration generation", () => {
    test("make:scenario without --test is blocked in production", () => {
      const args = [
        "make:scenario",
        "BlogRuntime",
        "--preset",
        "blog",
        "--controllers",
        "--services",
        "--force",
      ];
      const result = runCli(args, 300000, {
        ...appSqliteEnv(),
        APP_ENV: "production",
      });
      assertCliFailure(result, args, /restricted to --test in production/i);
    });

    test("build test scenario fixtures with full scenario options", () => {
      runCliSuccess(
        [
          "make:scenario",
          "BlogRuntime",
          "--test",
          "--preset",
          "blog",
          "--controllers",
          "--services",
          "--force",
        ],
        testSqliteEnv()
      );
    });

    test("build app baseline fixtures (model, factory, seeder)", () => {
      runCliSuccess(
        [
          "make:model",
          "User",
          "--attrs-from-schema",
          "--force",
        ],
        appSqliteEnv()
      );
      runCliSuccess(
        [
          "make:factory",
          "UserFactory",
          "--model",
          "User",
          "--force",
        ],
        appSqliteEnv()
      );
      runCliSuccess(
        [
          "make:seed",
          "User",
          "--count",
          "10",
        ],
        appSqliteEnv()
      );
    });

    test("generate app migrations for all SQL connections", () => {
      runCliSuccess(
        [
          "make:migration",
          "all",
          "--all",
          "--all-connections",
          "--pivot-separate",
        ],
        appSqliteEnv()
      );
    });

    test("generate test migrations for all SQL connections", () => {
      runCliSuccess(
        [
          "make:migration",
          "all",
          "--test",
          "--all",
          "--all-connections",
          "--pivot-separate",
        ],
        testSqliteEnv()
      );
    });
  });

  phaseDescribe(2, "App-mode migrate + seed + status per driver", () => {
    maybeTest(hasMysqlAppEnv, "mysql app lifecycle", async () => {
      await resetAppMysqlDatabase();
      runCliSuccess(
        ["migrate:run", "--mysql", "--all-migrations", "--pivot-separate"],
        appMysqlEnv()
      );
      runCliSuccess(
        ["db:seed", "--mysql", "--class", "UserSeeder"],
        appMysqlEnv()
      );
      runCliSuccess(
        ["migrate:status", "--mysql", "--all-migrations"],
        appMysqlEnv()
      );
    });

    maybeTest(hasPgAppEnv, "pg app lifecycle", async () => {
      await resetAppPgDatabase();
      runCliSuccess(
        ["migrate:run", "--pg", "--all-migrations", "--pivot-separate"],
        appPgEnv()
      );
      runCliSuccess(
        ["db:seed", "--pg", "--class", "UserSeeder"],
        appPgEnv()
      );
      runCliSuccess(
        ["migrate:status", "--pg", "--all-migrations"],
        appPgEnv()
      );
    });

    test("sqlite app lifecycle", () => {
      resetSqliteDatabase(appSqlitePath);
      runCliSuccess(
        ["migrate:run", "--sqlite", "--all-migrations", "--pivot-separate"],
        appSqliteEnv()
      );
      runCliSuccess(
        ["db:seed", "--sqlite", "--class", "UserSeeder"],
        appSqliteEnv()
      );
      runCliSuccess(
        ["migrate:status", "--sqlite", "--all-migrations"],
        appSqliteEnv()
      );
    });
  });

  phaseDescribe(3, "Test-mode migrate + seed + status per driver", () => {
    maybeTest(hasMysqlTestEnv, "mysql_test lifecycle via --test", async () => {
      await resetTestMysqlDatabase();
      runCliSuccess(
        ["migrate:run", "--test", "--mysql", "--all-migrations", "--pivot-separate"],
        testMysqlEnv()
      );
      runCliSuccess(
        ["db:seed", "--test", "--mysql", "--class", "BlogScenarioSeeder"],
        testMysqlEnv()
      );
      runCliSuccess(
        ["migrate:status", "--test", "--mysql", "--all-migrations"],
        testMysqlEnv()
      );
    });

    maybeTest(hasPgTestEnv, "pg_test lifecycle via migrate:run --test", async () => {
      await resetTestPgDatabase();
      runCliSuccess(
        ["migrate:run", "--test", "--pg", "--all-migrations", "--pivot-separate"],
        testPgEnv()
      );
      runCliSuccess(
        ["db:seed", "--test", "--pg", "--class", "BlogScenarioSeeder"],
        testPgEnv()
      );
      runCliSuccess(
        ["migrate:status", "--test", "--pg", "--all-migrations"],
        testPgEnv()
      );
    });

    test("sqlite_test lifecycle", () => {
      resetSqliteDatabase(testSqlitePath);
      runCliSuccess(
        ["migrate:run", "--test", "--sqlite", "--all-migrations", "--pivot-separate"],
        testSqliteEnv()
      );
      runCliSuccess(
        ["db:seed", "--test", "--sqlite", "--class", "BlogScenarioSeeder"],
        testSqliteEnv()
      );
      runCliSuccess(
        ["migrate:status", "--test", "--sqlite", "--all-migrations"],
        testSqliteEnv()
      );
    });
  });

  phaseDescribe(4, "Rollback + re-apply verification", () => {
    maybeTest(hasMysqlAppEnv, "app mysql rollback then rerun", () => {
      runCliSuccess(
        ["migrate:rollback", "--mysql", "--step", "1"],
        appMysqlEnv()
      );
      runCliSuccess(
        ["migrate:run", "--mysql", "--all-migrations"],
        appMysqlEnv()
      );
    });

    maybeTest(hasPgAppEnv, "app pg rollback then rerun", () => {
      runCliSuccess(
        ["migrate:rollback", "--pg", "--step", "1"],
        appPgEnv()
      );
      runCliSuccess(
        ["migrate:run", "--pg", "--all-migrations"],
        appPgEnv()
      );
    });

    test("app sqlite rollback then rerun", () => {
      runCliSuccess(
        ["migrate:rollback", "--sqlite", "--step", "1"],
        appSqliteEnv()
      );
      runCliSuccess(
        ["migrate:run", "--sqlite", "--all-migrations"],
        appSqliteEnv()
      );
    });

    maybeTest(hasMysqlTestEnv, "test mysql rollback then rerun", () => {
      runCliSuccess(
        ["migrate:rollback", "--test", "--mysql", "--step", "1"],
        testMysqlEnv()
      );
      runCliSuccess(
        ["migrate:run", "--test", "--mysql", "--all-migrations"],
        testMysqlEnv()
      );
    });

    maybeTest(hasPgTestEnv, "test pg rollback then rerun", () => {
      runCliSuccess(
        ["migrate:rollback", "--test", "--pg", "--step", "1"],
        testPgEnv()
      );
      runCliSuccess(
        ["migrate:run", "--test", "--pg", "--all-migrations"],
        testPgEnv()
      );
    });

    test("test sqlite rollback then rerun", () => {
      runCliSuccess(
        ["migrate:rollback", "--test", "--sqlite", "--step", "1"],
        testSqliteEnv()
      );
      runCliSuccess(
        ["migrate:run", "--test", "--sqlite", "--all-migrations"],
        testSqliteEnv()
      );
    });
  });

  phaseDescribe(5, "Fresh/reset/all-connections + seed:fresh", () => {
    const hasAllAppConnections = hasMysqlAppEnv && hasPgAppEnv;
    const hasAllTestConnections = hasMysqlTestEnv && hasPgTestEnv;

    maybeTest(
      hasAllAppConnections,
      "app all-connections migrate + seed + seed:fresh + reset",
      async () => {
        await resetAppMysqlDatabase();
        await resetAppPgDatabase();
        resetSqliteDatabase(appSqlitePath);

        runCliSuccess(
          ["migrate:run", "--all-connections", "--all-migrations", "--pivot-separate"],
          appSqliteEnv()
        );
        runCliSuccess(
          ["db:seed", "--all-connections", "--class", "UserSeeder"],
          appSqliteEnv()
        );
        runCliSuccess(
          ["db:seed:fresh", "--all-connections", "--class", "UserSeeder", "--force"],
          appSqliteEnv(),
          420000
        );
        runCliSuccess(
          ["migrate:reset", "--all-connections"],
          appSqliteEnv()
        );
      }
    );

    maybeTest(
      hasAllTestConnections,
      "test all-connections migrate + seed + seed:fresh + reset",
      async () => {
        await resetTestMysqlDatabase();
        await resetTestPgDatabase();
        resetSqliteDatabase(testSqlitePath);

        runCliSuccess(
          ["migrate:run", "--test", "--all-connections", "--all-migrations", "--pivot-separate"],
          testSqliteEnv()
        );
        runCliSuccess(
          ["db:seed", "--test", "--all-connections", "--class", "BlogScenarioSeeder"],
          testSqliteEnv()
        );
        runCliSuccess(
          [
            "db:seed:fresh",
            "--test",
            "--all-connections",
            "--class",
            "BlogScenarioSeeder",
            "--force",
          ],
          testSqliteEnv(),
          420000
        );
        runCliSuccess(
          ["migrate:reset", "--test", "--all-connections"],
          testSqliteEnv()
        );
      }
    );

    test("sqlite-only fresh/reset safety in app and test modes", () => {
      runCliSuccess(
        ["migrate:fresh", "--sqlite", "--all-migrations", "--force"],
        appSqliteEnv()
      );
      runCliSuccess(
        ["db:seed:fresh", "--sqlite", "--class", "UserSeeder", "--force"],
        appSqliteEnv()
      );
      runCliSuccess(
        ["migrate:reset", "--sqlite"],
        appSqliteEnv()
      );

      runCliSuccess(
        ["migrate:fresh", "--test", "--sqlite", "--all-migrations", "--force"],
        testSqliteEnv()
      );
      runCliSuccess(
        ["db:seed:fresh", "--test", "--sqlite", "--class", "BlogScenarioSeeder", "--force"],
        testSqliteEnv()
      );
      runCliSuccess(
        ["migrate:reset", "--test", "--sqlite"],
        testSqliteEnv()
      );
    });
  });
});

describe.skip("ORM real-situation validation prerequisites", () => {
  test(`CLI dist build present: ${hasBuiltCli}`, () => {
    expect(hasBuiltCli).toBe(true);
  });

  test(`Child-process spawn available: ${canSpawn}`, () => {
    expect(canSpawn).toBe(true);
  });

  test(`Requested phase selector: ${requestedPhase}`, () => {
    expect(["all", "1", "2", "3", "4", "5", "phase1", "phase2", "phase3", "phase4", "phase5", "phase-1", "phase-2", "phase-3", "phase-4", "phase-5"]).toContain(requestedPhase);
  });
});

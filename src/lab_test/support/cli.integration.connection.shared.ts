import fs from "fs";
import os from "os";
import path from "path";
import type { CliResult } from "./cli.integration.harness";
import {
  appRootDir,
  assertCliSuccess,
  bootstrapAppFixtures,
  canSpawnCli,
  ensureDir,
  hasAppModels,
  hasAppMysqlEnv,
  hasBuiltCli,
  hasPgAppEnv,
  hasPgTestEnv,
  hasTestDbEnv,
  resetMysqlDatabase,
  resetMysqlTestDatabase,
  resetPgDatabase,
  resetSqliteDatabase,
  rootDir,
  runCli,
} from "./cli.integration.harness";

export const describeIfBuiltOnly =
  hasBuiltCli && canSpawnCli ? describe : describe.skip;

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

export function appMysqlEnv(): NodeJS.ProcessEnv {
  return {
    DB_CONNECTION: "mysql",
  };
}

export function appPgEnv(): NodeJS.ProcessEnv {
  return {
    DB_CONNECTION: "pg",
    PG_NAME: process.env.PG_NAME || process.env.PG_DB_NAME || "test_db",
  };
}

export function appSqliteEnv(): NodeJS.ProcessEnv {
  return {
    DB_CONNECTION: "sqlite",
    SQLITE_PATH: "./cli.integration.app.sqlite",
  };
}

export function appAllConnectionsEnv(): NodeJS.ProcessEnv {
  return {
    DB_CONNECTION: "mysql",
    PG_NAME: process.env.PG_NAME || process.env.PG_DB_NAME || "test_db",
    SQLITE_PATH: "./cli.integration.app.sqlite",
  };
}

export function testMysqlEnv(): NodeJS.ProcessEnv {
  return {
    DB_TEST_CONNECTION: "mysql_test",
  };
}

export function testPgEnv(): NodeJS.ProcessEnv {
  return {
    DB_TEST_CONNECTION: "pg_test",
  };
}

export function testSqliteEnv(): NodeJS.ProcessEnv {
  return {
    DB_TEST_CONNECTION: "sqlite_test",
    SQLITE_TEST_PATH: "./cli.integration.test.sqlite",
  };
}

export function testAllConnectionsEnv(): NodeJS.ProcessEnv {
  return {
    DB_TEST_CONNECTION: "mysql_test",
    SQLITE_TEST_PATH: "./cli.integration.test.sqlite",
  };
}

export async function resetAppMysql(): Promise<void> {
  if (!hasAppMysqlEnv) return;
  await resetMysqlDatabase(process.env.DB_NAME || defaultAppMysqlDatabaseName(), {
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    port: Number(process.env.DB_PORT || 3306),
  });
}

export async function resetAppPg(): Promise<void> {
  if (!hasPgAppEnv) return;
  await resetPgDatabase(process.env.PG_NAME || process.env.PG_DB_NAME || "test_db", {
    host: process.env.PG_HOST || "localhost",
    user: process.env.PG_USER || "postgres",
    password: process.env.PG_PASSWORD || "",
    port: Number(process.env.PG_PORT || 5432),
  });
}

export async function resetTestPg(): Promise<void> {
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

export async function resetAllTestDatabases(): Promise<void> {
  if (hasTestDbEnv) {
    await resetMysqlTestDatabase();
  }
  if (hasPgTestEnv) {
    await resetTestPg();
  }
  resetSqliteDatabase("./cli.integration.test.sqlite");
}

export async function resetAllAppDatabases(): Promise<void> {
  if (hasAppMysqlEnv && hasAppModels) {
    await resetAppMysql();
  }
  if (hasPgAppEnv && hasAppModels) {
    await resetAppPg();
  }
  resetSqliteDatabase("./cli.integration.app.sqlite");
}

export function migrateTestConnection(args: string[], env?: NodeJS.ProcessEnv): CliResult {
  const result = runCli(args, 240000, undefined, env);
  assertCliSuccess(result, args);
  return result;
}

export function migrateAppConnection(args: string[], env?: NodeJS.ProcessEnv): CliResult {
  const result = runCli(args, 240000, undefined, env);
  assertCliSuccess(result, args);
  return result;
}

export function registerConnectionFixtureLifecycle(): void {
  let appRootBackupDir: string | null = null;

  beforeAll(async () => {
    const appBackupRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "eloquent-cli-app-root-")
    );
    appRootBackupDir = path.join(appBackupRoot, "app");
    if (fs.existsSync(appRootDir)) {
      fs.cpSync(appRootDir, appRootBackupDir, { recursive: true });
    }

    fs.rmSync(appRootDir, { recursive: true, force: true });
    ensureDir(appRootDir);
    bootstrapAppFixtures();

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

  afterAll(() => {
    if (!appRootBackupDir) return;

    fs.rmSync(appRootDir, { recursive: true, force: true });
    if (fs.existsSync(appRootBackupDir)) {
      fs.cpSync(appRootBackupDir, appRootDir, { recursive: true });
      fs.rmSync(path.dirname(appRootBackupDir), { recursive: true, force: true });
    }
  });
}

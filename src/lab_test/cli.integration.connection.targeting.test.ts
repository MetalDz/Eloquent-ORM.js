import fs from "fs";
import os from "os";
import path from "path";
import type { CliResult } from "./support/cli.integration.harness";
import {
  appRootDir,
  assertCliSuccess,
  blogScenarioSeederClass,
  bootstrapAppFixtures,
  connectionMigrationsDir,
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
} from "./support/cli.integration.harness";

const describeIfBuiltOnly = hasBuiltCli ? describe : describe.skip;

describeIfBuiltOnly("CLI integration: migrate:run connection targeting", () => {
  let appRootBackupDir: string | null = null;

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

  test("make:migration rejects conflicting connection flags", () => {
    const args = ["make:migration", "--all", "--mysql", "--pg"];
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
      expect(result.combined).toMatch(/Pivot migration (saved|unchanged)/);

      const migrationFiles = fs
        .readdirSync(connectionMigrationsDir(true, "mysql_test"))
        .filter((file) => file.includes("create_post_user_pivot_table.ts"));
      expect(migrationFiles.length).toBeGreaterThan(0);
    }
  );

  test("make:migration --all --pg emits app pg migrations", () => {
    const pgMigrationsDir = connectionMigrationsDir(false, "pg");
    fs.rmSync(pgMigrationsDir, { recursive: true, force: true });

    const args = ["make:migration", "--all", "--pg"];
    const result = runCli(args, 240000, undefined, appPgEnv());

    assertCliSuccess(result, args);
    expect(result.combined).toContain("Using connection: pg");

    const migrationFiles = fs
      .readdirSync(pgMigrationsDir)
      .filter((file) => file.endsWith(".ts") || file.endsWith(".js"));
    expect(migrationFiles.length).toBeGreaterThan(0);
  });

  test("make:migration --all --test --pg emits test pg migrations", () => {
    const pgMigrationsDir = connectionMigrationsDir(true, "pg_test");
    fs.rmSync(pgMigrationsDir, { recursive: true, force: true });

    const args = ["make:migration", "--all", "--test", "--pg"];
    const result = runCli(args, 240000, undefined, testPgEnv());

    assertCliSuccess(result, args);
    expect(result.combined).toContain("Using connection: pg_test");

    const migrationFiles = fs
      .readdirSync(pgMigrationsDir)
      .filter((file) => file.endsWith(".ts") || file.endsWith(".js"));
    expect(migrationFiles.some((file) => file.includes("create_comments_table"))).toBe(true);
    expect(migrationFiles.some((file) => file.includes("create_users_table"))).toBe(true);
    expect(migrationFiles.some((file) => file.includes("create_posts_table"))).toBe(true);

    const rerunResult = runCli(args, 240000, undefined, testPgEnv());
    assertCliSuccess(rerunResult, args);
    expect(rerunResult.combined).toMatch(
      /Migration unchanged|Baseline CREATE already exists/
    );

    const rerunFiles = fs
      .readdirSync(pgMigrationsDir)
      .filter((file) => file.endsWith(".ts") || file.endsWith(".js"));
    expect(rerunFiles).toEqual(migrationFiles);
  });

  test("make:migration --all --all-connections emits app migrations for all SQL drivers", () => {
    const mysqlMigrationsDir = connectionMigrationsDir(false, "mysql");
    const pgMigrationsDir = connectionMigrationsDir(false, "pg");
    const sqliteMigrationsDir = connectionMigrationsDir(false, "sqlite");

    fs.rmSync(mysqlMigrationsDir, { recursive: true, force: true });
    fs.rmSync(pgMigrationsDir, { recursive: true, force: true });
    fs.rmSync(sqliteMigrationsDir, { recursive: true, force: true });

    const args = ["make:migration", "--all", "--all-connections"];
    const result = runCli(args, 240000, undefined, appAllConnectionsEnv());

    assertCliSuccess(result, args);
    expect(result.combined).toContain("Using connection: mysql");
    expect(result.combined).toContain("Using connection: pg");
    expect(result.combined).toContain("Using connection: sqlite");

    const countFiles = (dir: string): number =>
      fs
        .readdirSync(dir)
        .filter((file) => file.endsWith(".ts") || file.endsWith(".js")).length;

    expect(countFiles(mysqlMigrationsDir)).toBeGreaterThanOrEqual(3);
    expect(countFiles(pgMigrationsDir)).toBeGreaterThanOrEqual(3);
    expect(countFiles(sqliteMigrationsDir)).toBeGreaterThanOrEqual(3);
  });

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
    expect(result.combined).toMatch(/Pivot migration (saved|unchanged)/);
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
      expect(result.combined).toMatch(/Pivot migration (saved|unchanged)/);
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

  (hasAppMysqlEnv && hasAppModels ? test : test.skip)(
    "migrate:run --mysql --all-migrations --pivot-separate emits app pivot migration and exits cleanly",
    async () => {
      await resetAppMysql();
      const mysqlMigrationsDir = connectionMigrationsDir(false, "mysql");
      fs.rmSync(mysqlMigrationsDir, { recursive: true, force: true });

      const args = [
        "migrate:run",
        "--mysql",
        "--all-migrations",
        "--pivot-separate",
      ];
      const result = runCli(args, 240000, undefined, appMysqlEnv());

      assertCliSuccess(result, args);
      expect(result.combined).toMatch(/Pivot migration (saved|unchanged)/);
      expect(result.combined).toContain(
        'Running migrations in DEVELOPMENT mode on "mysql"'
      );

      const migrationFiles = fs
        .readdirSync(mysqlMigrationsDir)
        .filter((file) => file.endsWith(".ts") || file.endsWith(".js"));
      expect(
        migrationFiles.some((file) => file.includes("create_post_user_pivot_table"))
      ).toBe(true);
    }
  );

  (hasPgAppEnv && hasAppModels ? test : test.skip)(
    "migrate:run --pg --all-migrations --pivot-separate emits app pivot migration and exits cleanly",
    async () => {
      await resetAppPg();
      const pgMigrationsDir = connectionMigrationsDir(false, "pg");
      fs.rmSync(pgMigrationsDir, { recursive: true, force: true });

      const args = [
        "migrate:run",
        "--pg",
        "--all-migrations",
        "--pivot-separate",
      ];
      const result = runCli(args, 240000, undefined, appPgEnv());

      assertCliSuccess(result, args);
      expect(result.combined).toMatch(/Pivot migration (saved|unchanged)/);
      expect(result.combined).toContain(
        'Running migrations in DEVELOPMENT mode on "pg"'
      );

      const migrationFiles = fs
        .readdirSync(pgMigrationsDir)
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
    "demo:scenario --random exits cleanly in app sqlite mode after BlogScenarioSeeder",
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

      const args = ["demo:scenario", "--random"];
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

  (hasTestDbEnv ? test : test.skip)(
    "db:seed:fresh --test --mysql --class BlogScenarioSeeder exits cleanly",
    async () => {
      await resetMysqlTestDatabase();

      const args = [
        "db:seed:fresh",
        "--test",
        "--mysql",
        "--class",
        blogScenarioSeederClass,
        "--force",
      ];
      const result = runCli(args, 300000, undefined, testMysqlEnv());

      assertCliSuccess(result, args);
      expect(result.combined).toContain("Rebuilding database for mysql_test");
      expect(result.combined).toContain(`Completed: ${blogScenarioSeederClass}`);
    }
  );

  (hasPgTestEnv ? test : test.skip)(
    "db:seed:fresh --test --pg --class BlogScenarioSeeder exits cleanly",
    async () => {
      await resetTestPg();

      const args = [
        "db:seed:fresh",
        "--test",
        "--pg",
        "--class",
        blogScenarioSeederClass,
        "--force",
      ];
      const result = runCli(args, 300000, undefined, testPgEnv());

      assertCliSuccess(result, args);
      expect(result.combined).toContain("Rebuilding database for pg_test");
      expect(result.combined).toContain(`Completed: ${blogScenarioSeederClass}`);
    }
  );

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


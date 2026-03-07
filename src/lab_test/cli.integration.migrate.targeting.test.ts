import fs from "fs";
import {
  assertCliSuccess,
  connectionMigrationsDir,
  hasAppModels,
  hasAppMysqlEnv,
  hasPgAppEnv,
  hasPgTestEnv,
  hasTestDbEnv,
  resetMysqlTestDatabase,
  resetSqliteDatabase,
  runCli,
} from "./support/cli.integration.harness";
import {
  appAllConnectionsEnv,
  appMysqlEnv,
  appPgEnv,
  appSqliteEnv,
  describeIfBuiltOnly,
  migrateAppConnection,
  migrateTestConnection,
  registerConnectionFixtureLifecycle,
  resetAllAppDatabases,
  resetAllTestDatabases,
  resetAppMysql,
  resetAppPg,
  resetTestPg,
  testAllConnectionsEnv,
  testMysqlEnv,
  testPgEnv,
  testSqliteEnv,
} from "./support/cli.integration.connection.shared";

describeIfBuiltOnly("CLI integration: migrate:* connection targeting", () => {
  registerConnectionFixtureLifecycle();

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

  test("migrate:run --test --sqlite --all-migrations --pivot-separate exits cleanly", () => {
    resetSqliteDatabase("./cli.integration.test.sqlite");

    const args = [
      "migrate:run",
      "--test",
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

      const args = ["migrate:run", "--sqlite", "--all-migrations", "--pivot-separate"];
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

      const args = ["migrate:run", "--mysql", "--all-migrations", "--pivot-separate"];
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

      const args = ["migrate:run", "--pg", "--all-migrations", "--pivot-separate"];
      const result = runCli(args, 240000, undefined, appPgEnv());

      assertCliSuccess(result, args);
      expect(result.combined).toMatch(/Pivot migration (saved|unchanged)/);
      expect(result.combined).toContain('Running migrations in DEVELOPMENT mode on "pg"');

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

  (hasTestDbEnv && hasPgTestEnv ? test : test.skip)(
    "migrate:run --test --all-connections --all-migrations exits cleanly in test mode",
    async () => {
      await resetAllTestDatabases();

      const args = ["migrate:run", "--test", "--all-connections", "--all-migrations"];
      const result = runCli(args, 240000, undefined, {
        ...testAllConnectionsEnv(),
      });

      assertCliSuccess(result, args);
      expect(result.combined).toContain('Running migrations in TEST mode on "mysql_test"');
      expect(result.combined).toContain('Running migrations in TEST mode on "pg_test"');
      expect(result.combined).toContain('Running migrations in TEST mode on "sqlite_test"');
    }
  );

  (hasAppModels ? test : test.skip)(
    "migrate:status shows app sqlite migration status",
    () => {
      resetSqliteDatabase("./cli.integration.app.sqlite");
      migrateAppConnection(["migrate:run", "--sqlite", "--all-migrations"], appSqliteEnv());

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
      migrateAppConnection(["migrate:run", "--sqlite", "--all-migrations"], appSqliteEnv());

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
      migrateAppConnection(["migrate:run", "--mysql", "--all-migrations"], appMysqlEnv());

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
      migrateAppConnection(["migrate:run", "--pg", "--all-migrations"], appPgEnv());

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
      migrateAppConnection(["migrate:run", "--sqlite", "--all-migrations"], appSqliteEnv());

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
      migrateAppConnection(["migrate:run", "--sqlite", "--all-migrations"], appSqliteEnv());

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
});

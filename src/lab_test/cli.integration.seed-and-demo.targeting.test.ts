import {
  assertCliSuccess,
  blogScenarioSeederClass,
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

describeIfBuiltOnly("CLI integration: db:seed and demo:scenario targeting", () => {
  registerConnectionFixtureLifecycle();

  test("db:seed rejects conflicting test connection flags", () => {
    const args = ["db:seed", "--test", "--mysql", "--pg", "--class", blogScenarioSeederClass];
    const result = runCli(args);

    expect(result.status).toBe(1);
    expect(result.combined).toContain(
      "Choose only one explicit connection flag or use --all-connections."
    );
  });

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
      migrateAppConnection(["migrate:run", "--sqlite", "--all-migrations"], appSqliteEnv());

      const args = ["db:seed", "--sqlite", "--class", "UserSeeder"];
      const result = runCli(args, 240000, undefined, appSqliteEnv());

      assertCliSuccess(result, args);
      expect(result.combined).toContain("Seeding connection: sqlite");
      expect(result.combined).toContain("Completed: UserSeeder");
    }
  );

  (hasPgAppEnv && hasAppModels ? test : test.skip)(
    "db:seed --pg --class UserSeeder exits cleanly",
    async () => {
      await resetAppPg();
      migrateAppConnection(["migrate:run", "--pg", "--all-migrations"], appPgEnv());

      const args = ["db:seed", "--pg", "--class", "UserSeeder"];
      const result = runCli(args, 240000, undefined, appPgEnv());

      assertCliSuccess(result, args);
      expect(result.combined).toContain("Seeding connection: pg");
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

  (hasAppModels ? test : test.skip)(
    "db:seed:fresh --sqlite --class UserSeeder exits cleanly",
    () => {
      resetSqliteDatabase("./cli.integration.app.sqlite");

      const args = ["db:seed:fresh", "--sqlite", "--class", "UserSeeder", "--force"];
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

      const args = ["db:seed:fresh", "--mysql", "--class", "UserSeeder", "--force"];
      const result = runCli(args, 300000, undefined, appMysqlEnv());

      assertCliSuccess(result, args);
      expect(result.combined).toContain("Rebuilding database for mysql");
      expect(result.combined).toContain("Completed: UserSeeder");
    }
  );

  (hasPgAppEnv && hasAppModels ? test : test.skip)(
    "db:seed:fresh --pg --class UserSeeder exits cleanly",
    async () => {
      await resetAppPg();

      const args = ["db:seed:fresh", "--pg", "--class", "UserSeeder", "--force"];
      const result = runCli(args, 300000, undefined, appPgEnv());

      assertCliSuccess(result, args);
      expect(result.combined).toContain("Rebuilding database for pg");
      expect(result.combined).toContain("Completed: UserSeeder");
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

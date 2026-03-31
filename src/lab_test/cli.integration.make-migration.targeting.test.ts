import fs from "fs";
import {
  assertCliSuccess,
  connectionMigrationsDir,
  hasTestDbEnv,
  resetSqliteDatabase,
  runCli,
} from "./support/cli.integration.harness.js";
import {
  appAllConnectionsEnv,
  appPgEnv,
  describeIfBuiltOnly,
  registerConnectionFixtureLifecycle,
  testMysqlEnv,
  testPgEnv,
  testSqliteEnv,
} from "./support/cli.integration.connection.shared.js";

describeIfBuiltOnly("CLI integration: make:migration connection targeting", () => {
  registerConnectionFixtureLifecycle();

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
      const args = ["make:migration", "--all", "--test", "--pivot-separate"];
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
});

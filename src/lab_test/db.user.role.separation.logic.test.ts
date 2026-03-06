import {
  resolveDbExecutionRole,
  resolveMysqlEnv,
  resolvePgEnv,
  resolveSqlitePath,
} from "../config/dbRoleEnv";

describe("DB user role separation env contract", () => {
  test("defaults to runtime role", () => {
    expect(resolveDbExecutionRole({})).toBe("runtime");
    expect(resolveDbExecutionRole({ ELOQUENT_DB_ROLE: "runtime" })).toBe(
      "runtime"
    );
  });

  test("uses migration role when explicitly requested", () => {
    expect(resolveDbExecutionRole({ ELOQUENT_DB_ROLE: "migration" })).toBe(
      "migration"
    );
  });

  test("resolves mysql runtime vs migration credentials", () => {
    const runtime = resolveMysqlEnv({
      DB_RUNTIME_USER: "app_user",
      DB_RUNTIME_PASSWORD: "app_pass",
      DB_RUNTIME_NAME: "app_db",
      DB_HOST: "localhost",
      ELOQUENT_DB_ROLE: "runtime",
    });

    const migration = resolveMysqlEnv({
      DB_MIGRATION_USER: "migrator",
      DB_MIGRATION_PASSWORD: "migrator_pass",
      DB_MIGRATION_NAME: "app_db",
      DB_HOST: "localhost",
      ELOQUENT_DB_ROLE: "migration",
    });

    expect(runtime.user).toBe("app_user");
    expect(runtime.password).toBe("app_pass");
    expect(runtime.database).toBe("app_db");
    expect(migration.user).toBe("migrator");
    expect(migration.password).toBe("migrator_pass");
    expect(migration.database).toBe("app_db");
  });

  test("resolves test mysql migration credentials with highest priority", () => {
    const config = resolveMysqlEnv(
      {
        ELOQUENT_DB_ROLE: "migration",
        DB_TEST_USER: "test_runtime",
        DB_TEST_MIGRATION_USER: "test_migrator",
        DB_USER: "fallback",
      },
      { test: true }
    );

    expect(config.user).toBe("test_migrator");
  });

  test("resolves pg migration credentials and database fallback chain", () => {
    const config = resolvePgEnv({
      ELOQUENT_DB_ROLE: "migration",
      PG_MIGRATION_USER: "pg_migrator",
      PG_MIGRATION_PASSWORD: "pg_secret",
      PG_MIGRATION_DB_NAME: "pg_app_db",
      PG_HOST: "localhost",
    });

    expect(config.user).toBe("pg_migrator");
    expect(config.password).toBe("pg_secret");
    expect(config.database).toBe("pg_app_db");
  });

  test("resolves sqlite runtime vs migration paths", () => {
    const runtimePath = resolveSqlitePath({
      ELOQUENT_DB_ROLE: "runtime",
      SQLITE_RUNTIME_PATH: "./runtime.sqlite",
    });
    const migrationPath = resolveSqlitePath({
      ELOQUENT_DB_ROLE: "migration",
      SQLITE_MIGRATION_PATH: "./migration.sqlite",
    });

    expect(runtimePath).toBe("./runtime.sqlite");
    expect(migrationPath).toBe("./migration.sqlite");
  });
});


import { dbConfig } from "../config/database";
import {
  NativeSqlMigrationLockStrategy,
  resetMigrationLockStrategy,
} from "../cli/utils/migrations/MigrationLockStrategy";
import type { DriverAdapter } from "../core/connection/DriverAdapter";
import type { ConnectionName } from "../core/connection/ConnectionFactory";

type MockAdapter = DriverAdapter & {
  query: jest.Mock;
  queryOne: jest.Mock;
  execute: jest.Mock;
};

function makeAdapter(name: ConnectionName): MockAdapter {
  const query = jest.fn();
  const queryOne = jest.fn();
  const execute = jest.fn();

  return {
    name,
    kind: "sql",
    query,
    queryOne,
    execute,
    insert: jest.fn(),
    placeholder: (index: number) => (name.includes("pg") ? `$${index}` : "?"),
    placeholders: (count: number, startIndex = 1) =>
      Array.from({ length: count }, (_, idx) =>
        name.includes("pg") ? `$${startIndex + idx}` : "?"
      ).join(", "),
    inClause: (field: string, values: unknown[], startIndex = 1) => ({
      sql: `${field} IN (${Array.from({ length: values.length }, () => "?").join(", ")})`,
      params: values,
      nextIndex: startIndex + values.length,
    }),
    wrapId: (id: string) => `\`${id}\``,
  };
}

describe("LTS phase 5 MigrationLockStrategy coverage", () => {
  let mysqlDriverBefore: string;

  beforeEach(() => {
    mysqlDriverBefore = dbConfig.connections.mysql.driver;
  });

  afterEach(() => {
    dbConfig.connections.mysql.driver = mysqlDriverBefore as any;
    resetMigrationLockStrategy();
    jest.restoreAllMocks();
  });

  test("release swallows PostgreSQL advisory unlock cleanup failures", async () => {
    const strategy = new NativeSqlMigrationLockStrategy();
    const pg = makeAdapter("pg_test");

    pg.queryOne.mockRejectedValueOnce(new Error("pg unlock failed"));

    await expect(strategy.release(pg, "owner-pg")).resolves.toBeUndefined();
    expect(pg.queryOne).toHaveBeenCalledWith(
      expect.stringContaining("pg_advisory_unlock"),
      [expect.any(Number)]
    );
  });

  test("release completes PostgreSQL advisory unlock cleanup when no error is raised", async () => {
    const strategy = new NativeSqlMigrationLockStrategy();
    const pg = makeAdapter("pg_test");

    pg.queryOne.mockResolvedValueOnce({ released: true });

    await expect(strategy.release(pg, "owner-pg-ok")).resolves.toBeUndefined();
    expect(pg.queryOne).toHaveBeenCalledWith(
      expect.stringContaining("pg_advisory_unlock"),
      [expect.any(Number)]
    );
  });

  test("release swallows MySQL lock cleanup failures", async () => {
    const strategy = new NativeSqlMigrationLockStrategy();
    const mysql = makeAdapter("mysql_test");

    mysql.queryOne.mockRejectedValueOnce(new Error("mysql release failed"));

    await expect(strategy.release(mysql, "owner-mysql")).resolves.toBeUndefined();
    expect(mysql.queryOne).toHaveBeenCalledWith(
      expect.stringContaining("RELEASE_LOCK"),
      ["eloquentjs:migrate:mysql_test"]
    );
  });

  test("release completes MySQL lock cleanup when no error is raised", async () => {
    const strategy = new NativeSqlMigrationLockStrategy();
    const mysql = makeAdapter("mysql_test");

    mysql.queryOne.mockResolvedValueOnce({ released: 1 });

    await expect(strategy.release(mysql, "owner-mysql-ok")).resolves.toBeUndefined();
    expect(mysql.queryOne).toHaveBeenCalledWith(
      expect.stringContaining("RELEASE_LOCK"),
      ["eloquentjs:migrate:mysql_test"]
    );
  });

  test("sqlite release swallows rollback fallback cleanup noise after a failed commit", async () => {
    const strategy = new NativeSqlMigrationLockStrategy();
    const sqlite = makeAdapter("sqlite_test");

    sqlite.execute
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("commit-fail"))
      .mockRejectedValueOnce(new Error("rollback-fail-too"));

    await expect(strategy.acquire(sqlite, "owner-sqlite")).resolves.toBeUndefined();
    await expect(strategy.release(sqlite, "owner-sqlite", { success: true })).resolves.toBeUndefined();

    expect(sqlite.execute).toHaveBeenCalledWith("COMMIT;");
    expect(sqlite.execute).toHaveBeenCalledWith("ROLLBACK;");
  });
});

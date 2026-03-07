import fs from "fs";
import path from "path";
import {
  acquireMigrationLock,
  ensureMigrationTables,
  releaseMigrationLock,
} from "../cli/utils/migrations/MigrationTracker";
import type { DriverAdapter } from "../core/connection/DriverAdapter";

type MockAdapter = DriverAdapter & {
  query: jest.Mock;
  queryOne: jest.Mock;
  execute: jest.Mock;
};

function makeAdapter(name: "mysql_test" | "pg_test" | "sqlite_test"): MockAdapter {
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
    placeholder: (index: number) => (name === "pg_test" ? `$${index}` : "?"),
    placeholders: (count: number, startIndex = 1) =>
      Array.from(
        { length: count },
        (_, offset) => (name === "pg_test" ? `$${startIndex + offset}` : "?")
      ).join(", "),
    inClause: (field: string, values: unknown[], startIndex = 1) => ({
      sql:
        name === "pg_test"
          ? `${field} = ANY($${startIndex})`
          : `${field} IN (${Array.from({ length: values.length }, () => "?").join(", ")})`,
      params: name === "pg_test" ? [values] : values,
      nextIndex: startIndex + (name === "pg_test" ? 1 : values.length),
    }),
    wrapId: (id: string) => `\`${id}\``,
  };
}

describe("migration tracker single-table contract plan", () => {
  const rootDir = process.cwd();

  test("task doc defines the single-table target and clarifies the confusing migration artifact case", () => {
    const plan = fs.readFileSync(
      path.resolve(
        rootDir,
        "validation tasks/Migration-Tracker-Single-Table-Contract-Plan.md"
      ),
      "utf8"
    );

    const requiredSnippets = [
      "# Migration Tracker Single-Table Contract Plan",
      "consumer database persists only the `migrations` table",
      "migration_locks",
      "20260304130722001_create_cligeneratortestartifacts_table.ts",
      "Generated `create_*_table.ts` files are schema source artifacts, not tracker tables.",
      "pg_advisory_lock",
      "GET_LOCK",
      "BEGIN IMMEDIATE",
      "Acceptance Criteria",
      "`ensureMigrationTables()` creates only the `migrations` table.",
    ];

    for (const snippet of requiredSnippets) {
      expect(plan).toContain(snippet);
    }
  });

  test("task doc captures legacy compatibility decision for migration_locks", () => {
    const plan = fs.readFileSync(
      path.resolve(
        rootDir,
        "validation tasks/Migration-Tracker-Single-Table-Contract-Plan.md"
      ),
      "utf8"
    );

    const requiredSnippets = [
      "Phase 4 Decision (Implemented)",
      "ignore legacy `migration_locks`",
      "optional/manual",
      "legacy-only",
    ];

    for (const snippet of requiredSnippets) {
      expect(plan).toContain(snippet);
    }
  });

  test("ensureMigrationTables creates only migrations tracker structures and no migration_locks table", async () => {
    const adapter = makeAdapter("mysql_test");
    adapter.query.mockResolvedValueOnce([]);

    await ensureMigrationTables(adapter);

    const executedSql = adapter.execute.mock.calls.map(([sql]) => String(sql));
    expect(executedSql.some((sql) => /CREATE TABLE IF NOT EXISTS migrations/i.test(sql))).toBe(
      true
    );
    expect(executedSql.some((sql) => /migration_locks/i.test(sql))).toBe(false);
  });

  test("migration concurrency protection uses native per-driver locks (mysql + pg)", async () => {
    const mysqlAdapter = makeAdapter("mysql_test");
    mysqlAdapter.queryOne
      .mockResolvedValueOnce({ acquired: 1 })
      .mockResolvedValueOnce({ released: 1 });

    await acquireMigrationLock(mysqlAdapter, "owner-mysql");
    await releaseMigrationLock(mysqlAdapter, "owner-mysql");

    expect(mysqlAdapter.queryOne).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("GET_LOCK"),
      ["eloquentjs:migrate:mysql_test"]
    );
    expect(mysqlAdapter.queryOne).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("RELEASE_LOCK"),
      ["eloquentjs:migrate:mysql_test"]
    );

    const pgAdapter = makeAdapter("pg_test");
    pgAdapter.queryOne
      .mockResolvedValueOnce({ acquired: true })
      .mockResolvedValueOnce({ released: true });

    await acquireMigrationLock(pgAdapter, "owner-pg");
    await releaseMigrationLock(pgAdapter, "owner-pg");

    expect(pgAdapter.queryOne).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("pg_try_advisory_lock"),
      [expect.any(Number)]
    );
    expect(pgAdapter.queryOne).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("pg_advisory_unlock"),
      [expect.any(Number)]
    );
  });

  test("sqlite lock uses BEGIN IMMEDIATE and releases with COMMIT/ROLLBACK", async () => {
    const successAdapter = makeAdapter("sqlite_test");
    successAdapter.execute.mockResolvedValue(undefined);

    await acquireMigrationLock(successAdapter, "owner-sqlite-success");
    await releaseMigrationLock(successAdapter, "owner-sqlite-success", { success: true });

    expect(successAdapter.execute).toHaveBeenNthCalledWith(1, "BEGIN IMMEDIATE;");
    expect(successAdapter.execute).toHaveBeenNthCalledWith(2, "COMMIT;");

    const failureAdapter = makeAdapter("sqlite_test");
    failureAdapter.execute.mockResolvedValue(undefined);

    await acquireMigrationLock(failureAdapter, "owner-sqlite-failure");
    await releaseMigrationLock(failureAdapter, "owner-sqlite-failure", { success: false });

    expect(failureAdapter.execute).toHaveBeenNthCalledWith(1, "BEGIN IMMEDIATE;");
    expect(failureAdapter.execute).toHaveBeenNthCalledWith(2, "ROLLBACK;");
  });

  test("migration recovery runbook documents single-table upgrade compatibility", () => {
    const runbook = fs.readFileSync(
      path.resolve(rootDir, "src/documentation/migration-rollback-recovery-runbook.md"),
      "utf8"
    );

    const requiredSnippets = [
      "Migration Tracker Single-Table Contract (Upgrade Note)",
      "persists only the `migrations` history table",
      "Legacy table `migration_locks` is no longer required",
      "runtime ignores that table",
      "DROP TABLE IF EXISTS migration_locks",
    ];

    for (const snippet of requiredSnippets) {
      expect(runbook).toContain(snippet);
    }
  });
});

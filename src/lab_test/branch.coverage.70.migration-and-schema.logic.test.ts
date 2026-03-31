import {
  NativeSqlMigrationLockStrategy,
  getMigrationLockStrategy,
  resetMigrationLockStrategy,
  setMigrationLockStrategy,
  type MigrationLockStrategy,
} from "../cli/utils/migrations/MigrationLockStrategy.js";
import {
  acquireMigrationLock,
  doesMigrationTableExist,
  ensureMigrationTables,
  readLastBatch,
  releaseMigrationLock,
  type SqlMigrationDriver,
} from "../cli/utils/migrations/MigrationTracker.js";
import { SchemaValidator } from "../core/schema/SchemaValidator.js";
import type { DriverAdapter } from "../core/connection/DriverAdapter.js";
import type { ConnectionName } from "../core/connection/ConnectionFactory.js";

type MockSqlAdapter = DriverAdapter & {
  query: jest.Mock;
  queryOne: jest.Mock;
  execute: jest.Mock;
};

function makeAdapter(name: ConnectionName): MockSqlAdapter {
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
    placeholder: (index: number) => `?${index}`,
    placeholders: (count: number, startIndex = 1) =>
      Array.from({ length: count }, (_, idx) => `?${startIndex + idx}`).join(", "),
    inClause: (field: string, values: unknown[], startIndex = 1) => ({
      sql: `${field} IN (${Array.from({ length: values.length }, () => "?").join(", ")})`,
      params: values,
      nextIndex: startIndex + values.length,
    }),
    wrapId: (id: string) => `\`${id}\``,
  };
}

describe("Branch coverage 70% - Phase 5 migration and schema", () => {
  afterEach(() => {
    resetMigrationLockStrategy();
    jest.restoreAllMocks();
  });

  describe("MigrationLockStrategy (native)", () => {
    test("pg/mysql acquire conflict and cleanup branches", async () => {
      const strategy = new NativeSqlMigrationLockStrategy();
      const pg = makeAdapter("pg_test");
      const mysql = makeAdapter("mysql_test");

      pg.queryOne.mockResolvedValueOnce({ acquired: false });
      await expect(strategy.acquire(pg, "owner-pg")).rejects.toThrow(
        "Another migration process is already running."
      );

      mysql.queryOne.mockResolvedValueOnce({ acquired: 0 });
      await expect(strategy.acquire(mysql, "owner-mysql")).rejects.toThrow(
        "Another migration process is already running."
      );

      pg.queryOne.mockRejectedValueOnce(new Error("unlock-fail"));
      mysql.queryOne.mockRejectedValueOnce(new Error("release-fail"));
      await expect(strategy.release(pg, "owner-pg")).resolves.toBeUndefined();
      await expect(strategy.release(mysql, "owner-mysql")).resolves.toBeUndefined();
    });

    test("sqlite lock supports same-owner reentry, rejects conflicts, and rolls back on failed outcome", async () => {
      const strategy = new NativeSqlMigrationLockStrategy();
      const sqlite = makeAdapter("sqlite_test");
      sqlite.execute.mockResolvedValue(undefined);

      await strategy.acquire(sqlite, "owner-a");
      await expect(strategy.acquire(sqlite, "owner-a")).resolves.toBeUndefined();
      await expect(strategy.acquire(sqlite, "owner-b")).rejects.toThrow(
        "Another migration process is already running."
      );

      await expect(strategy.release(sqlite, "owner-b")).resolves.toBeUndefined();
      await strategy.release(sqlite, "owner-a", { success: false });
      expect(sqlite.execute).toHaveBeenCalledWith("ROLLBACK;");
    });

    test("sqlite acquire maps SQLITE_BUSY and release handles COMMIT failure with fallback ROLLBACK", async () => {
      const strategy = new NativeSqlMigrationLockStrategy();
      const sqliteBusy = makeAdapter("sqlite_test");
      sqliteBusy.execute.mockRejectedValueOnce(new Error("SQLITE_BUSY: database is locked"));
      await expect(strategy.acquire(sqliteBusy, "owner-busy")).rejects.toThrow(
        "Another migration process is already running."
      );

      const sqliteCommitFail = makeAdapter("sqlite_test");
      sqliteCommitFail.execute
        .mockResolvedValueOnce(undefined) // BEGIN IMMEDIATE
        .mockRejectedValueOnce(new Error("commit-fail")) // COMMIT
        .mockResolvedValueOnce(undefined); // ROLLBACK fallback

      await strategy.acquire(sqliteCommitFail, "owner-commit");
      await expect(strategy.release(sqliteCommitFail, "owner-commit", { success: true })).resolves
        .toBeUndefined();
      expect(sqliteCommitFail.execute).toHaveBeenCalledWith("COMMIT;");
      expect(sqliteCommitFail.execute).toHaveBeenCalledWith("ROLLBACK;");
    });

    test("throws for unsupported driver resolution", async () => {
      const strategy = new NativeSqlMigrationLockStrategy();
      const unsupported = makeAdapter("mysql_test");
      unsupported.name = "sqlserver" as ConnectionName;

      await expect(strategy.acquire(unsupported, "owner")).rejects.toThrow(
        "Unsupported SQL driver for migration lock strategy"
      );
    });
  });

  describe("MigrationTracker wrappers and bootstrap", () => {
    test("ensureMigrationTables creates tracker + checksum and delegates bootstrap strategy", async () => {
      const bootstrap = {
        ensureBootstrap: jest.fn(async () => undefined),
        acquire: jest.fn(async () => undefined),
        release: jest.fn(async () => undefined),
      } satisfies MigrationLockStrategy;
      setMigrationLockStrategy(bootstrap);

      const mysql = makeAdapter("mysql_test");
      mysql.query.mockResolvedValueOnce([]); // checksum missing
      mysql.execute.mockResolvedValue(undefined);

      const driver = await ensureMigrationTables(mysql);

      expect(driver).toBe("mysql");
      expect(mysql.execute).toHaveBeenCalledWith(expect.stringContaining("CREATE TABLE IF NOT EXISTS migrations"));
      expect(mysql.execute).toHaveBeenCalledWith(
        expect.stringContaining("ADD COLUMN `checksum` VARCHAR(64) NULL")
      );
      expect(bootstrap.ensureBootstrap).toHaveBeenCalledWith(mysql, "mysql");
    });

    test("ensureMigrationTables skips checksum ALTER when checksum already exists", async () => {
      const bootstrap = {
        ensureBootstrap: jest.fn(async () => undefined),
        acquire: jest.fn(async () => undefined),
        release: jest.fn(async () => undefined),
      } satisfies MigrationLockStrategy;
      setMigrationLockStrategy(bootstrap);

      const sqlite = makeAdapter("sqlite_test");
      sqlite.query.mockResolvedValueOnce([{ name: "id" }, { name: "checksum" }]); // checksum exists
      sqlite.execute.mockResolvedValue(undefined);

      const driver = await ensureMigrationTables(sqlite);

      expect(driver).toBe("sqlite");
      const alterCalls = sqlite.execute.mock.calls.filter(([sql]) =>
        String(sql).includes("ADD COLUMN")
      );
      expect(alterCalls).toHaveLength(0);
      expect(bootstrap.ensureBootstrap).toHaveBeenCalledWith(sqlite, "sqlite");
    });

    test("acquire/release wrappers delegate to configured strategy", async () => {
      const strategy = {
        ensureBootstrap: jest.fn(async () => undefined),
        acquire: jest.fn(async () => undefined),
        release: jest.fn(async () => undefined),
      } satisfies MigrationLockStrategy;
      setMigrationLockStrategy(strategy);

      const adapter = makeAdapter("mysql_test");
      await acquireMigrationLock(adapter, "owner-1");
      await releaseMigrationLock(adapter, "owner-1", { success: false });

      expect(strategy.acquire).toHaveBeenCalledWith(adapter, "owner-1");
      expect(strategy.release).toHaveBeenCalledWith(adapter, "owner-1", { success: false });
    });

    test("doesMigrationTableExist and readLastBatch branch behavior", async () => {
      const mysql = makeAdapter("mysql_test");
      mysql.query.mockResolvedValueOnce([{ Tables_in_test: "migrations" }]);
      await expect(doesMigrationTableExist(mysql, "migrations")).resolves.toBe(true);

      mysql.query.mockResolvedValueOnce([{ max: null }]);
      await expect(readLastBatch(mysql)).resolves.toBe(0);

      mysql.query.mockResolvedValueOnce([{ max: "7" }]);
      await expect(readLastBatch(mysql)).resolves.toBe(7);
    });
  });

  describe("SchemaValidator", () => {
    test("validates required, numeric, min/max, pattern, email, enum, and custom rules with hooks", async () => {
      const beforeValidate = jest.fn(async () => undefined);
      const afterValidate = jest.fn(async () => undefined);

      const errors = await SchemaValidator.validateData(
        {
          age: "not-number",
          username: "a",
          price: 1000,
          code: "BAD",
          email: "bad-at",
          role: "guest",
          customFalse: "x",
          customMessage: "y",
          customTrue: "z",
        },
        {
          requiredField: { required: true },
          age: { numeric: true, min: 2 },
          username: { min: 3, max: 5 },
          price: { max: 99 },
          code: { pattern: /^OK-\d+$/ },
          email: { email: true },
          role: { in: ["admin", "editor"] as never[] },
          customFalse: {},
          customMessage: {},
          customTrue: {},
        },
        {
          hooks: { beforeValidate, afterValidate },
          customRules: {
            customFalse: async (_value, field) => (field === "customFalse" ? false : true),
            customMessage: async (_value, field) =>
              field === "customMessage" ? "custom message" : true,
            customTrue: async () => true,
          },
        }
      );

      expect(beforeValidate).toHaveBeenCalledTimes(1);
      expect(afterValidate).toHaveBeenCalledTimes(1);
      expect(errors).toEqual(
        expect.arrayContaining([
          { field: "requiredField", message: "is required" },
          { field: "age", message: "must be numeric" },
          { field: "username", message: "must be at least 3 characters" },
          { field: "price", message: "must be <= 99" },
          { field: "code", message: "has invalid format" },
          { field: "email", message: "is not a valid email address" },
          { field: "role", message: "must be one of: admin, editor" },
          { field: "customFalse", message: "customFalse failed" },
          { field: "customMessage", message: "custom message" },
        ])
      );
    });

    test("skips optional missing fields and handles null custom rule results as pass", async () => {
      const errors = await SchemaValidator.validateData(
        { title: "ok" },
        {
          title: { min: 2, max: 10 },
          optionalNumber: { numeric: true },
        },
        {
          customRules: {
            passNull: async () => null,
          },
        }
      );

      expect(errors).toEqual([]);
    });
  });
});

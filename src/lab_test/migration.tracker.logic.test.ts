import fs from "fs";
import os from "os";
import path from "path";
import {
  acquireMigrationLock,
  computeMigrationChecksum,
  validateMigrationHistory,
} from "../cli/utils/migrations/MigrationTracker";
import type { DriverAdapter } from "../core/connection/DriverAdapter";

type MockAdapter = DriverAdapter & {
  query: jest.Mock;
  execute: jest.Mock;
};

function makeAdapter(): MockAdapter {
  const query = jest.fn();
  const execute = jest.fn();

  return {
    name: "mysql_test",
    kind: "sql",
    query,
    queryOne: jest.fn(),
    execute,
    insert: jest.fn(),
    placeholder: () => "?",
    placeholders: (count: number) => Array.from({ length: count }, () => "?").join(", "),
    inClause: (field: string, values: unknown[], startIndex = 1) => ({
      sql: `${field} IN (${Array.from({ length: values.length }, () => "?").join(", ")})`,
      params: values,
      nextIndex: startIndex + values.length,
    }),
    wrapId: (id: string) => `\`${id}\``,
  };
}

describe("MigrationTracker logic", () => {
  test("computeMigrationChecksum is stable for the same file content", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "migration-checksum-"));
    const filePath = path.join(tempDir, "20260301000000_create_users_table.ts");
    fs.writeFileSync(filePath, "export async function up() { return; }\n", "utf8");

    const first = computeMigrationChecksum(filePath);
    const second = computeMigrationChecksum(filePath);

    expect(first).toHaveLength(64);
    expect(first).toBe(second);

    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test("acquireMigrationLock maps duplicate-key errors to a clear concurrency error", async () => {
    const adapter = makeAdapter();
    adapter.execute.mockRejectedValueOnce(
      Object.assign(new Error("Duplicate entry '1' for key 'PRIMARY'"), { code: "ER_DUP_ENTRY" })
    );

    await expect(acquireMigrationLock(adapter, "owner-1")).rejects.toThrow(
      "Another migration process is already running."
    );
  });

  test("validateMigrationHistory backfills missing checksums for legacy rows", async () => {
    const adapter = makeAdapter();
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "migration-history-"));
    const fileName = "20260301000100_create_posts_table.ts";
    const filePath = path.join(tempDir, fileName);
    fs.writeFileSync(filePath, "export async function up() { return; }\n", "utf8");

    adapter.query.mockResolvedValueOnce([
      { id: 1, name: fileName, batch: 1, checksum: null, run_at: "2026-03-01" },
    ]);

    const rows = await validateMigrationHistory(adapter, tempDir);
    const expectedChecksum = computeMigrationChecksum(filePath);

    expect(rows[0]?.checksum).toBe(expectedChecksum);
    expect(adapter.execute).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE `migrations` SET `checksum` = ?"),
      [expectedChecksum, fileName]
    );

    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test("validateMigrationHistory rejects modified migration files", async () => {
    const adapter = makeAdapter();
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "migration-mismatch-"));
    const fileName = "20260301000200_create_comments_table.ts";
    const filePath = path.join(tempDir, fileName);
    fs.writeFileSync(filePath, "export async function up() { return; }\n", "utf8");

    adapter.query.mockResolvedValueOnce([
      { id: 1, name: fileName, batch: 1, checksum: "bad-checksum", run_at: "2026-03-01" },
    ]);

    await expect(validateMigrationHistory(adapter, tempDir)).rejects.toThrow(
      `Migration checksum mismatch for "${fileName}".`
    );

    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test("validateMigrationHistory relinks regenerated auto-migrations with the same logical name", async () => {
    const adapter = makeAdapter();
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "migration-relink-"));
    const oldName = "20260303121115001_create_comments_table.ts";
    const nextName = "20260303121159001_create_comments_table.ts";
    const nextPath = path.join(tempDir, nextName);
    fs.writeFileSync(nextPath, "export async function up() { return; }\n", "utf8");

    adapter.query.mockResolvedValueOnce([
      { id: 1, name: oldName, batch: 1, checksum: "stale-checksum", run_at: "2026-03-03" },
    ]);

    const rows = await validateMigrationHistory(adapter, tempDir);
    const expectedChecksum = computeMigrationChecksum(nextPath);

    expect(rows[0]?.name).toBe(nextName);
    expect(rows[0]?.checksum).toBe(expectedChecksum);
    expect(adapter.execute).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE `migrations` SET `name` = ?, `checksum` = ?"),
      [nextName, expectedChecksum, oldName]
    );

    fs.rmSync(tempDir, { recursive: true, force: true });
  });
});

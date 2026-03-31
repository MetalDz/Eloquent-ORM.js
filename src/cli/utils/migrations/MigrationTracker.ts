import fs from "fs";
import crypto from "crypto";
import path from "path";
import { dbConfig } from "../../../config/database.js";
import type { DriverAdapter } from "../../../core/connection/DriverAdapter.js";
import {
  getMigrationLockStrategy,
  type SqlMigrationDriver,
} from "./MigrationLockStrategy.js";

export type { SqlMigrationDriver };

export type MigrationRow = {
  id?: number;
  name: string;
  batch: number;
  checksum: string | null;
  run_at?: string;
};

type ResolvedMigrationFile = {
  fileName: string;
  filePath: string;
  relinked: boolean;
};

const AUTO_GENERATED_MIGRATION_RE =
  /^\d+_(create|update)_[A-Za-z0-9_]+_table\.(ts|js)$/;
const AUTO_GENERATED_CREATE_MIGRATION_RE =
  /^\d+_create_([A-Za-z0-9_]+)_table\.(ts|js)$/;

function resolveDriver(db: DriverAdapter): SqlMigrationDriver {
  const driver = dbConfig.connections[db.name]?.driver ?? db.name;
  if (driver === "mysql" || driver === "pg" || driver === "sqlite") {
    return driver;
  }
  throw new Error(`Unsupported SQL driver for migrations: ${String(driver)}`);
}

function trackerTableSQL(driver: SqlMigrationDriver): string {
  if (driver === "pg") {
    return `
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        batch INT DEFAULT 1,
        checksum VARCHAR(64),
        run_at TIMESTAMP DEFAULT NOW()
      );`;
  }

  if (driver === "sqlite") {
    return `
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(255) NOT NULL UNIQUE,
        batch INT DEFAULT 1,
        checksum TEXT,
        run_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );`;
  }

  return `
    CREATE TABLE IF NOT EXISTS migrations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(191) NOT NULL UNIQUE,
      batch INT DEFAULT 1,
      checksum VARCHAR(64),
      run_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`;
}

async function hasChecksumColumn(
  db: DriverAdapter,
  driver: SqlMigrationDriver
): Promise<boolean> {
  if (driver === "mysql") {
    const rows = await db.query<Record<string, unknown>>(
      `SHOW COLUMNS FROM ${db.wrapId("migrations")} LIKE ${db.placeholder(1)}`,
      ["checksum"]
    );
    return rows.length > 0;
  }

  if (driver === "pg") {
    const rows = await db.query<{ column_name: string }>(
      `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = ${db.placeholder(1)}
          AND column_name = ${db.placeholder(2)}
      `,
      ["migrations", "checksum"]
    );
    return rows.length > 0;
  }

  const rows = await db.query<{ name: string }>(
    `PRAGMA table_info(${db.wrapId("migrations")})`
  );
  return rows.some((row) => row.name === "checksum");
}

async function ensureChecksumColumn(
  db: DriverAdapter,
  driver: SqlMigrationDriver
): Promise<void> {
  if (await hasChecksumColumn(db, driver)) {
    return;
  }

  if (driver === "mysql") {
    await db.execute(
      `ALTER TABLE ${db.wrapId("migrations")} ADD COLUMN ${db.wrapId("checksum")} VARCHAR(64) NULL`
    );
    return;
  }

  if (driver === "pg") {
    await db.execute(
      `ALTER TABLE ${db.wrapId("migrations")} ADD COLUMN ${db.wrapId("checksum")} VARCHAR(64)`
    );
    return;
  }

  await db.execute(
    `ALTER TABLE ${db.wrapId("migrations")} ADD COLUMN ${db.wrapId("checksum")} TEXT`
  );
}

export async function ensureMigrationTables(db: DriverAdapter): Promise<SqlMigrationDriver> {
  const driver = resolveDriver(db);
  await db.execute(trackerTableSQL(driver));
  await ensureChecksumColumn(db, driver);
  await getMigrationLockStrategy().ensureBootstrap(db, driver);
  return driver;
}

export function computeMigrationChecksum(filePath: string): string {
  const content = fs.readFileSync(filePath, "utf8");
  return crypto.createHash("sha256").update(content).digest("hex");
}

function logicalMigrationName(fileName: string): string {
  return fileName.replace(/^\d+_/, "");
}

function isGeneratedMigrationFile(fileName: string): boolean {
  return AUTO_GENERATED_MIGRATION_RE.test(fileName);
}

function findMatchingMigrationFile(
  migrationsDir: string,
  fileName: string
): ResolvedMigrationFile | null {
  const exactPath = path.join(migrationsDir, fileName);
  if (fs.existsSync(exactPath)) {
    return {
      fileName,
      filePath: exactPath,
      relinked: false,
    };
  }

  if (!isGeneratedMigrationFile(fileName) || !fs.existsSync(migrationsDir)) {
    return null;
  }

  const logicalName = logicalMigrationName(fileName);
  const candidates = fs
    .readdirSync(migrationsDir)
    .filter((entry) => entry.endsWith(".ts") || entry.endsWith(".js"))
    .filter((entry) => isGeneratedMigrationFile(entry))
    .filter((entry) => logicalMigrationName(entry) === logicalName);

  if (candidates.length !== 1) {
    return null;
  }

  return {
    fileName: candidates[0],
    filePath: path.join(migrationsDir, candidates[0]),
    relinked: true,
  };
}

async function relinkAppliedMigration(
  db: DriverAdapter,
  previousName: string,
  nextName: string,
  checksum: string
): Promise<void> {
  const sql = `UPDATE ${db.wrapId("migrations")} SET ${db.wrapId("name")} = ${db.placeholder(
    1
  )}, ${db.wrapId("checksum")} = ${db.placeholder(2)} WHERE ${db.wrapId(
    "name"
  )} = ${db.placeholder(3)}`;
  await db.execute(sql, [nextName, checksum, previousName]);
}

function autoGeneratedCreateTableName(fileName: string): string | null {
  const match = AUTO_GENERATED_CREATE_MIGRATION_RE.exec(fileName);
  return match?.[1] ?? null;
}

export function getAutoGeneratedCreateTableName(fileName: string): string | null {
  return autoGeneratedCreateTableName(fileName);
}

async function tableExists(
  db: DriverAdapter,
  driver: SqlMigrationDriver,
  tableName: string
): Promise<boolean> {
  if (driver === "mysql") {
    const rows = await db.query<Record<string, unknown>>(
      `SHOW TABLES LIKE ${db.placeholder(1)}`,
      [tableName]
    );
    return rows.length > 0;
  }

  if (driver === "pg") {
    const rows = await db.query<{ table_name: string }>(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = current_schema()
         AND table_name = ${db.placeholder(1)}`,
      [tableName]
    );
    return rows.length > 0;
  }

  const rows = await db.query<{ name: string }>(
    `SELECT name
     FROM sqlite_master
     WHERE type = 'table'
       AND name = ${db.placeholder(1)}`,
    [tableName]
  );
  return rows.length > 0;
}

export async function doesMigrationTableExist(
  db: DriverAdapter,
  tableName: string
): Promise<boolean> {
  const driver = resolveDriver(db);
  return tableExists(db, driver, tableName);
}

async function tryPruneStaleGeneratedCreateMigration(
  db: DriverAdapter,
  migrationName: string
): Promise<boolean> {
  const tableName = autoGeneratedCreateTableName(migrationName);
  if (!tableName) return false;

  const driver = resolveDriver(db);
  const exists = await tableExists(db, driver, tableName);
  if (exists) return false;

  await deleteAppliedMigration(db, migrationName);
  console.warn(
    `Pruned stale migration history entry "${migrationName}" (table "${tableName}" not found).`
  );
  return true;
}

export async function acquireMigrationLock(
  db: DriverAdapter,
  owner: string
): Promise<void> {
  await getMigrationLockStrategy().acquire(db, owner);
}

export async function releaseMigrationLock(
  db: DriverAdapter,
  owner: string,
  outcome?: { success?: boolean }
): Promise<void> {
  await getMigrationLockStrategy().release(db, owner, outcome);
}

export async function readAppliedMigrations(db: DriverAdapter): Promise<MigrationRow[]> {
  return await db.query<MigrationRow>(
    `SELECT ${db.wrapId("id")} AS id, ${db.wrapId("name")} AS name, ${db.wrapId(
      "batch"
    )} AS batch, ${db.wrapId("checksum")} AS checksum, ${db.wrapId(
      "run_at"
    )} AS run_at FROM ${db.wrapId("migrations")} ORDER BY ${db.wrapId("id")}`
  );
}

export async function readLastBatch(db: DriverAdapter): Promise<number> {
  const rows = await db.query<{ max: number | string | null }>(
    `SELECT MAX(${db.wrapId("batch")}) as max FROM ${db.wrapId("migrations")}`
  );
  const max = rows[0]?.max;
  return max === null || max === undefined ? 0 : Number(max);
}

export async function recordAppliedMigration(
  db: DriverAdapter,
  fileName: string,
  batch: number,
  checksum: string
): Promise<void> {
  const sql = `INSERT INTO ${db.wrapId("migrations")} (${db.wrapId("name")}, ${db.wrapId(
    "batch"
  )}, ${db.wrapId("checksum")}) VALUES (${db.placeholder(1)}, ${db.placeholder(
    2
  )}, ${db.placeholder(3)})`;
  await db.execute(sql, [fileName, batch, checksum]);
}

export async function deleteAppliedMigration(
  db: DriverAdapter,
  fileName: string
): Promise<void> {
  const sql = `DELETE FROM ${db.wrapId("migrations")} WHERE ${db.wrapId(
    "name"
  )} = ${db.placeholder(1)}`;
  await db.execute(sql, [fileName]);
}

export async function backfillMissingChecksums(
  db: DriverAdapter,
  rows: MigrationRow[],
  migrationsDir: string
): Promise<MigrationRow[]> {
  const updatedRows: MigrationRow[] = [];

  for (const row of rows) {
    if (row.checksum) {
      updatedRows.push(row);
      continue;
    }

    const resolved = findMatchingMigrationFile(migrationsDir, row.name);
    if (!resolved) {
      const pruned = await tryPruneStaleGeneratedCreateMigration(db, row.name);
      if (pruned) {
        continue;
      }
      const createTableName = autoGeneratedCreateTableName(row.name);
      if (createTableName) {
        const driver = resolveDriver(db);
        const exists = await tableExists(db, driver, createTableName);
        if (exists) {
          console.warn(
            `Keeping orphaned applied migration "${row.name}" because table "${createTableName}" still exists.`
          );
          updatedRows.push(row);
          continue;
        }
      }
      throw new Error(
        `Applied migration "${row.name}" is missing from disk and cannot be checksum-validated.`
      );
    }

    const checksum = computeMigrationChecksum(resolved.filePath);
    if (resolved.relinked) {
      await relinkAppliedMigration(db, row.name, resolved.fileName, checksum);
      updatedRows.push({ ...row, name: resolved.fileName, checksum });
      continue;
    }

    const sql = `UPDATE ${db.wrapId("migrations")} SET ${db.wrapId("checksum")} = ${db.placeholder(
      1
    )} WHERE ${db.wrapId("name")} = ${db.placeholder(2)}`;
    await db.execute(sql, [checksum, row.name]);
    updatedRows.push({ ...row, checksum });
  }

  return updatedRows;
}

export async function validateMigrationHistory(
  db: DriverAdapter,
  migrationsDir: string
): Promise<MigrationRow[]> {
  const rows = await readAppliedMigrations(db);
  const hydratedRows = await backfillMissingChecksums(db, rows, migrationsDir);
  const validatedRows: MigrationRow[] = [];

  for (const row of hydratedRows) {
    const resolved = findMatchingMigrationFile(migrationsDir, row.name);
    if (!resolved) {
      const pruned = await tryPruneStaleGeneratedCreateMigration(db, row.name);
      if (pruned) {
        continue;
      }
      const createTableName = autoGeneratedCreateTableName(row.name);
      if (createTableName) {
        const driver = resolveDriver(db);
        const exists = await tableExists(db, driver, createTableName);
        if (exists) {
          console.warn(
            `Keeping orphaned applied migration "${row.name}" because table "${createTableName}" still exists.`
          );
          validatedRows.push(row);
          continue;
        }
      }
      throw new Error(`Applied migration "${row.name}" is missing from disk.`);
    }

    const currentChecksum = computeMigrationChecksum(resolved.filePath);
    if (resolved.relinked) {
      await relinkAppliedMigration(db, row.name, resolved.fileName, currentChecksum);
      row.name = resolved.fileName;
      row.checksum = currentChecksum;
      validatedRows.push(row);
      continue;
    }

    if (row.checksum !== currentChecksum) {
      throw new Error(
        `Migration checksum mismatch for "${row.name}". The applied migration file was modified after execution.`
      );
    }

    validatedRows.push(row);
  }

  return validatedRows;
}

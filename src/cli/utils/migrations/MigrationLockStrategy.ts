import type { DriverAdapter } from "../../../core/connection/DriverAdapter";
import { dbConfig } from "../../../config/database";

export type SqlMigrationDriver = "mysql" | "pg" | "sqlite";

export interface MigrationLockStrategy {
  ensureBootstrap(db: DriverAdapter, driver: SqlMigrationDriver): Promise<void>;
  acquire(db: DriverAdapter, owner: string): Promise<void>;
  release(
    db: DriverAdapter,
    owner: string,
    outcome?: { success?: boolean }
  ): Promise<void>;
}

const SQLITE_LOCK_OWNERS = new Map<string, string>();

function resolveDriver(db: DriverAdapter): SqlMigrationDriver {
  const configuredDriver = dbConfig.connections[db.name]?.driver;
  if (configuredDriver === "mysql" || configuredDriver === "pg" || configuredDriver === "sqlite") {
    return configuredDriver;
  }
  if (db.name === "mysql" || db.name === "pg" || db.name === "sqlite") {
    return db.name;
  }
  throw new Error(`Unsupported SQL driver for migration lock strategy: ${String(db.name)}`);
}

function pgLockId(connectionName: string): number {
  let hash = 0;
  for (const char of connectionName) {
    hash = (hash * 31 + char.charCodeAt(0)) | 0;
  }
  const normalized = Math.abs(hash);
  return normalized === 0 ? 1 : normalized;
}

function mysqlLockName(connectionName: string): string {
  return `eloquentjs:migrate:${connectionName}`;
}

function isSqliteBusy(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /SQLITE_BUSY|database is locked/i.test(message);
}

class NativeSqlMigrationLockStrategy implements MigrationLockStrategy {
  async ensureBootstrap(): Promise<void> {
    // Native lock strategies do not require a persistent lock table.
  }

  async acquire(db: DriverAdapter, owner: string): Promise<void> {
    const driver = resolveDriver(db);

    if (driver === "pg") {
      const row = await db.queryOne<{ acquired: boolean }>(
        `SELECT pg_try_advisory_lock(${db.placeholder(1)}) AS acquired`,
        [pgLockId(db.name)]
      );
      if (!row?.acquired) {
        throw new Error("Another migration process is already running.");
      }
      return;
    }

    if (driver === "mysql") {
      const row = await db.queryOne<{ acquired: number | null }>(
        `SELECT GET_LOCK(${db.placeholder(1)}, 0) AS acquired`,
        [mysqlLockName(db.name)]
      );
      if (Number(row?.acquired) !== 1) {
        throw new Error("Another migration process is already running.");
      }
      return;
    }

    const existingOwner = SQLITE_LOCK_OWNERS.get(db.name);
    if (existingOwner) {
      if (existingOwner === owner) return;
      throw new Error("Another migration process is already running.");
    }

    try {
      await db.execute("BEGIN IMMEDIATE;");
    } catch (error) {
      if (isSqliteBusy(error)) {
        throw new Error("Another migration process is already running.");
      }
      throw error;
    }

    SQLITE_LOCK_OWNERS.set(db.name, owner);
  }

  async release(
    db: DriverAdapter,
    owner: string,
    outcome?: { success?: boolean }
  ): Promise<void> {
    const driver = resolveDriver(db);

    if (driver === "pg") {
      try {
        await db.queryOne(
          `SELECT pg_advisory_unlock(${db.placeholder(1)}) AS released`,
          [pgLockId(db.name)]
        );
      } catch {
        // Do not mask real migration errors with lock cleanup noise.
      }
      return;
    }

    if (driver === "mysql") {
      try {
        await db.queryOne(
          `SELECT RELEASE_LOCK(${db.placeholder(1)}) AS released`,
          [mysqlLockName(db.name)]
        );
      } catch {
        // Do not mask real migration errors with lock cleanup noise.
      }
      return;
    }

    const ownerInLock = SQLITE_LOCK_OWNERS.get(db.name);
    if (!ownerInLock) return;
    if (ownerInLock !== owner) return;
    const shouldCommit = outcome?.success !== false;

    try {
      await db.execute(shouldCommit ? "COMMIT;" : "ROLLBACK;");
    } catch {
      if (!shouldCommit) {
        // Ignore rollback cleanup failures when unwinding a failed run.
      } else {
        try {
          await db.execute("ROLLBACK;");
        } catch {
          // Keep lock cleanup best-effort.
        }
      }
    }

    SQLITE_LOCK_OWNERS.delete(db.name);
  }
}

let activeLockStrategy: MigrationLockStrategy = new NativeSqlMigrationLockStrategy();

export function getMigrationLockStrategy(): MigrationLockStrategy {
  return activeLockStrategy;
}

export function setMigrationLockStrategy(strategy: MigrationLockStrategy): void {
  activeLockStrategy = strategy;
}

export function resetMigrationLockStrategy(): void {
  activeLockStrategy = new NativeSqlMigrationLockStrategy();
}

export { NativeSqlMigrationLockStrategy };

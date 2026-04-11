import type { Pool, PoolConnection } from "mysql2/promise";
import type {
  ClientSession,
  Collection,
  Db,
  Document,
  TransactionOptions as MongoNativeTransactionOptions,
} from "mongodb";
import type { Client as PgClient } from "pg";

import { dbConfig } from "../../config/database.js";
import {
  connectDB,
  getMongoClient,
  type ConnectionName,
  type ConnectionInstance,
} from "./DatabaseConnection.js";
import { getConnection } from "./ConnectionFactory.js";
import { createAdapter, type DriverAdapter } from "./DriverAdapter.js";
import type { SQLiteConnectionLike } from "./BetterSqliteConnection.js";

export type SqlTransactionDriver = "mysql" | "pg" | "sqlite";

export interface SqlTransaction extends DriverAdapter {
  connectionName: ConnectionName;
  driver: SqlTransactionDriver;
}

export interface MongoTransactionContext {
  connectionName: ConnectionName;
  driver: "mongo";
  db: Db;
  session: ClientSession;
  collection<TSchema extends Document = Document>(name: string): Collection<TSchema>;
}

export type TransactionContext = SqlTransaction | MongoTransactionContext;

export interface TransactionOptions {
  sqliteMode?: "deferred" | "immediate" | "exclusive";
  mongo?: MongoNativeTransactionOptions;
}

export interface LockingOptions extends TransactionOptions {
  timeoutSeconds?: number;
}

const resolveConfiguredDriver = (name: ConnectionName) => {
  const driver = dbConfig.connections[name]?.driver;
  if (
    driver !== "mysql" &&
    driver !== "pg" &&
    driver !== "sqlite" &&
    driver !== "mongo"
  ) {
    throw new Error(`Unsupported transaction driver for connection: ${String(name)}`);
  }

  return driver;
};

const decorateSqlAdapter = (
  name: ConnectionName,
  driver: SqlTransactionDriver,
  adapter: DriverAdapter,
): SqlTransaction => {
  return {
    ...adapter,
    connectionName: name,
    driver,
  };
};

const beginSqliteTransaction = async (
  connection: SQLiteConnectionLike,
  mode: TransactionOptions["sqliteMode"],
): Promise<void> => {
  switch (mode) {
    case "deferred":
      await connection.exec("BEGIN;");
      return;
    case "exclusive":
      await connection.exec("BEGIN EXCLUSIVE;");
      return;
    default:
      await connection.exec("BEGIN IMMEDIATE;");
      return;
  }
};

const closePgConnection = async (connection: PgClient): Promise<void> => {
  if (typeof connection.end === "function") {
    await connection.end();
  }
};

const releaseMysqlConnection = async (connection: PoolConnection): Promise<void> => {
  if (typeof connection.release === "function") {
    connection.release();
  }
};

const asSingleValue = (row: Record<string, unknown> | null): unknown => {
  if (!row) {
    return null;
  }

  const values = Object.values(row);
  return values.length > 0 ? values[0] : null;
};

const ensureMongoClient = (connection: ConnectionInstance, name: ConnectionName) => {
  const client = getMongoClient(connection);
  if (!client) {
    throw new Error(
      `Mongo transaction support requires a tracked MongoClient for connection "${String(name)}".`,
    );
  }

  return client;
};

export async function transaction<T>(
  name: ConnectionName,
  work: (context: TransactionContext) => Promise<T>,
  options: TransactionOptions = {},
): Promise<T> {
  const driver = resolveConfiguredDriver(name);

  if (driver === "mysql") {
    const pool = (await getConnection(name)) as Pool;
    const connection = await pool.getConnection();
    const adapter = decorateSqlAdapter(name, "mysql", createAdapter(name, connection as never));

    try {
      await connection.beginTransaction();
      const result = await work(adapter);
      await connection.commit();
      return result;
    } catch (error) {
      try {
        await connection.rollback();
      } catch {
        // Preserve the original error.
      }
      throw error;
    } finally {
      await releaseMysqlConnection(connection);
    }
  }

  if (driver === "pg") {
    const connection = (await connectDB(name)) as PgClient;
    const adapter = decorateSqlAdapter(name, "pg", createAdapter(name, connection as never));

    try {
      await connection.query("BEGIN");
      const result = await work(adapter);
      await connection.query("COMMIT");
      return result;
    } catch (error) {
      try {
        await connection.query("ROLLBACK");
      } catch {
        // Preserve the original error.
      }
      throw error;
    } finally {
      await closePgConnection(connection);
    }
  }

  if (driver === "sqlite") {
    const connection = (await getConnection(name)) as SQLiteConnectionLike;
    const adapter = decorateSqlAdapter(name, "sqlite", createAdapter(name, connection as never));

    try {
      await beginSqliteTransaction(connection, options.sqliteMode);
      const result = await work(adapter);
      await connection.exec("COMMIT;");
      return result;
    } catch (error) {
      try {
        await connection.exec("ROLLBACK;");
      } catch {
        // Preserve the original error.
      }
      throw error;
    }
  }

  const db = (await getConnection(name)) as Db;
  const client = ensureMongoClient(db as unknown as ConnectionInstance, name);
  const session = client.startSession();

  try {
    const result = await session.withTransaction(async () => {
      return await work({
        connectionName: name,
        driver: "mongo",
        db,
        session,
        collection<TSchema extends Document = Document>(collectionName: string) {
          return db.collection<TSchema>(collectionName);
        },
      });
    }, options.mongo);

    return result as T;
  } finally {
    await session.endSession();
  }
}

export async function lockedTransaction<T>(
  name: ConnectionName,
  lockKey: string,
  work: (context: SqlTransaction) => Promise<T>,
  options: LockingOptions = {},
): Promise<T> {
  const driver = resolveConfiguredDriver(name);

  if (driver === "pg") {
    const connection = (await connectDB(name)) as PgClient;
    const adapter = decorateSqlAdapter(name, "pg", createAdapter(name, connection as never));

    try {
      await connection.query("BEGIN");
      await connection.query("SELECT pg_advisory_xact_lock(hashtext($1))", [lockKey]);
      const result = await work(adapter);
      await connection.query("COMMIT");
      return result;
    } catch (error) {
      try {
        await connection.query("ROLLBACK");
      } catch {
        // Preserve the original error.
      }
      throw error;
    } finally {
      await closePgConnection(connection);
    }
  }

  if (driver === "mysql") {
    const pool = (await getConnection(name)) as Pool;
    const connection = await pool.getConnection();
    const adapter = decorateSqlAdapter(name, "mysql", createAdapter(name, connection as never));
    const timeoutSeconds = options.timeoutSeconds ?? 10;

    try {
      const acquired = await connection.query("SELECT GET_LOCK(?, ?) AS lock_status", [
        lockKey,
        timeoutSeconds,
      ]);
      const row = Array.isArray(acquired[0]) ? (acquired[0][0] as Record<string, unknown> | undefined) : undefined;
      if (asSingleValue(row ?? null) !== 1) {
        throw new Error(`Failed to acquire MySQL named lock for key: ${lockKey}`);
      }

      await connection.beginTransaction();
      const result = await work(adapter);
      await connection.commit();
      return result;
    } catch (error) {
      try {
        await connection.rollback();
      } catch {
        // Preserve the original error.
      }
      throw error;
    } finally {
      try {
        await connection.query("SELECT RELEASE_LOCK(?)", [lockKey]);
      } catch {
        // Best effort unlock.
      }

      await releaseMysqlConnection(connection);
    }
  }

  throw new Error(
    `Native lockedTransaction() is supported only for mysql and pg connections. Received: ${driver}`,
  );
}

import { Pool } from "mysql2/promise";
import { Client as PgClient } from "pg";
import { MongoClient, Db } from "mongodb";
import dns from "dns";
import { dbConfig } from "../../config/database.js";
import {
  BetterSqliteConnection,
  SQLiteConnectionLike,
} from "./BetterSqliteConnection.js";

/* ----------------------------------------------------------
 * 1. Type Declarations for Configurations
 * ---------------------------------------------------------- */

/** Supported driver names */
export type DriverName = "mysql" | "pg" | "sqlite" | "mongo";

/** MySQL connection configuration */
export interface MySQLConfig {
  driver: "mysql";
  host: string;
  user: string;
  password: string;
  database: string;
  port?: number;
  waitForConnections?: boolean;
  connectionLimit?: number;
  queueLimit?: number;
}

/** PostgreSQL connection configuration */
export interface PostgresConfig {
  driver: "pg";
  host: string;
  user: string;
  password: string;
  database: string;
  port: number;
}

/** SQLite connection configuration */
export interface SQLiteConfig {
  driver: "sqlite";
  sqlitePath: string;
}

/** MongoDB connection configuration */
export interface MongoConfig {
  driver: "mongo";
  uri: string;
  database: string;
  dnsServers?: string[];
}

/** Union type for all connection configs */
export type ConnectionConfig = MySQLConfig | PostgresConfig | SQLiteConfig | MongoConfig;

/** Database connection instance types */
export type ConnectionInstance = Pool | PgClient | SQLiteConnectionLike | Db;

/** Supported connection names */
export type ConnectionName = keyof typeof dbConfig.connections;
const mongoClientByDb = new WeakMap<Db, MongoClient>();

function applyMongoDnsServers(uri: string, dnsServers?: string[]): void {
  if (!uri.startsWith("mongodb+srv://")) return;

  const normalizedServers = (dnsServers ?? [])
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  if (normalizedServers.length === 0) return;

  const currentServers = dns.getServers();
  if (
    currentServers.length === normalizedServers.length &&
    currentServers.every((value, index) => value === normalizedServers[index])
  ) {
    return;
  }

  dns.setServers(normalizedServers);
  console.log(
    `Using custom DNS servers for MongoDB SRV resolution: ${normalizedServers.join(", ")}`
  );
}

function normalizeMongoConnectionError(
  connectionName: string,
  error: unknown
): Error {
  const code = String((error as { code?: unknown })?.code ?? "");
  const codeName = String((error as { codeName?: unknown })?.codeName ?? "");
  const message =
    error instanceof Error ? error.message : String(error);

  if (code === "ECONNREFUSED" && message.includes("querySrv")) {
    const normalized = new Error(
      `MongoDB SRV lookup failed for "${connectionName}". ` +
        `If system DNS works but Node fails, set MONGO_DNS_SERVERS ` +
        `or switch to a non-SRV mongodb:// URI.`
    );
    (normalized as Error & { cause?: unknown }).cause = error;
    return normalized;
  }

  if ((code === "8000" || codeName === "AtlasError") && /auth/i.test(message)) {
    const normalized = new Error(
      `MongoDB authentication failed for "${connectionName}". ` +
        `Verify MONGO_URI credentials, Atlas DB user roles, and authSource.`
    );
    (normalized as Error & { cause?: unknown }).cause = error;
    return normalized;
  }

  return error instanceof Error ? error : new Error(String(error));
}

/* ----------------------------------------------------------
 * 2. Connect Function (Multi-Driver)
 * ---------------------------------------------------------- */
export async function connectDB(name: ConnectionName): Promise<ConnectionInstance> {
  const config = dbConfig.connections[name] as ConnectionConfig;

  switch (config.driver) {
    /* ---------- MySQL ---------- */
    case "mysql": {
      const mysql = require("mysql2/promise");
      return mysql.createPool({
        host: config.host,
        user: config.user,
        password: config.password,
        database: config.database,
        port: config.port,
        waitForConnections: config.waitForConnections ?? true,
        connectionLimit: config.connectionLimit ?? 10,
        queueLimit: config.queueLimit ?? 0,
      });
    }

    /* ---------- PostgreSQL ---------- */
    case "pg": {
      const client = new PgClient({
        host: config.host,
        user: config.user,
        password: config.password,
        database: config.database,
        port: config.port,
      });
      await client.connect();
      return client;
    }

    /* ---------- SQLite ---------- */
    case "sqlite": {
      return new BetterSqliteConnection(config.sqlitePath);
    }

    /* ---------- MongoDB ---------- */
    case "mongo": {
      applyMongoDnsServers(config.uri, config.dnsServers);
      const client = new MongoClient(config.uri);
      try {
        await client.connect();
        const db = client.db(config.database);
        mongoClientByDb.set(db, client);
        console.log(`Connected to MongoDB: ${config.database}`);
        return db;
      } catch (error) {
        try {
          await client.close();
        } catch {
          // no-op
        }
        throw normalizeMongoConnectionError(name, error);
      }
    }

    /* ---------- Unknown ---------- */
    default:
      throw new Error(`Unsupported driver: ${(config as any).driver}`);
  }
}

export async function closeMongoClient(connection: ConnectionInstance): Promise<boolean> {
  const db = connection as Db;
  const client = mongoClientByDb.get(db);
  if (!client) return false;
  await client.close();
  mongoClientByDb.delete(db);
  return true;
}

export function getMongoClient(connection: ConnectionInstance): MongoClient | null {
  const db = connection as Db;
  return mongoClientByDb.get(db) ?? null;
}

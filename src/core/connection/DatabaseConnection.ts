import { Pool } from "mysql2/promise";
import { Client as PgClient } from "pg";
import { open, Database } from "sqlite";
import sqlite3 from "sqlite3";
import { MongoClient, Db } from "mongodb";
import { dbConfig } from "../../config/database";

/* ----------------------------------------------------------
 * 🧱 1. Type Declarations for Configurations
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
}

/** Union type for all connection configs */
export type ConnectionConfig = MySQLConfig | PostgresConfig | SQLiteConfig | MongoConfig;

/** Database connection instance types */
export type ConnectionInstance = Pool | PgClient | Database | Db;

/** Supported connection names */
export type ConnectionName = keyof typeof dbConfig.connections;

/* ----------------------------------------------------------
 * ⚙️ 2. Connect Function (Multi-Driver)
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
    return await open({
      filename: config.sqlitePath,
      driver: sqlite3.Database,
    });
  }

  /* ---------- MongoDB ---------- */
  case "mongo": {
    const client = new MongoClient(config.uri);
    await client.connect();
    const db = client.db(config.database);
    console.log(`🧩 Connected to MongoDB: ${config.database}`);
    return db;
  }

  /* ---------- Unknown ---------- */
  default:
    throw new Error(`❌ Unsupported driver: ${(config as any).driver}`);
  }
}

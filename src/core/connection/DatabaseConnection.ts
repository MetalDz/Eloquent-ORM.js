import mysql from "mysql2/promise";
import { Client } from "pg";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import { dbConfig } from "../../config/database";

// Define connection names
export type ConnectionName = "mysql" | "pg" | "sqlite";

// Define specific config types
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

export interface PostgreSQLConfig {
  driver: "pg";
  host: string;
  user: string;
  password: string;
  database: string;
  port?: number;
}

export interface SQLiteConfig {
  driver: "sqlite";
  sqlitePath: string;
}

// Union of all supported configs
export type DBConfig = MySQLConfig | PostgreSQLConfig | SQLiteConfig;

/**
 * Connect to the selected database
 */
export async function connectDB(name: ConnectionName) {
  const config = dbConfig.connections[name] as DBConfig;

  switch (config.driver) {
    case "mysql": {
      const pool = mysql.createPool({
        host: config.host,
        user: config.user,
        password: config.password,
        database: config.database,
        port: config.port ?? 3306,
        waitForConnections: config.waitForConnections ?? true,
        connectionLimit: config.connectionLimit ?? 10,
        queueLimit: config.queueLimit ?? 0,
      });
      return pool;
    }

    case "pg": {
      const client = new Client({
        host: config.host,
        user: config.user,
        password: config.password,
        database: config.database,
        port: config.port ?? 5432,
      });
      await client.connect();
      return client;
    }

    case "sqlite": {
      const db = await open({
        filename: config.sqlitePath ?? "./database.sqlite",
        driver: sqlite3.Database,
      });
      return db;
    }

    default:
      throw new Error(`Unsupported database driver: ${(config as any).driver}`);
  }
}

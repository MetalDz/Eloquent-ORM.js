import fs from "fs";
import os from "os";
import path from "path";
import { getConnection, closeAllConnections } from "../core/connection/ConnectionFactory.js";
import { dbConfig } from "../config/database.js";

describe("SQLite driver replacement", () => {
  const sqliteConfig = dbConfig.connections.sqlite_test as {
    driver: "sqlite";
    sqlitePath: string;
  };

  let originalPath: string;
  let tempPath: string;

  beforeEach(() => {
    originalPath = sqliteConfig.sqlitePath;
    tempPath = path.join(
      os.tmpdir(),
      `eloquent-better-sqlite3-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.sqlite`
    );
    sqliteConfig.sqlitePath = tempPath;
  });

  afterEach(async () => {
    await closeAllConnections();
    sqliteConfig.sqlitePath = originalPath;
    if (fs.existsSync(tempPath)) {
      fs.rmSync(tempPath, { force: true });
    }
  });

  test("sqlite connection exposes the adapter-compatible contract", async () => {
    const connection = (await getConnection("sqlite_test")) as {
      all: (sql: string, params?: unknown[]) => Promise<unknown[]>;
      get: (sql: string, params?: unknown[]) => Promise<unknown>;
      run: (
        sql: string,
        params?: unknown[]
      ) => Promise<{ lastID?: number | bigint; changes?: number | bigint }>;
      exec: (sql: string) => Promise<void>;
      close: () => Promise<void>;
    };

    expect(typeof connection.all).toBe("function");
    expect(typeof connection.get).toBe("function");
    expect(typeof connection.run).toBe("function");
    expect(typeof connection.exec).toBe("function");
    expect(typeof connection.close).toBe("function");
  });

  test("sqlite replacement supports create, insert, query, and close flows", async () => {
    const connection = (await getConnection("sqlite_test")) as {
      all: (sql: string, params?: unknown[]) => Promise<Array<Record<string, unknown>>>;
      get: (sql: string, params?: unknown[]) => Promise<Record<string, unknown> | undefined>;
      run: (
        sql: string,
        params?: unknown[]
      ) => Promise<{ lastID?: number | bigint; changes?: number | bigint }>;
      exec: (sql: string) => Promise<void>;
    };

    await connection.exec(
      "CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL)"
    );

    const insert = await connection.run("INSERT INTO users (name) VALUES (?)", ["Alice"]);
    expect(insert.lastID).toBeDefined();

    const row = await connection.get("SELECT id, name FROM users WHERE id = ?", [
      insert.lastID,
    ]);
    expect(row).toEqual(
      expect.objectContaining({
        name: "Alice",
      })
    );

    const rows = await connection.all("SELECT name FROM users ORDER BY id");
    expect(rows).toEqual([{ name: "Alice" }]);
  });
});

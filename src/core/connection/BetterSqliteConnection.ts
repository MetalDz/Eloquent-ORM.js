type BetterSqliteRunResult = {
  changes: number | bigint;
  lastInsertRowid: number | bigint;
};

type BetterSqliteStatement = {
  all: (...params: unknown[]) => unknown[];
  get: (...params: unknown[]) => unknown;
  run: (...params: unknown[]) => BetterSqliteRunResult;
};

type BetterSqliteDatabase = {
  prepare: (sql: string) => BetterSqliteStatement;
  exec: (sql: string) => void;
  close: () => void;
};

type BetterSqliteConstructor = new (filename: string) => BetterSqliteDatabase;

const BetterSqlite3 = require("better-sqlite3") as BetterSqliteConstructor;

export interface SQLiteConnectionLike {
  all<T = unknown>(sql: string, params?: unknown[]): Promise<T[]>;
  get<T = unknown>(sql: string, params?: unknown[]): Promise<T | undefined>;
  run(
    sql: string,
    params?: unknown[]
  ): Promise<{ lastID?: number | bigint; changes?: number | bigint }>;
  exec(sql: string): Promise<void>;
  close(): Promise<void>;
}

function normalizeParams(params: unknown[] = []): unknown[] {
  return Array.isArray(params) ? params : [params];
}

export class BetterSqliteConnection implements SQLiteConnectionLike {
  private readonly db: BetterSqliteDatabase;

  constructor(filename: string) {
    this.db = new BetterSqlite3(filename);
  }

  async all<T = unknown>(sql: string, params: unknown[] = []): Promise<T[]> {
    return this.db.prepare(sql).all(...normalizeParams(params)) as T[];
  }

  async get<T = unknown>(
    sql: string,
    params: unknown[] = []
  ): Promise<T | undefined> {
    return this.db.prepare(sql).get(...normalizeParams(params)) as T | undefined;
  }

  async run(
    sql: string,
    params: unknown[] = []
  ): Promise<{ lastID?: number | bigint; changes?: number | bigint }> {
    const result = this.db.prepare(sql).run(...normalizeParams(params));
    return {
      lastID: result.lastInsertRowid,
      changes: result.changes,
    };
  }

  async exec(sql: string): Promise<void> {
    this.db.exec(sql);
  }

  async close(): Promise<void> {
    this.db.close();
  }
}

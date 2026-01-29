import type { ConnectionInstance, ConnectionName } from "./DatabaseConnection";
import { dbConfig } from "../../config/database";

export type AdapterKind = "sql" | "mongo";

export interface DriverAdapter {
  name: ConnectionName;
  kind: AdapterKind;

  query<T = unknown>(sql: string, params?: unknown[]): Promise<T[]>;
  queryOne<T = unknown>(sql: string, params?: unknown[]): Promise<T | null>;
  execute(sql: string, params?: unknown[]): Promise<void>;
  insert(
    sql: string,
    params?: unknown[]
  ): Promise<{ id?: unknown; row?: Record<string, unknown> }>;

  placeholder(index: number): string;
  placeholders(count: number, startIndex?: number): string;
  inClause(
    field: string,
    values: unknown[],
    startIndex?: number
  ): { sql: string; params: unknown[]; nextIndex: number };
  wrapId(id: string): string;
}

type SqlDriver = "mysql" | "pg" | "sqlite";

function isSqlDriver(driver: string): driver is SqlDriver {
  return driver === "mysql" || driver === "pg" || driver === "sqlite";
}

function assertSafeIdentifier(part: string): void {
  if (part === "*") return;
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(part)) {
    throw new Error(`Unsafe SQL identifier: ${part}`);
  }
}

function wrapIdentifier(id: string, quote: string): string {
  if (id === "*") return "*";
  const parts = id.split(".");
  const wrapped = parts.map((part) => {
    assertSafeIdentifier(part);
    if (part === "*") return "*";
    return `${quote}${part}${quote}`;
  });
  return wrapped.join(".");
}

function buildSqlAdapter(
  name: ConnectionName,
  connection: ConnectionInstance,
  driver: SqlDriver
): DriverAdapter {
  const quote = driver === "mysql" ? "`" : "\"";

  const placeholder = (index: number) => (driver === "pg" ? `$${index}` : "?");

  const placeholders = (count: number, startIndex = 1) => {
    const parts: string[] = [];
    for (let i = 0; i < count; i++) {
      parts.push(placeholder(startIndex + i));
    }
    return parts.join(", ");
  };

  const inClause = (field: string, values: unknown[], startIndex = 1) => {
    if (!values.length) {
      return { sql: "1=0", params: [], nextIndex: startIndex };
    }

    if (driver === "pg") {
      return {
        sql: `${field} = ANY(${placeholder(startIndex)})`,
        params: [values],
        nextIndex: startIndex + 1,
      };
    }

    const list = placeholders(values.length, startIndex);
    return {
      sql: `${field} IN (${list})`,
      params: values,
      nextIndex: startIndex + values.length,
    };
  };

  if (driver === "mysql") {
    return {
      name,
      kind: "sql",
      async query<T>(sql: string, params: unknown[] = []) {
        const [rows] = await (connection as any).query(sql, params);
        return rows as T[];
      },
      async queryOne<T>(sql: string, params: unknown[] = []) {
        const rows = await this.query<T>(sql, params);
        return rows[0] ?? null;
      },
      async execute(sql: string, params: unknown[] = []) {
        await (connection as any).query(sql, params);
      },
      async insert(sql: string, params: unknown[] = []) {
        const [res] = await (connection as any).query(sql, params);
        const id = res?.insertId ?? res?.insertedId ?? undefined;
        return { id };
      },
      placeholder,
      placeholders,
      inClause,
      wrapId: (id: string) => wrapIdentifier(id, quote),
    };
  }

  if (driver === "sqlite") {
    return {
      name,
      kind: "sql",
      async query<T>(sql: string, params: unknown[] = []) {
        return await (connection as any).all(sql, params);
      },
      async queryOne<T>(sql: string, params: unknown[] = []) {
        const row = await (connection as any).get(sql, params);
        return (row as T) ?? null;
      },
      async execute(sql: string, params: unknown[] = []) {
        await (connection as any).run(sql, params);
      },
      async insert(sql: string, params: unknown[] = []) {
        const res = await (connection as any).run(sql, params);
        return { id: res?.lastID };
      },
      placeholder,
      placeholders,
      inClause,
      wrapId: (id: string) => wrapIdentifier(id, quote),
    };
  }

  return {
    name,
    kind: "sql",
    async query<T>(sql: string, params: unknown[] = []) {
      const res = await (connection as any).query(sql, params);
      return res.rows as T[];
    },
    async queryOne<T>(sql: string, params: unknown[] = []) {
      const rows = await this.query<T>(sql, params);
      return rows[0] ?? null;
    },
    async execute(sql: string, params: unknown[] = []) {
      await (connection as any).query(sql, params);
    },
    async insert(sql: string, params: unknown[] = []) {
      const res = await (connection as any).query(`${sql} RETURNING *`, params);
      const row = res.rows?.[0];
      return { id: row?.id, row };
    },
    placeholder,
    placeholders,
    inClause,
    wrapId: (id: string) => wrapIdentifier(id, quote),
  };
}

export function createAdapter(
  name: ConnectionName,
  connection: ConnectionInstance
): DriverAdapter {
  const config = dbConfig.connections[name];
  const driver = config?.driver;

  if (driver === "mongo") {
    throw new Error("Mongo driver does not support SQL adapter APIs.");
  }

  if (!driver || !isSqlDriver(driver)) {
    throw new Error(`Unsupported driver for adapter: ${String(driver)}`);
  }

  return buildSqlAdapter(name, connection, driver);
}

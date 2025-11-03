// src/core/schema/SQLDialect.ts

/**
 * 🧠 SQLDialect
 * Handles identifier quoting for multiple SQL dialects.
 */
export type Dialect = "mysql" | "pg" | "sqlite";

export class SQLDialect {
  constructor(private readonly dialect: Dialect = "mysql") {}

  /**
   * Wraps an identifier (table or column) safely for the current dialect.
   */
  wrap(identifier: string): string {
    switch (this.dialect) {
      case "pg":
        return `"${identifier.replace(/"/g, '""')}"`; // double quotes escaped
      case "sqlite":
        return identifier; // SQLite tolerates plain identifiers
      default:
        return `\`${identifier.replace(/`/g, "``")}\``; // MySQL default
    }
  }

  /**
   * Quotes a full CREATE TABLE statement appropriately.
   */
  formatCreateSQL(table: string, columnsSQL: string[]): string {
    const t = this.wrap(table);
    return `CREATE TABLE IF NOT EXISTS ${t} (\n  ${columnsSQL.join(",\n  ")}\n);`;
  }

  /**
   * Quotes a DROP TABLE statement appropriately.
   */
  formatDropSQL(table: string): string {
    const t = this.wrap(table);
    return `DROP TABLE IF EXISTS ${t};`;
  }
}

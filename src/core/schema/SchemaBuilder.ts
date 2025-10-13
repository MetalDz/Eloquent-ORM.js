export class SchemaBuilder {
  static createTableSQL(tableName: string, columns: Record<string, string>) {
    const cols = Object.entries(columns)
      .map(([name, type]) => `${name} ${type}`)
      .join(", ");
    return `CREATE TABLE IF NOT EXISTS ${tableName} (${cols})`;
  }
}

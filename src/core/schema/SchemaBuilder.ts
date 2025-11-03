import {
  SchemaField,
  ColumnDefinition,
  RelationDefinition,
  MixinDefinition,
  validateSchema,
} from "./SchemaBlueprint";
import { SQLDialect, Dialect } from "./SQLDialect";
import { dbConfig } from "../../config/database";

/**
 * 🧱 SchemaBuilder (Enhanced v2)
 * Converts model blueprints to dialect-specific SQL and validates them.
 *
 * ✅ Supports:
 * - Full Relation Awareness (hasOne, belongsTo, belongsToMany, morph*)
 * - Pivot Tables (BelongsToMany) + Auto-Composite Keys
 * - Morph Columns (MorphOne, MorphMany, MorphTo)
 * - Multi-Dialect Awareness (MySQL, PostgreSQL, SQLite)
 * - Compound Primary Keys (auto-detect via { primary: true })
 * - Auto `DROP TABLE` generator for migrations
 */

export interface SchemaBuildResult {
  mainSQL: string;
  extraTables: string[]; // pivot/morph tables
}

export class SchemaBuilder {
  static toCreateSQL(
    tableName: string,
    schema: Record<string, SchemaField>,
    explicitDialect?: Dialect | string
  ): SchemaBuildResult {
    const supportedDialects: Dialect[] = ["mysql", "pg", "sqlite"];
    const dialectName = supportedDialects.includes(explicitDialect as Dialect)
      ? (explicitDialect as Dialect)
      : ((dbConfig.default as Dialect) || "mysql");

    if (!supportedDialects.includes(dialectName)) {
      throw new Error(
        `❌ Unsupported dialect "${explicitDialect}". This model may use a non-SQL driver (e.g., MongoDB).`
      );
    }

    const dialect = new SQLDialect(dialectName);
    const errors = validateSchema(schema);
    if (errors.length > 0)
      throw new Error(
        `❌ Schema validation failed for ${tableName}:\n${errors.join("\n")}`
      );

    const columns: string[] = [];
    const primaryColumns: string[] = [];
    const extraTables: string[] = [];

    for (const [name, field] of Object.entries(schema)) {
      switch (field.kind) {
        case "column":
          if (field.options?.primary) primaryColumns.push(name);
          columns.push(this.columnSQL(name, field, dialectName, dialect));
          break;

        case "relation": {
          const rel = this.relationSQL(tableName, name, field, dialect, dialectName);
          if (rel) {
            if (rel.type === "inline") columns.push(rel.sql);
            if (rel.type === "pivot") extraTables.push(rel.sql);
            if (rel.type === "morph") columns.push(...rel.sqls);
          }
          break;
        }

        case "mixin":
          columns.push(...this.mixinSQL(field, dialectName, dialect));
          break;
      }
    }

    if (primaryColumns.length > 1) {
      const pkCols = primaryColumns.map((col) => dialect.wrap(col)).join(", ");
      columns.push(`PRIMARY KEY (${pkCols})`);
    }

    const mainTableSQL = dialect.formatCreateSQL(tableName, columns);

    return {
      mainSQL: mainTableSQL,
      extraTables, // now holds actual CREATE TABLE SQLs
    };
  }

  /* ---------------- Auto Drop SQL Generator ---------------- */
  static toDropSQL(
    tableName: string,
    schema: Record<string, SchemaField>
  ): string[] {
    const dropSQL: string[] = [];
    const pivotTables: string[] = [];

    for (const [name, field] of Object.entries(schema)) {
      if (field.kind === "relation" && field.relation === "belongsToMany" && field.model) {
        const modelA = tableName.toLowerCase();
        const modelB = field.model.toLowerCase();
        const pivotTable = [modelA, modelB].sort().join("_") + "_pivot";
        pivotTables.push(pivotTable);
      }
    }

    // Morph tables are inline (same as model)
    dropSQL.push(`DROP TABLE IF EXISTS \`${tableName}\`;`);
    for (const pivot of pivotTables) {
      dropSQL.push(`DROP TABLE IF EXISTS \`${pivot}\`;`);
    }

    return dropSQL;
  }

  /* ---------------- COLUMN BUILDER ---------------- */
  private static columnSQL(
    name: string,
    c: ColumnDefinition,
    dialectName: Dialect,
    dialect: SQLDialect
  ): string {
    const { type, options } = c;
    const col = dialect.wrap(name);
    const parts: string[] = [];

    const typeMap: Record<string, Record<Dialect, string>> = {
      increments: {
        mysql: "INT AUTO_INCREMENT PRIMARY KEY",
        pg: "SERIAL PRIMARY KEY",
        sqlite: "INTEGER PRIMARY KEY AUTOINCREMENT",
      },
      uuid: { mysql: "CHAR(36)", pg: "UUID", sqlite: "TEXT" },
      string: { mysql: "VARCHAR", pg: "VARCHAR", sqlite: "TEXT" },
      int: { mysql: "INT", pg: "INTEGER", sqlite: "INTEGER" },
      boolean: { mysql: "BOOLEAN", pg: "BOOLEAN", sqlite: "INTEGER" },
      text: { mysql: "TEXT", pg: "TEXT", sqlite: "TEXT" },
      decimal: { mysql: "DECIMAL(10,2)", pg: "NUMERIC(10,2)", sqlite: "REAL" },
      json: { mysql: "JSON", pg: "JSONB", sqlite: "TEXT" },
      timestamp: {
        mysql: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
        pg: "TIMESTAMP DEFAULT NOW()",
        sqlite: "DATETIME DEFAULT CURRENT_TIMESTAMP",
      },
    };

    if (type === "increments") return `${col} ${typeMap.increments[dialectName]}`;

    if (typeMap[type]) {
      let sqlType = typeMap[type][dialectName];
      if (type === "string" && options.length) sqlType += `(${options.length})`;
      parts.push(`${col} ${sqlType}`);
    } else if (type === "softDeletes") {
      return `${dialect.wrap("deleted_at")} ${typeMap.timestamp[dialectName]} NULL`;
    } else if (type === "timestamps") {
      const createdAt = `${dialect.wrap("created_at")} ${typeMap.timestamp[dialectName]}`;
      const updatedAt = `${dialect.wrap("updated_at")} ${typeMap.timestamp[dialectName]}`;
      return `${createdAt}, ${updatedAt}`;
    } else {
      parts.push(`${col} TEXT`);
    }

    if (options.notNull) parts.push("NOT NULL");
    if (options.unique) parts.push("UNIQUE");
    if (options.primary && (type as string) !== "increments") parts.push("PRIMARY KEY");

    if (options.default !== undefined)
      parts.push(
        `DEFAULT ${
          typeof options.default === "string" ? `'${options.default}'` : options.default
        }`
      );

    return parts.join(" ");
  }

  /* ---------------- RELATIONS ---------------- */
  private static relationSQL(
    currentTable: string,
    _name: string,
    r: RelationDefinition,
    dialect: SQLDialect,
    dialectName: Dialect
  ):
    | { type: "inline"; sql: string }
    | { type: "pivot"; sql: string }
    | { type: "morph"; sqls: string[] }
    | null {
    const wrap = (v: string) => dialect.wrap(v);

    if (r.relation === "belongsTo" && r.options.foreignKey && r.model) {
      const sql = `FOREIGN KEY (${wrap(r.options.foreignKey)}) REFERENCES ${wrap(
        r.model.toLowerCase() + "s"
      )}(${wrap(r.options.localKey ?? "id")})`;
      return { type: "inline", sql };
    }

    if (r.relation === "belongsToMany" && r.model) {
      const modelA = currentTable.toLowerCase();
      const modelB = r.model.toLowerCase();
      const pivotTable = [modelA, modelB].sort().join("_") + "_pivot";

      const pivotSQL = dialect.formatCreateSQL(pivotTable, [
        `${wrap(modelA + "_id")} INT NOT NULL`,
        `${wrap(modelB + "_id")} INT NOT NULL`,
        `PRIMARY KEY (${wrap(modelA + "_id")}, ${wrap(modelB + "_id")})`,
        `FOREIGN KEY (${wrap(modelA + "_id")}) REFERENCES ${wrap(modelA + "s")}(${wrap("id")})`,
        `FOREIGN KEY (${wrap(modelB + "_id")}) REFERENCES ${wrap(modelB + "s")}(${wrap("id")})`,
      ]);

      return { type: "pivot", sql: pivotSQL };
    }

    if (["morphOne", "morphMany", "morphTo"].includes(r.relation)) {
      const morphName = r.options.morphName ?? "morphable";
      const sqls = [
        `${wrap(morphName + "_id")} INT`,
        `${wrap(morphName + "_type")} VARCHAR(255)`,
      ];
      return { type: "morph", sqls };
    }

    return null;
  }

  /* ---------------- MIXINS ---------------- */
  private static mixinSQL(
    m: MixinDefinition,
    dialectName: Dialect,
    dialect: SQLDialect
  ): string[] {
    switch (m.name) {
      case "SoftDeletes":
        return [
          `${dialect.wrap("deleted_at")} ${
            dialectName === "pg" ? "TIMESTAMP" : "DATETIME"
          } NULL DEFAULT NULL`,
        ];
      default:
        return [];
    }
  }
}

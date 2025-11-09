/* ============================================================
 * 🧱 SchemaBuilder v4.0
 * Auto-detects CREATE / ALTER / DROP COLUMN schema differences
 * ============================================================ */
import {
  SchemaField,
  ColumnDefinition,
  RelationDefinition,
  MixinDefinition,
  validateSchema,
} from "./SchemaBlueprint";
import { SQLDialect, Dialect } from "./SQLDialect";
import { dbConfig } from "../../config/database";

export interface SchemaBuildResult {
  mainSQL: string;
  extraTables: string[];
}

export class SchemaBuilder {
  static async toCreateSQL(
    tableName: string,
    schema: Record<string, SchemaField>,
    explicitDialect?: Dialect | string,
    smartUpdate: boolean = false
  ): Promise<SchemaBuildResult> {
    const supportedDialects: Dialect[] = ["mysql", "pg", "sqlite"];
    const dialectName = supportedDialects.includes(explicitDialect as Dialect)
      ? (explicitDialect as Dialect)
      : ((dbConfig.default as Dialect) || "mysql");

    if (!supportedDialects.includes(dialectName)) {
      throw new Error(`❌ Unsupported dialect: ${explicitDialect}`);
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
      const pkCols = primaryColumns.map((c) => dialect.wrap(c)).join(", ");
      columns.push(`PRIMARY KEY (${pkCols})`);
    }

    /* ============================================================
     * 🧠 Smart Diff Logic (Add + Drop)
     * ============================================================ */
    let tableExists = false;
    let existingColumns: string[] = [];

    try {
      const { getConnection } = await import("../connection/ConnectionFactory");
      const db = await getConnection(dialectName);

      if (dialectName === "mysql") {
        const [rows] = (await db.query?.(`SHOW TABLES LIKE '${tableName}'`)) as [
          Record<string, unknown>[],
          unknown[]
        ];
        tableExists = Array.isArray(rows) && rows.length > 0;

        if (tableExists) {
          const [cols] = (await db.query?.(
            `SHOW COLUMNS FROM \`${tableName}\`;`
          )) as [Array<{ Field: string }>, unknown[]];
          existingColumns = cols.map((c) => c.Field);
        }
      } else if (dialectName === "pg") {
        const [rows] = (await db.query?.(
          `SELECT column_name FROM information_schema.columns WHERE table_name = '${tableName}';`
        )) as [Array<{ column_name: string }>, unknown[]];
        tableExists = rows.length > 0;
        existingColumns = rows.map((r) => r.column_name);
      } else if (dialectName === "sqlite") {
        const [rows] = (await db.query?.(
          `PRAGMA table_info(${tableName});`
        )) as [Array<{ name: string }>, unknown[]];
        tableExists = rows.length > 0;
        existingColumns = rows.map((r) => r.name);
      }
    } catch {
      console.warn(`⚠️ Could not verify structure for '${tableName}'.`);
    }

    let mainSQL = "";

    if (!tableExists) {
      mainSQL = dialect.formatCreateSQL(tableName, columns);
    } else if (smartUpdate) {
      const newColumns = Object.keys(schema);
      const missingColumns: string[] = [];
      const dropColumns: string[] = [];

      // 🧩 Detect new columns
      for (const col of columns) {
        const match = col.match(/`(\w+)`/);
        if (match && !existingColumns.includes(match[1])) {
          missingColumns.push(col);
        }
      }

      // 🧩 Detect removed columns
      for (const existing of existingColumns) {
        if (
          !newColumns.includes(existing) &&
          !["id", "created_at", "updated_at", "deleted_at"].includes(existing)
        ) {
          dropColumns.push(existing);
        }
      }

      // 🧩 Nothing to change
      if (missingColumns.length === 0 && dropColumns.length === 0) {
        console.log(`🧬 No schema differences for '${tableName}'.`);
      } else {
        // Order timestamps last
        const lastCols = missingColumns.filter(
          (c) => /`created_at`/.test(c) || /`updated_at`/.test(c)
        );
        const normalCols = missingColumns.filter(
          (c) => !/`created_at`/.test(c) && !/`updated_at`/.test(c)
        );

        const addSQL = [...normalCols, ...lastCols]
          .map((c) => `ADD COLUMN ${c}`)
          .join(",\n  ");
        const dropSQL = dropColumns
          .map((name) => `DROP COLUMN \`${name}\``)
          .join(",\n  ");

        const combined = [addSQL, dropSQL].filter(Boolean).join(",\n  ");
        mainSQL = `ALTER TABLE \`${tableName}\`\n  ${combined};`;

        console.log(
          `🧠 Schema diff → +[${missingColumns
            .map((c) => c.match(/`(\w+)`/)?.[1])
            .join(", ") || "-"}], -[${dropColumns.join(", ") || "-"}]`
        );
      }
    }

    return { mainSQL, extraTables };
  }

  /* ============================================================
   * 🗑️ DROP TABLE
   * ============================================================ */
  static toDropSQL(tableName: string, schema: Record<string, SchemaField>): string[] {
    const dropSQL: string[] = [];
    const pivotTables: string[] = [];

    for (const [, field] of Object.entries(schema)) {
      if (field.kind === "relation" && field.relation === "belongsToMany" && field.model) {
        const modelA = tableName.toLowerCase();
        const modelB = field.model.toLowerCase();
        const pivot = [modelA, modelB].sort().join("_") + "_pivot";
        pivotTables.push(pivot);
      }
    }

    dropSQL.push(`DROP TABLE IF EXISTS \`${tableName}\`;`);
    for (const pivot of pivotTables)
      dropSQL.push(`DROP TABLE IF EXISTS \`${pivot}\`;`);

    return dropSQL;
  }

  /* ============================================================
   * 🧱 COLUMN BUILDER
   * ============================================================ */
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
    if (options.primary && (type as string ) !== "increments") parts.push("PRIMARY KEY");

    if (options.default !== undefined)
      parts.push(
        `DEFAULT ${typeof options.default === "string" ? `'${options.default}'` : options.default}`
      );

    return parts.join(" ");
  }

  /* ============================================================
   * 🔗 RELATIONS
   * ============================================================ */
  
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

  /* ============================================================
   * 🧩 MIXINS
   * ============================================================ */
  private static mixinSQL(m: MixinDefinition, dialectName: Dialect, dialect: SQLDialect): string[] {
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

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
    smartUpdate: boolean = false,
    connectionNameOverride?: string
  ): Promise<SchemaBuildResult> {
    const supportedDialects: Dialect[] = ["mysql", "pg", "sqlite"];
    let dialectName = supportedDialects.includes(explicitDialect as Dialect)
      ? (explicitDialect as Dialect)
      : ((dbConfig.default as Dialect) || "mysql");

    if (!supportedDialects.includes(dialectName)) {
      const maybe = explicitDialect ? dbConfig.connections[explicitDialect as keyof typeof dbConfig.connections] : undefined;
      const driver = maybe?.driver as Dialect | undefined;
      if (driver && supportedDialects.includes(driver)) {
        dialectName = driver;
      }
    }

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
    const columnSqlByName = new Map<string, string>();

    for (const [name, field] of Object.entries(schema)) {
      switch (field.kind) {
        case "column": {
          if (field.options?.primary) primaryColumns.push(name);
          const sql = this.columnSQL(name, field, dialectName, dialect);
          columns.push(sql);
          columnSqlByName.set(name, sql);
          break;
        }

        case "relation": {
          const rel = this.relationSQL(tableName, name, field, dialect, dialectName);
          if (rel) {
            if (rel.type === "inline") {
              for (const col of rel.columns) {
                if (!columnSqlByName.has(col.name)) {
                  columns.push(col.sql);
                  columnSqlByName.set(col.name, col.sql);
                }
              }
              columns.push(...rel.constraints);
            }
            if (rel.type === "pivot") extraTables.push(rel.sql);
            if (rel.type === "morph") {
              for (const col of rel.columns) {
                if (!columnSqlByName.has(col.name)) {
                  columns.push(col.sql);
                  columnSqlByName.set(col.name, col.sql);
                }
              }
            }
          }
          break;
        }

        case "mixin": {
          const mixinCols = this.mixinSQL(field, dialectName, dialect);
          columns.push(...mixinCols);
          if (field.name === "SoftDeletes") {
            const name = "deleted_at";
            const sql = mixinCols.find((c) => c.includes(dialect.wrap(name)));
            if (sql) columnSqlByName.set(name, sql);
          }
          break;
        }
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
      const db = await getConnection(((connectionNameOverride as unknown) || dialectName) as any);

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
      const schemaColumns = Array.from(columnSqlByName.keys());
      const missingColumns: string[] = [];
      const dropColumns: string[] = [];

      // 🧩 Detect new columns
      for (const colName of schemaColumns) {
        if (!existingColumns.includes(colName)) {
          const sql = columnSqlByName.get(colName);
          if (sql) missingColumns.push(sql);
        }
      }

      // 🧩 Detect removed columns
      for (const existing of existingColumns) {
        if (
          !schemaColumns.includes(existing) &&
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
    | { type: "inline"; columns: Array<{ name: string; sql: string }>; constraints: string[] }
    | { type: "pivot"; sql: string }
    | { type: "morph"; sqls: string[]; columns: Array<{ name: string; sql: string }> }
    | null {
    const wrap = (v: string) => dialect.wrap(v);

    if (r.relation === "belongsTo" && r.options.foreignKey && r.model) {
      const fk = r.options.foreignKey;
      const colSql = `${wrap(fk)} ${dialectName === "pg" ? "INTEGER" : "INT"}`;
      const fkSql = `FOREIGN KEY (${wrap(fk)}) REFERENCES ${wrap(
        r.model.toLowerCase() + "s"
      )}(${wrap(r.options.localKey ?? "id")})`;
      return {
        type: "inline",
        columns: [{ name: fk, sql: colSql }],
        constraints: [fkSql],
      };
    }

    if (r.relation === "belongsToMany" && r.model) {
      const tableA = currentTable.toLowerCase();
      const tableB = r.model.toLowerCase().endsWith("s")
        ? r.model.toLowerCase()
        : `${r.model.toLowerCase()}s`;

      const keyA = tableA.endsWith("s") ? tableA.slice(0, -1) : tableA;
      const keyB = tableB.endsWith("s") ? tableB.slice(0, -1) : tableB;

      const pivotTable = [keyA, keyB].sort().join("_") + "_pivot";

      const pivotSQL = dialect.formatCreateSQL(pivotTable, [
        `${wrap(keyA + "_id")} INT NOT NULL`,
        `${wrap(keyB + "_id")} INT NOT NULL`,
        `PRIMARY KEY (${wrap(keyA + "_id")}, ${wrap(keyB + "_id")})`,
        `FOREIGN KEY (${wrap(keyA + "_id")}) REFERENCES ${wrap(tableA)}(${wrap("id")})`,
        `FOREIGN KEY (${wrap(keyB + "_id")}) REFERENCES ${wrap(tableB)}(${wrap("id")})`,
      ]);

      return { type: "pivot", sql: pivotSQL };
    }

    if (r.relation === "morphTo") {
      const morphName = r.options.morphName ?? "morphable";
      const idName = morphName + "_id";
      const typeName = morphName + "_type";
      const idSql = `${wrap(idName)} INT`;
      const typeSql = `${wrap(typeName)} VARCHAR(255)`;
      return {
        type: "morph",
        sqls: [idSql, typeSql],
        columns: [
          { name: idName, sql: idSql },
          { name: typeName, sql: typeSql },
        ],
      };
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

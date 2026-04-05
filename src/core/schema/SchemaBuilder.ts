/* ============================================================
 * SchemaBuilder v4.0
 * Auto-detects CREATE / ALTER / DROP COLUMN schema differences
 * ============================================================ */
import {
  DatabaseForeignKeyDefinition,
  DatabaseIndexDefinition,
  SchemaField,
  ColumnDefinition,
  RelationDefinition,
  MixinDefinition,
  ModelDatabaseDefinition,
  validateSchema,
} from "./SchemaBlueprint.js";
import { SQLDialect, Dialect } from "./SQLDialect.js";
import { dbConfig } from "../../config/database.js";
import { getAdapter } from "../connection/ConnectionFactory.js";

export interface SchemaBuildResult {
  mainSQL: string;
  extraTables: string[];
  rollbackMainSQL: string;
  rollbackExtraTables: string[];
}

type ConstraintDefinition = {
  key: string;
  name: string;
  createSql: string;
  addClause: string;
  dropClause: string;
  managed: boolean;
};

type ExistingConstraint = {
  key: string;
  name: string;
  addClause: string;
  dropClause: string;
  managed: boolean;
};

type ManagedIndexDefinition = {
  key: string;
  name: string;
  createSql: string;
  dropSql: string;
};

type ExistingIndex = {
  key: string;
  name: string;
};

export class SchemaBuilder {
  static async toCreateSQL(
    tableName: string,
    schema: Record<string, SchemaField>,
    explicitDialect?: Dialect | string,
    smartUpdate: boolean = false,
    connectionNameOverride?: string,
    forceCreate: boolean = false,
    database?: ModelDatabaseDefinition
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
      throw new Error(`ERROR: Unsupported dialect: ${explicitDialect}`);
    }

    const dialect = new SQLDialect(dialectName);
    const errors = validateSchema(schema);
    if (errors.length > 0)
      throw new Error(
        `ERROR: Schema validation failed for ${tableName}:\n${errors.join("\n")}`
      );

    const columns: string[] = [];
    const primaryColumns: string[] = [];
    const extraTables: string[] = [];
    const rollbackExtraTables: string[] = [];
    const columnSqlByName = new Map<string, string>();
    const desiredConstraintsByKey = new Map<string, ConstraintDefinition>();
    const desiredIndexesByKey = new Map<string, ManagedIndexDefinition>();
    const desiredPivotTables = new Map<
      string,
      {
        createSql: string;
        dropSql: string;
      }
    >();

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
              columns.push(...rel.constraints.map((constraint) => constraint.createSql));
              for (const constraint of rel.constraints) {
                desiredConstraintsByKey.set(constraint.key, constraint);
              }
            }
            if (rel.type === "pivot") {
              desiredPivotTables.set(rel.tableName, {
                createSql: rel.sql,
                dropSql: dialect.formatDropSQL(rel.tableName),
              });
            }
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

    for (const foreignKey of database?.foreignKeys ?? []) {
      const definition = this.databaseForeignKeyConstraintDefinition(
        tableName,
        foreignKey,
        dialect,
        dialectName
      );
      columns.push(definition.createSql);
      desiredConstraintsByKey.set(definition.key, definition);
    }

    for (const index of database?.indexes ?? []) {
      const definition = this.indexDefinition(
        tableName,
        index,
        dialect,
        dialectName
      );
      desiredIndexesByKey.set(definition.key, definition);
    }

    if (primaryColumns.length > 1) {
      const pkCols = primaryColumns.map((c) => dialect.wrap(c)).join(", ");
      columns.push(`PRIMARY KEY (${pkCols})`);
    }

    /* ============================================================
     * Smart Diff Logic (Add + Drop)
     * ============================================================ */
    let tableExists = false;
    let existingColumns: string[] = [];
    const existingColumnSqlByName = new Map<string, string>();
    const existingConstraintsByKey = new Map<string, ExistingConstraint>();
    const existingIndexesByKey = new Map<string, ExistingIndex>();
    let introspectionAdapter:
      | {
          query<T = unknown>(sql: string, params?: unknown[]): Promise<T[]>;
          placeholder(index: number): string;
        }
      | null = null;

    if (!forceCreate) {
      try {
        const adapter = await getAdapter(
          ((connectionNameOverride as unknown) || dialectName) as any
        );
        introspectionAdapter = adapter;

      if (dialectName === "mysql") {
        const rows = await adapter.query<Record<string, unknown>>(
          `SHOW TABLES LIKE ${adapter.placeholder(1)}`,
          [tableName]
        );
        tableExists = rows.length > 0;

        if (tableExists) {
          const cols = await adapter.query<{
            Field: string;
            Type: string;
            Null: string;
            Key: string;
            Default: unknown;
            Extra: string;
          }>(`SHOW COLUMNS FROM ${dialect.wrap(tableName)};`);
          existingColumns = cols.map((c) => c.Field);
          for (const c of cols) {
            existingColumnSqlByName.set(c.Field, this.mysqlColumnSQL(c, dialect));
          }
          const constraints = await this.mysqlForeignKeys(adapter, tableName, dialect);
          for (const constraint of constraints) {
            existingConstraintsByKey.set(constraint.key, constraint);
          }
          const indexes = await this.mysqlIndexes(adapter, tableName);
          for (const index of indexes) {
            existingIndexesByKey.set(index.key, index);
          }
        }
      } else if (dialectName === "pg") {
        const rows = await adapter.query<{
          column_name: string;
          data_type: string;
          udt_name: string;
          is_nullable: "YES" | "NO";
          column_default: string | null;
          character_maximum_length: number | null;
          numeric_precision: number | null;
          numeric_scale: number | null;
        }>(
          `SELECT
             column_name,
             data_type,
             udt_name,
             is_nullable,
             column_default,
             character_maximum_length,
             numeric_precision,
             numeric_scale
           FROM information_schema.columns
           WHERE table_name = ${adapter.placeholder(1)}
             AND table_schema = current_schema();`,
          [tableName]
        );
        tableExists = rows.length > 0;
        existingColumns = rows.map((r) => r.column_name);
        for (const r of rows) {
          existingColumnSqlByName.set(r.column_name, this.pgColumnSQL(r, dialect));
        }
        const constraints = await this.pgForeignKeys(adapter, tableName, dialect);
        for (const constraint of constraints) {
          existingConstraintsByKey.set(constraint.key, constraint);
        }
        const indexes = await this.pgIndexes(adapter, tableName);
        for (const index of indexes) {
          existingIndexesByKey.set(index.key, index);
        }
      } else {
        // mysql/pg were handled above; with validated dialects, the remaining branch is sqlite.
        const rows = await adapter.query<{
          name: string;
          type: string;
          notnull: number;
          dflt_value: string | null;
          pk: number;
        }>(`PRAGMA table_info(${dialect.wrap(tableName)});`);
        tableExists = rows.length > 0;
        existingColumns = rows.map((r) => r.name);
        for (const r of rows) {
          existingColumnSqlByName.set(r.name, this.sqliteColumnSQL(r, dialect));
        }
        const constraints = await this.sqliteForeignKeys(adapter, tableName, dialect);
        for (const constraint of constraints) {
          existingConstraintsByKey.set(constraint.key, constraint);
        }
        const indexes = await this.sqliteIndexes(adapter, tableName);
        for (const index of indexes) {
          existingIndexesByKey.set(index.key, index);
        }
      }
    } catch {
      console.warn(`WARN: Could not verify structure for '${tableName}'.`);
    }

    }

    if (desiredPivotTables.size > 0) {
      if (!tableExists || !smartUpdate) {
        for (const pivotTable of desiredPivotTables.values()) {
          extraTables.push(pivotTable.createSql);
          rollbackExtraTables.push(pivotTable.dropSql);
        }
      } else {
        for (const [pivotName, pivotTable] of desiredPivotTables.entries()) {
          const exists =
            introspectionAdapter &&
            (await this.pivotTableExists(
              introspectionAdapter,
              dialectName,
              dialect,
              pivotName
            ));
          if (exists) continue;
          extraTables.push(pivotTable.createSql);
          rollbackExtraTables.push(pivotTable.dropSql);
        }
      }
    }

    for (const index of desiredIndexesByKey.values()) {
      if (!tableExists || !smartUpdate || !existingIndexesByKey.has(index.key)) {
        extraTables.push(index.createSql);
        rollbackExtraTables.push(index.dropSql);
      }
    }

    let mainSQL = "";
    let rollbackMainSQL = "";

    if (!tableExists) {
      mainSQL = dialect.formatCreateSQL(tableName, columns);
      rollbackMainSQL = dialect.formatDropSQL(tableName);
    } else if (smartUpdate) {
      const schemaColumns = Array.from(columnSqlByName.keys());
      const missingColumns: string[] = [];
      const missingColumnNames: string[] = [];
      const dropColumns: string[] = [];
      const addConstraints: ConstraintDefinition[] = [];
      const dropConstraints: ExistingConstraint[] = [];

      // Detect new columns
      for (const colName of schemaColumns) {
        if (!existingColumns.includes(colName)) {
          const sql = columnSqlByName.get(colName);
          if (sql) {
            missingColumns.push(sql);
            missingColumnNames.push(colName);
          }
        }
      }

      // Detect removed columns
      for (const existing of existingColumns) {
        if (
          !schemaColumns.includes(existing) &&
          !["id", "created_at", "updated_at"].includes(existing)
        ) {
          dropColumns.push(existing);
        }
      }

      for (const [key, constraint] of desiredConstraintsByKey.entries()) {
        if (!existingConstraintsByKey.has(key) && constraint.addClause.trim().length > 0) {
          addConstraints.push(constraint);
        }
      }

      for (const [key, constraint] of existingConstraintsByKey.entries()) {
        if (
          constraint.managed &&
          !desiredConstraintsByKey.has(key) &&
          constraint.dropClause.trim().length > 0
        ) {
          dropConstraints.push(constraint);
        }
      }

      // Nothing to change
      if (
        missingColumns.length === 0 &&
        dropColumns.length === 0 &&
        addConstraints.length === 0 &&
        dropConstraints.length === 0
      ) {
        console.log(`INFO: No schema differences for '${tableName}'.`);
      } else {
        // Order timestamps last
        const createdAtToken = dialect.wrap("created_at");
        const updatedAtToken = dialect.wrap("updated_at");
        const lastCols = missingColumns.filter(
          (c) => c.includes(createdAtToken) || c.includes(updatedAtToken)
        );
        const normalCols = missingColumns.filter(
          (c) => !c.includes(createdAtToken) && !c.includes(updatedAtToken)
        );

        const addColumnSQL = [...normalCols, ...lastCols]
          .map((c) => `ADD COLUMN ${c}`)
          .join(",\n  ");
        const addConstraintSQL = addConstraints
          .map((constraint) => constraint.addClause)
          .join(",\n  ");
        const dropConstraintSQL = dropConstraints
          .map((constraint) => constraint.dropClause)
          .join(",\n  ");
        const dropColumnSQL = dropColumns
          .map((name) => `DROP COLUMN ${dialect.wrap(name)}`)
          .join(",\n  ");

        const combined = [
          dropConstraintSQL,
          dropColumnSQL,
          addColumnSQL,
          addConstraintSQL,
        ]
          .filter(Boolean)
          .join(",\n  ");
        mainSQL = `ALTER TABLE ${dialect.wrap(tableName)}\n  ${combined};`;

        const restoreDroppedSQL = dropColumns
          .map((name) => existingColumnSqlByName.get(name))
          .filter((sql): sql is string => !!sql)
          .map((sql) => `ADD COLUMN ${sql}`);
        const dropAddedSQL = missingColumnNames.map(
          (name) => `DROP COLUMN ${dialect.wrap(name)}`
        );
        const rollbackDropConstraints = addConstraints
          .map((constraint) => constraint.dropClause)
          .filter(Boolean);
        const rollbackAddConstraints = dropConstraints
          .map((constraint) => constraint.addClause)
          .filter(Boolean);
        const rollbackCombined = [
          ...rollbackDropConstraints,
          ...dropAddedSQL,
          ...restoreDroppedSQL,
          ...rollbackAddConstraints,
        ]
          .filter(Boolean)
          .join(",\n  ");
        if (rollbackCombined.length > 0) {
          rollbackMainSQL = `ALTER TABLE ${dialect.wrap(tableName)}\n  ${rollbackCombined};`;
        }

        console.log(
          `Schema diff -> +[${missingColumnNames.join(", ") || "-"}], -[${
            dropColumns.join(", ") || "-"
          }], +fk[${addConstraints.map((constraint) => constraint.key).join(", ") || "-"}], -fk[${
            dropConstraints.map((constraint) => constraint.key).join(", ") || "-"
          }], +idx[${
            [...desiredIndexesByKey.values()]
              .filter((index) => !existingIndexesByKey.has(index.key))
              .map((index) => index.name)
              .join(", ") || "-"
          }]`
        );
      }
    }

    return { mainSQL, extraTables, rollbackMainSQL, rollbackExtraTables };
  }

  /* ============================================================
   * DROP TABLE
   * ============================================================ */
  static toDropSQL(
    tableName: string,
    schema: Record<string, SchemaField>,
    dialectName: Dialect = "mysql"
  ): string[] {
    const dropSQL: string[] = [];
    const pivotTables: string[] = [];
    const dialect = new SQLDialect(dialectName);

    for (const [, field] of Object.entries(schema)) {
      if (field.kind === "relation" && field.relation === "belongsToMany" && field.model) {
        const modelA = tableName.toLowerCase();
        const modelB = field.model.toLowerCase();
        const pivot = [modelA, modelB].sort().join("_") + "_pivot";
        pivotTables.push(pivot);
      }
    }

    dropSQL.push(dialect.formatDropSQL(tableName));
    for (const pivot of pivotTables)
      dropSQL.push(dialect.formatDropSQL(pivot));

    return dropSQL;
  }

  /* ============================================================
   * COLUMN BUILDER
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

    if (options.default !== undefined) {
      parts.push(`DEFAULT ${this.formatDefaultLiteral(options.default, dialectName)}`);
    }

    return parts.join(" ");
  }

  /* ============================================================
   * RELATIONS
   * ============================================================ */
  
  private static relationSQL(
    currentTable: string,
    _name: string,
    r: RelationDefinition,
    dialect: SQLDialect,
    dialectName: Dialect
  ): 
    | { type: "inline"; columns: Array<{ name: string; sql: string }>; constraints: ConstraintDefinition[] }
    | { type: "pivot"; sql: string; tableName: string }
    | { type: "morph"; sqls: string[]; columns: Array<{ name: string; sql: string }> }
    | null {
    const wrap = (v: string) => dialect.wrap(v);
    const integerType = dialectName === "mysql" ? "INT" : "INTEGER";
    const stringType = dialectName === "sqlite" ? "TEXT" : "VARCHAR(255)";

    if (r.relation === "belongsTo" && r.options.foreignKey && r.model) {
      const fk = r.options.foreignKey;
      const referencedTable = this.referencedTableName(r.model);
      const referencedColumn = r.options.localKey ?? "id";
      const colSql = `${wrap(fk)} ${integerType}`;
      const fkSql = this.foreignKeyConstraintDefinition(
        currentTable,
        fk,
        referencedTable,
        referencedColumn,
        dialect,
        dialectName
      );
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
      // tableB is normalized above to always end with "s".
      const keyB = tableB.slice(0, -1);

      const pivotTable = [keyA, keyB].sort().join("_") + "_pivot";
      const pivotSides = [
        { key: keyA, table: tableA },
        { key: keyB, table: tableB },
      ].sort((left, right) => left.key.localeCompare(right.key));

      const pivotSQL = dialect.formatCreateSQL(pivotTable, [
        `${wrap(pivotSides[0].key + "_id")} ${integerType} NOT NULL`,
        `${wrap(pivotSides[1].key + "_id")} ${integerType} NOT NULL`,
        `PRIMARY KEY (${wrap(pivotSides[0].key + "_id")}, ${wrap(pivotSides[1].key + "_id")})`,
        `FOREIGN KEY (${wrap(pivotSides[0].key + "_id")}) REFERENCES ${wrap(
          pivotSides[0].table
        )}(${wrap("id")})`,
        `FOREIGN KEY (${wrap(pivotSides[1].key + "_id")}) REFERENCES ${wrap(
          pivotSides[1].table
        )}(${wrap("id")})`,
      ]);

      return { type: "pivot", sql: pivotSQL, tableName: pivotTable };
    }

    if (r.relation === "morphTo") {
      const morphName = r.options.morphName ?? "morphable";
      const idName = morphName + "_id";
      const typeName = morphName + "_type";
      const idSql = `${wrap(idName)} ${integerType}`;
      const typeSql = `${wrap(typeName)} ${stringType}`;
      return {
        type: "morph",
        sqls: [idSql, typeSql],
        columns: [
          { name: idName, sql: idSql },
          { name: typeName, sql: typeSql },
        ],
      };
    }

    // Inverse-side relations do not own columns on the current table.
    // Their schema effects are represented by belongsTo / morphTo on the related model.
    if (
      r.relation === "hasOne" ||
      r.relation === "hasMany" ||
      r.relation === "morphOne" ||
      r.relation === "morphMany"
    ) {
      return null;
    }

    return null;
  }

  /* ============================================================
   * MIXINS
   * ============================================================ */

  private static formatDefaultLiteral(value: unknown, dialectName: Dialect = "mysql"): string {
    if (value === null || value === undefined) return "NULL";
    if (typeof value === "number" || typeof value === "bigint") return String(value);
    if (typeof value === "boolean") {
      if (dialectName === "pg") return value ? "TRUE" : "FALSE";
      return value ? "1" : "0";
    }
    const raw = String(value);
    const upper = raw.toUpperCase();
    if (
      upper.includes("CURRENT_TIMESTAMP") ||
      upper === "NOW()" ||
      upper.endsWith("()")
    ) {
      return raw;
    }
    if (
      (raw.startsWith("'") && raw.endsWith("'")) ||
      (raw.startsWith('"') && raw.endsWith('"'))
    ) {
      return raw;
    }
    return `'${raw.replace(/'/g, "''")}'`;
  }

  private static mysqlColumnSQL(
    column: {
      Field: string;
      Type: string;
      Null: string;
      Key: string;
      Default: unknown;
      Extra: string;
    },
    dialect: SQLDialect
  ): string {
    const parts = [`${dialect.wrap(column.Field)} ${column.Type.toUpperCase()}`];
    if (column.Null === "NO") parts.push("NOT NULL");
    if (column.Default !== null && column.Default !== undefined) {
      parts.push(`DEFAULT ${this.formatDefaultLiteral(column.Default, "mysql")}`);
    }
    if (typeof column.Extra === "string" && column.Extra.toLowerCase().includes("auto_increment")) {
      parts.push("AUTO_INCREMENT");
    }
    if (column.Key === "UNI") parts.push("UNIQUE");
    return parts.join(" ");
  }

  private static pgTypeSQL(column: {
    data_type: string;
    udt_name: string;
    character_maximum_length: number | null;
    numeric_precision: number | null;
    numeric_scale: number | null;
  }): string {
    const dataType = column.data_type;
    if (dataType === "character varying") {
      return column.character_maximum_length
        ? `VARCHAR(${column.character_maximum_length})`
        : "VARCHAR";
    }
    if (dataType === "character") {
      return column.character_maximum_length
        ? `CHAR(${column.character_maximum_length})`
        : "CHAR";
    }
    if (dataType === "numeric") {
      if (column.numeric_precision != null && column.numeric_scale != null) {
        return `NUMERIC(${column.numeric_precision},${column.numeric_scale})`;
      }
      if (column.numeric_precision != null) {
        return `NUMERIC(${column.numeric_precision})`;
      }
      return "NUMERIC";
    }
    if (dataType === "timestamp without time zone") return "TIMESTAMP";
    if (dataType === "timestamp with time zone") return "TIMESTAMPTZ";
    if (dataType === "USER-DEFINED" && column.udt_name) return column.udt_name;
    return dataType.toUpperCase();
  }

  private static pgColumnSQL(
    column: {
      column_name: string;
      data_type: string;
      udt_name: string;
      is_nullable: "YES" | "NO";
      column_default: string | null;
      character_maximum_length: number | null;
      numeric_precision: number | null;
      numeric_scale: number | null;
    },
    dialect: SQLDialect
  ): string {
    const parts = [`${dialect.wrap(column.column_name)} ${this.pgTypeSQL(column)}`];
    if (column.is_nullable === "NO") parts.push("NOT NULL");
    if (column.column_default !== null && column.column_default !== undefined) {
      parts.push(`DEFAULT ${column.column_default}`);
    }
    return parts.join(" ");
  }

  private static sqliteColumnSQL(
    column: {
      name: string;
      type: string;
      notnull: number;
      dflt_value: string | null;
      pk: number;
    },
    dialect: SQLDialect
  ): string {
    const type = column.type?.trim() ? column.type : "TEXT";
    const parts = [`${dialect.wrap(column.name)} ${type}`];
    if (column.notnull === 1) parts.push("NOT NULL");
    if (column.dflt_value !== null && column.dflt_value !== undefined) {
      parts.push(`DEFAULT ${column.dflt_value}`);
    }
    if (column.pk === 1) parts.push("PRIMARY KEY");
    return parts.join(" ");
  }

  private static referencedTableName(model: string): string {
    return model.toLowerCase().endsWith("s") ? model.toLowerCase() : `${model.toLowerCase()}s`;
  }

  private static foreignKeyConstraintName(tableName: string, foreignKey: string): string {
    return `${tableName}_${foreignKey}_foreign`;
  }

  private static foreignKeyConstraintKey(
    foreignKey: string,
    referencedTable: string,
    referencedColumn: string
  ): string {
    return `fk:${foreignKey}:${referencedTable}:${referencedColumn}`;
  }

  private static normalizeRelationalAction(action?: string): string | null {
    if (!action) return null;
    return action.trim().toUpperCase();
  }

  private static appendForeignKeyActions(
    baseSql: string,
    onDelete?: string,
    onUpdate?: string
  ): string {
    const clauses = [baseSql];
    const normalizedOnDelete = this.normalizeRelationalAction(onDelete);
    const normalizedOnUpdate = this.normalizeRelationalAction(onUpdate);

    if (normalizedOnDelete) clauses.push(`ON DELETE ${normalizedOnDelete}`);
    if (normalizedOnUpdate) clauses.push(`ON UPDATE ${normalizedOnUpdate}`);

    return clauses.join(" ");
  }

  private static foreignKeyConstraintDefinition(
    tableName: string,
    foreignKey: string,
    referencedTable: string,
    referencedColumn: string,
    dialect: SQLDialect,
    dialectName: Dialect,
    existingName?: string
  ): ConstraintDefinition {
    const wrap = (value: string) => dialect.wrap(value);
    const constraintName = existingName ?? this.foreignKeyConstraintName(tableName, foreignKey);
    const key = this.foreignKeyConstraintKey(foreignKey, referencedTable, referencedColumn);
    const foreignKeySql = `FOREIGN KEY (${wrap(foreignKey)}) REFERENCES ${wrap(referencedTable)}(${wrap(
      referencedColumn
    )})`;
    const createSql = `CONSTRAINT ${wrap(constraintName)} ${foreignKeySql}`;
    const addClause =
      dialectName === "sqlite"
        ? ""
        : `ADD ${createSql}`;
    const dropClause =
      dialectName === "mysql"
        ? `DROP FOREIGN KEY ${wrap(constraintName)}`
        : dialectName === "pg"
          ? `DROP CONSTRAINT ${wrap(constraintName)}`
          : "";

    return {
      key,
      name: constraintName,
      createSql,
      addClause,
      dropClause,
      managed: constraintName === this.foreignKeyConstraintName(tableName, foreignKey),
    };
  }

  private static databaseForeignKeyConstraintDefinition(
    tableName: string,
    definition: DatabaseForeignKeyDefinition,
    dialect: SQLDialect,
    dialectName: Dialect
  ): ConstraintDefinition {
    const referencedColumn = definition.references.column ?? "id";
    const baseDefinition = this.foreignKeyConstraintDefinition(
      tableName,
      definition.column,
      definition.references.table,
      referencedColumn,
      dialect,
      dialectName,
      definition.name
    );
    const createSql = this.appendForeignKeyActions(
      baseDefinition.createSql,
      definition.onDelete,
      definition.onUpdate
    );
    const addClause =
      dialectName === "sqlite"
        ? ""
        : `ADD ${createSql}`;

    return {
      ...baseDefinition,
      name: definition.name ?? baseDefinition.name,
      createSql,
      addClause,
      managed: true,
    };
  }

  private static indexKey(
    columns: string[],
    unique: boolean,
    where?: string
  ): string {
    const normalizedWhere = where?.trim().replace(/\s+/g, " ").toLowerCase() ?? "";
    return `idx:${unique ? "unique" : "plain"}:${columns.join(",").toLowerCase()}:${normalizedWhere}`;
  }

  private static defaultIndexName(
    tableName: string,
    columns: string[],
    unique: boolean
  ): string {
    return `${tableName}_${columns.join("_")}_${unique ? "unique" : "idx"}`;
  }

  private static indexDefinition(
    tableName: string,
    definition: DatabaseIndexDefinition,
    dialect: SQLDialect,
    _dialectName: Dialect
  ): ManagedIndexDefinition {
    const name =
      definition.name ?? this.defaultIndexName(tableName, definition.columns, !!definition.unique);
    const wrappedColumns = definition.columns.map((column) => dialect.wrap(column)).join(", ");
    const uniqueSql = definition.unique ? "UNIQUE " : "";
    const whereSql = definition.where?.trim() ? ` WHERE ${definition.where.trim()}` : "";
    const createSql = `CREATE ${uniqueSql}INDEX IF NOT EXISTS ${dialect.wrap(name)} ON ${dialect.wrap(
      tableName
    )} (${wrappedColumns})${whereSql};`;
    const dropSql = `DROP INDEX IF EXISTS ${dialect.wrap(name)};`;

    return {
      key: this.indexKey(definition.columns, !!definition.unique, definition.where),
      name,
      createSql,
      dropSql,
    };
  }

  private static async mysqlForeignKeys(
    adapter: {
      query<T = unknown>(sql: string, params?: unknown[]): Promise<T[]>;
      placeholder(index: number): string;
    },
    tableName: string,
    dialect: SQLDialect
  ): Promise<ExistingConstraint[]> {
    const rows = await adapter.query<{
      constraint_name: string;
      column_name: string;
      referenced_table_name: string;
      referenced_column_name: string;
    }>(
      `SELECT
         CONSTRAINT_NAME AS constraint_name,
         COLUMN_NAME AS column_name,
         REFERENCED_TABLE_NAME AS referenced_table_name,
         REFERENCED_COLUMN_NAME AS referenced_column_name
       FROM information_schema.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = ${adapter.placeholder(1)}
         AND REFERENCED_TABLE_NAME IS NOT NULL`,
      [tableName]
    );

    return rows.map((row) => {
      const definition = this.foreignKeyConstraintDefinition(
        tableName,
        row.column_name,
        row.referenced_table_name,
        row.referenced_column_name,
        dialect,
        "mysql",
        row.constraint_name
      );
      return {
        key: definition.key,
        name: definition.name,
        addClause: definition.addClause,
        dropClause: definition.dropClause,
        managed: definition.managed,
      };
    });
  }

  private static async pgForeignKeys(
    adapter: {
      query<T = unknown>(sql: string, params?: unknown[]): Promise<T[]>;
      placeholder(index: number): string;
    },
    tableName: string,
    dialect: SQLDialect
  ): Promise<ExistingConstraint[]> {
    const rows = await adapter.query<{
      constraint_name: string;
      column_name: string;
      referenced_table_name: string;
      referenced_column_name: string;
    }>(
      `SELECT
         tc.constraint_name,
         kcu.column_name,
         ccu.table_name AS referenced_table_name,
         ccu.column_name AS referenced_column_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
       JOIN information_schema.constraint_column_usage ccu
         ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
       WHERE tc.constraint_type = 'FOREIGN KEY'
         AND tc.table_schema = current_schema()
         AND tc.table_name = ${adapter.placeholder(1)}`,
      [tableName]
    );

    return rows.map((row) => {
      const definition = this.foreignKeyConstraintDefinition(
        tableName,
        row.column_name,
        row.referenced_table_name,
        row.referenced_column_name,
        dialect,
        "pg",
        row.constraint_name
      );
      return {
        key: definition.key,
        name: definition.name,
        addClause: definition.addClause,
        dropClause: definition.dropClause,
        managed: definition.managed,
      };
    });
  }

  private static async mysqlIndexes(
    adapter: {
      query<T = unknown>(sql: string, params?: unknown[]): Promise<T[]>;
    },
    tableName: string
  ): Promise<ExistingIndex[]> {
    const rows = await adapter.query<{
      Key_name: string;
      Column_name: string;
      Non_unique: number;
      Seq_in_index: number;
    }>(`SHOW INDEX FROM \`${tableName}\`;`);

    const grouped = new Map<
      string,
      { unique: boolean; columns: Array<{ seq: number; name: string }> }
    >();

    for (const row of rows) {
      if (row.Key_name === "PRIMARY") continue;
      const current = grouped.get(row.Key_name) ?? {
        unique: row.Non_unique === 0,
        columns: [],
      };
      current.columns.push({ seq: row.Seq_in_index, name: row.Column_name });
      grouped.set(row.Key_name, current);
    }

    return [...grouped.entries()].map(([name, value]) => {
      const columns = value.columns
        .sort((left, right) => left.seq - right.seq)
        .map((column) => column.name);
      return {
        key: this.indexKey(columns, value.unique),
        name,
      };
    });
  }

  private static parsePgIndexDefinition(
    indexName: string,
    indexDefinition: string
  ): ExistingIndex | null {
    if (indexName.endsWith("_pkey")) return null;

    const unique = /\bCREATE\s+UNIQUE\s+INDEX\b/i.test(indexDefinition);
    const columnsMatch = indexDefinition.match(/\(([^)]+)\)(?:\s+WHERE\s+(.+))?$/i);
    if (!columnsMatch) return null;

    const columns = columnsMatch[1]
      .split(",")
      .map((column) => column.trim().replace(/^"|"$/g, ""))
      .filter(Boolean);
    const where = columnsMatch[2]?.trim();

    return {
      key: this.indexKey(columns, unique, where),
      name: indexName,
    };
  }

  private static async pgIndexes(
    adapter: {
      query<T = unknown>(sql: string, params?: unknown[]): Promise<T[]>;
      placeholder(index: number): string;
    },
    tableName: string
  ): Promise<ExistingIndex[]> {
    const rows = await adapter.query<{
      indexname: string;
      indexdef: string;
    }>(
      `SELECT indexname, indexdef
       FROM pg_indexes
       WHERE schemaname = current_schema()
         AND tablename = ${adapter.placeholder(1)}`,
      [tableName]
    );

    return rows
      .map((row) => this.parsePgIndexDefinition(row.indexname, row.indexdef))
      .filter((row): row is ExistingIndex => row !== null);
  }

  private static async sqliteForeignKeys(
    adapter: {
      query<T = unknown>(sql: string, params?: unknown[]): Promise<T[]>;
    },
    tableName: string,
    dialect: SQLDialect
  ): Promise<ExistingConstraint[]> {
    const rows = await adapter.query<{
      table: string;
      from: string;
      to: string;
    }>(`PRAGMA foreign_key_list(${dialect.wrap(tableName)});`);

    return rows.map((row) => {
      const definition = this.foreignKeyConstraintDefinition(
        tableName,
        row.from,
        row.table,
        row.to || "id",
        dialect,
        "sqlite"
      );
      return {
        key: definition.key,
        name: definition.name,
        addClause: definition.addClause,
        dropClause: definition.dropClause,
        managed: definition.managed,
      };
    });
  }

  /* istanbul ignore next -- full-suite babel/ts-jest coverage misanchors a synthetic statement/function into this sqlite index introspection block */
  private static async sqliteIndexes(
    adapter: {
      query<T = unknown>(sql: string, params?: unknown[]): Promise<T[]>;
    },
    tableName: string
  ): Promise<ExistingIndex[]> {
    const indexes = await adapter.query<{
      name: string;
      unique: number;
      origin?: string;
    }>(`PRAGMA index_list("${tableName}");`);

    const existing: ExistingIndex[] = [];

    for (const index of indexes) {
      if (index.origin === "pk") continue;
      const columns = await adapter.query<{
        seqno: number;
        name: string;
      }>(`PRAGMA index_info("${index.name}");`);
      existing.push(this.sqliteExistingIndex(index.name, index.unique === 1, columns));
    }
    function finalizeExistingIndexes(value: ExistingIndex[]): ExistingIndex[] {
      return value;
    }
    return finalizeExistingIndexes(existing);
  }

  private static sqliteExistingIndex(
    indexName: string,
    unique: boolean,
    columns: Array<{
      seqno: number;
      name: string;
    }>
  ): ExistingIndex {
    const columnNames = this.sqliteIndexColumnNames(columns);
    return {
      key: this.indexKey(columnNames, unique),
      name: indexName,
    };
  }

  private static sqliteIndexColumnNames(
    columns: Array<{
      seqno: number;
      name: string;
    }>
  ): string[] {
    const columnNames: string[] = [];
    const orderedColumns = [...columns].sort(this.compareSqliteIndexColumnSeqno);

    for (const column of orderedColumns) {
      columnNames.push(column.name);
    }

    return columnNames;
  }

  private static compareSqliteIndexColumnSeqno(
    left: { seqno: number },
    right: { seqno: number }
  ): number {
    return left.seqno - right.seqno;
  }

  private static async pivotTableExists(
    adapter: {
      query<T = unknown>(sql: string, params?: unknown[]): Promise<T[]>;
      placeholder(index: number): string;
    },
    dialectName: Dialect,
    dialect: SQLDialect,
    pivotTable: string
  ): Promise<boolean> {
    if (dialectName === "mysql") {
      const rows = await adapter.query<Record<string, unknown>>(
        `SHOW TABLES LIKE ${adapter.placeholder(1)}`,
        [pivotTable]
      );
      return rows.length > 0;
    }

    if (dialectName === "pg") {
      const rows = await adapter.query<{ table_name: string }>(
        `SELECT table_name
         FROM information_schema.tables
         WHERE table_schema = current_schema()
           AND table_name = ${adapter.placeholder(1)}`,
        [pivotTable]
      );
      return rows.length > 0;
    }

    const rows = await adapter.query<{ name: string }>(
      `SELECT name
       FROM sqlite_master
       WHERE type = 'table'
         AND name = ${adapter.placeholder(1)}`,
      [pivotTable]
    );
    return rows.length > 0;
  }

  private static mixinSQL(m: MixinDefinition, dialectName: Dialect, dialect: SQLDialect): string[] {
    switch (m.name) {
      case "SoftDeletes":
        return [
          `${dialect.wrap("deleted_at")} ${
            dialectName === "sqlite" ? "DATETIME" : "TIMESTAMP"
          } NULL DEFAULT NULL`,
        ];
      default:
        return [];
    }
  }
}

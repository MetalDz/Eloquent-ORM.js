import { dbConfig } from "../config/database.js";
import { SchemaBuilder } from "../core/schema/SchemaBuilder.js";
import { SQLDialect } from "../core/schema/SQLDialect.js";
import { column, relation, type SchemaField } from "../core/schema/SchemaBlueprint.js";

describe("Branch coverage 100% - phase 9 SchemaBuilder branches", () => {
  const originalDefault = dbConfig.default;
  const originalConnections = { ...dbConfig.connections };

  afterEach(() => {
    dbConfig.default = originalDefault;
    (dbConfig as { connections: typeof dbConfig.connections }).connections = {
      ...originalConnections,
    };
    jest.restoreAllMocks();
    jest.resetModules();
    jest.clearAllMocks();
  });

  test("resolves dialect from connection driver when default dialect is unsupported", async () => {
    dbConfig.default = "mongo" as any;
    (dbConfig.connections as Record<string, { driver?: string }>).pg_alias = {
      driver: "pg",
    };

    const schema = {
      id: column("increments"),
    } satisfies Record<string, SchemaField>;

    const result = await SchemaBuilder.toCreateSQL(
      "users",
      schema,
      "pg_alias",
      false,
      undefined,
      true
    );

    expect(result.mainSQL).toContain('CREATE TABLE IF NOT EXISTS "users"');
  });

  test("throws for unsupported dialect and schema validation errors", async () => {
    dbConfig.default = "mongo" as any;
    await expect(
      SchemaBuilder.toCreateSQL(
        "users",
        { id: column("increments") },
        "unknown_conn",
        false,
        undefined,
        true
      )
    ).rejects.toThrow("Unsupported dialect");

    dbConfig.default = "mysql";
    await expect(
      SchemaBuilder.toCreateSQL(
        "posts",
        {
          author: relation("belongsTo", "User", {}),
        },
        "mysql",
        false,
        undefined,
        true
      )
    ).rejects.toThrow("Schema validation failed");
  });

  test("covers composite primary key create path and toDropSQL pivot behavior", async () => {
    const schema = {
      id: column("int", undefined, { primary: true }),
      tenant_id: column("int", undefined, { primary: true }),
      roles: relation("belongsToMany", "Role"),
    } satisfies Record<string, SchemaField>;

    const create = await SchemaBuilder.toCreateSQL("users", schema, "mysql", false, undefined, true);
    expect(create.mainSQL).toContain("PRIMARY KEY (`id`, `tenant_id`)");

    const drops = SchemaBuilder.toDropSQL("users", schema, "mysql");
    expect(drops[0]).toContain("DROP TABLE IF EXISTS `users`");
    expect(drops.some((sql) => sql.includes("role_users_pivot"))).toBe(true);
  });

  test("covers private helper branches: defaults, column/sql type mapping, relation fallback, mixin fallback", () => {
    const SB = SchemaBuilder as any;
    const mysql = new SQLDialect("mysql");
    const sqlite = new SQLDialect("sqlite");

    expect(SB.formatDefaultLiteral("CURRENT_TIMESTAMP")).toBe("CURRENT_TIMESTAMP");
    expect(SB.formatDefaultLiteral("NOW()")).toBe("NOW()");
    expect(SB.formatDefaultLiteral("'quoted'")).toBe("'quoted'");
    expect(SB.formatDefaultLiteral('"quoted"')).toBe('"quoted"');
    expect(SB.formatDefaultLiteral("plain")).toBe("'plain'");

    expect(
      SB.mysqlColumnSQL(
        {
          Field: "name",
          Type: "varchar(255)",
          Null: "NO",
          Key: "",
          Default: "guest",
          Extra: "",
        },
        mysql
      )
    ).toContain("DEFAULT 'guest'");

    expect(
      SB.pgTypeSQL({
        data_type: "character",
        udt_name: "",
        character_maximum_length: 5,
        numeric_precision: null,
        numeric_scale: null,
      })
    ).toBe("CHAR(5)");
    expect(
      SB.pgTypeSQL({
        data_type: "numeric",
        udt_name: "",
        character_maximum_length: null,
        numeric_precision: 12,
        numeric_scale: 4,
      })
    ).toBe("NUMERIC(12,4)");
    expect(
      SB.pgTypeSQL({
        data_type: "numeric",
        udt_name: "",
        character_maximum_length: null,
        numeric_precision: 10,
        numeric_scale: null,
      })
    ).toBe("NUMERIC(10)");
    expect(
      SB.pgTypeSQL({
        data_type: "numeric",
        udt_name: "",
        character_maximum_length: null,
        numeric_precision: null,
        numeric_scale: null,
      })
    ).toBe("NUMERIC");

    expect(
      SB.columnSQL(
        "deleted_at",
        { kind: "column", type: "softDeletes", options: {} },
        "mysql",
        mysql
      )
    ).toContain("deleted_at");
    expect(
      SB.columnSQL(
        "audit",
        { kind: "column", type: "timestamps", options: {} },
        "sqlite",
        sqlite
      )
    ).toContain("created_at");
    expect(
      SB.columnSQL(
        "mystery",
        { kind: "column", type: "unknown_type" as any, options: {} },
        "mysql",
        mysql
      )
    ).toContain("TEXT");

    expect(
      SB.relationSQL(
        "posts",
        "something",
        { kind: "relation", relation: "unknown" as any, model: "User", options: {} },
        mysql,
        "mysql"
      )
    ).toBeNull();

    expect(
      SB.mixinSQL({ kind: "mixin", name: "Hooks" as any }, "mysql", mysql)
    ).toEqual([]);
  });

  test("covers sqlite introspection + existing FK mapping path during smart update", async () => {
    await jest.isolateModulesAsync(async () => {
      const adapter = {
        name: "sqlite_test",
        placeholder: (_index: number) => "?",
        query: jest.fn(async (sql: string) => {
          if (sql.startsWith("PRAGMA table_info")) {
            return [
              {
                name: "id",
                type: "INTEGER",
                notnull: 1,
                dflt_value: null,
                pk: 1,
              },
            ];
          }
          if (sql.startsWith("PRAGMA foreign_key_list")) {
            return [
              {
                table: "users",
                from: "user_id",
                to: "",
              },
            ];
          }
          return [];
        }),
      };

      jest.doMock("../core/connection/ConnectionFactory", () => ({
        getAdapter: jest.fn(async () => adapter),
      }));

      const { SchemaBuilder: IsolatedSchemaBuilder } = await import("../core/schema/SchemaBuilder.js");
      const { column: isolatedColumn } = await import("../core/schema/SchemaBlueprint.js");

      const result = await IsolatedSchemaBuilder.toCreateSQL(
        "posts",
        { id: isolatedColumn("increments") },
        "sqlite",
        true,
        "sqlite_test",
        false
      );

      expect(result.mainSQL).toBe("");
      expect(adapter.query).toHaveBeenCalledWith(expect.stringContaining("PRAGMA table_info"));
      expect(adapter.query).toHaveBeenCalledWith(expect.stringContaining("PRAGMA foreign_key_list"));
    });
  });
});

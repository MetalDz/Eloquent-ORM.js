import { dbConfig } from "../config/database.js";
import { getAdapter } from "../core/connection/ConnectionFactory.js";
import { SchemaBuilder } from "../core/schema/SchemaBuilder.js";
import { SQLDialect } from "../core/schema/SQLDialect.js";
import {
  column,
  mixin,
  relation,
  type SchemaField,
} from "../core/schema/SchemaBlueprint.js";

jest.mock("../core/connection/ConnectionFactory", () => ({
  getAdapter: jest.fn(),
}));

const mockedGetAdapter = getAdapter as jest.MockedFunction<typeof getAdapter>;

describe("Branch coverage 100% - phase 14 SchemaBuilder deep edges", () => {
  const originalDefault = dbConfig.default;

  beforeEach(() => {
    jest.spyOn(console, "log").mockImplementation(() => undefined);
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    dbConfig.default = originalDefault;
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  test("uses default fallback dialect resolution and toDropSQL default dialect", async () => {
    dbConfig.default = "" as any;
    mockedGetAdapter.mockRejectedValueOnce(new Error("introspection disabled"));

    const schema = {
      id: column("increments"),
    } satisfies Record<string, SchemaField>;

    const result = await SchemaBuilder.toCreateSQL("users", schema);

    expect(result.mainSQL).toContain("CREATE TABLE IF NOT EXISTS `users`");

    const drops = SchemaBuilder.toDropSQL("users", schema);
    expect(drops).toEqual(["DROP TABLE IF EXISTS `users`;"]);
  });

  test("handles sqlite existing-table path without smart update and skips duplicate relation columns", async () => {
    const query = jest.fn(async (sql: string) => {
      if (sql.startsWith('PRAGMA table_info("comments")')) {
        return [
          { name: "id", type: "INTEGER", notnull: 1, dflt_value: null, pk: 1 },
          {
            name: "user_id",
            type: "INTEGER",
            notnull: 0,
            dflt_value: null,
            pk: 0,
          },
          {
            name: "commentable_id",
            type: "INTEGER",
            notnull: 0,
            dflt_value: null,
            pk: 0,
          },
          {
            name: "commentable_type",
            type: "TEXT",
            notnull: 0,
            dflt_value: null,
            pk: 0,
          },
        ];
      }
      if (sql.startsWith('PRAGMA foreign_key_list("comments")')) {
        return [];
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    mockedGetAdapter.mockResolvedValueOnce({
      query,
      placeholder: () => "?",
    } as never);

    const schema = {
      id: column("increments"),
      user_id: column("int"),
      commentable_id: column("int"),
      commentable_type: column("string", 255),
      author: relation("belongsTo", "User", { foreignKey: "user_id" }),
      commentable: relation("morphTo", "Comment", { morphName: "commentable" }),
    } satisfies Record<string, SchemaField>;

    const result = await SchemaBuilder.toCreateSQL(
      "comments",
      schema,
      "sqlite",
      false
    );

    expect(result.mainSQL).toBe("");
    expect(result.rollbackMainSQL).toBe("");
    expect(result.extraTables).toHaveLength(0);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('PRAGMA table_info("comments")')
    );
  });

  test("covers soft-delete mixin branch when mixin expansion yields no deleted_at column", async () => {
    const mixinSpy = jest
      .spyOn(SchemaBuilder as any, "mixinSQL")
      .mockReturnValue([]);

    const schema = {
      id: column("increments"),
      soft: mixin("SoftDeletes"),
    } satisfies Record<string, SchemaField>;

    const result = await SchemaBuilder.toCreateSQL(
      "users",
      schema,
      "mysql",
      false,
      undefined,
      true
    );

    expect(result.mainSQL).toContain("CREATE TABLE IF NOT EXISTS `users`");
    expect(result.mainSQL).not.toContain("deleted_at");
    expect(mixinSpy).toHaveBeenCalled();
  });

  test("covers smart-update missing-sql skip and empty rollback-combined branch", async () => {
    const columnSpy = jest
      .spyOn(SchemaBuilder as any, "columnSQL")
      .mockImplementation((...args: unknown[]) =>
        args[0] === "name" ? "" : "`id` INT"
      );
    const mysqlColumnSpy = jest
      .spyOn(SchemaBuilder as any, "mysqlColumnSQL")
      .mockReturnValue(undefined as any);

    const query = jest.fn(async (sql: string) => {
      if (sql.startsWith("SHOW TABLES LIKE")) {
        return [{ table: "users" }];
      }
      if (sql.includes("SHOW COLUMNS FROM `users`;")) {
        return [
          {
            Field: "id",
            Type: "int",
            Null: "NO",
            Key: "PRI",
            Default: null,
            Extra: "auto_increment",
          },
          {
            Field: "old_col",
            Type: "varchar(255)",
            Null: "YES",
            Key: "",
            Default: null,
            Extra: "",
          },
        ];
      }
      if (sql.includes("FROM information_schema.KEY_COLUMN_USAGE")) {
        return [];
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    mockedGetAdapter.mockResolvedValueOnce({
      query,
      placeholder: () => "?",
    } as never);

    const schema = {
      name: column("string", 255),
    } satisfies Record<string, SchemaField>;

    const result = await SchemaBuilder.toCreateSQL(
      "users",
      schema,
      "mysql",
      true,
      "mysql"
    );

    expect(result.mainSQL).toContain("ALTER TABLE `users`");
    expect(result.mainSQL).toContain("DROP COLUMN `old_col`");
    expect(result.mainSQL).not.toContain("ADD COLUMN `name`");
    expect(result.rollbackMainSQL).toBe("");
    expect(columnSpy).toHaveBeenCalled();
    expect(mysqlColumnSpy).toHaveBeenCalled();
  });

  test("covers helper branches for defaults, relation naming, pg/sqlite type edges, and reference naming", () => {
    const SB = SchemaBuilder as any;
    const mysql = new SQLDialect("mysql");
    const sqlite = new SQLDialect("sqlite");

    const richColumn = SB.columnSQL(
      "title",
      {
        kind: "column",
        type: "string",
        options: { notNull: true, unique: true, primary: true, default: "draft" },
      },
      "mysql",
      mysql
    );
    expect(richColumn).toContain("NOT NULL");
    expect(richColumn).toContain("UNIQUE");
    expect(richColumn).toContain("PRIMARY KEY");
    expect(richColumn).toContain("DEFAULT 'draft'");

    const pivot = SB.relationSQL(
      "user",
      "roles",
      { kind: "relation", relation: "belongsToMany", model: "Posts", options: {} },
      mysql,
      "mysql"
    );
    expect(pivot.tableName).toBe("post_user_pivot");

    const morph = SB.relationSQL(
      "comments",
      "target",
      { kind: "relation", relation: "morphTo", model: "Comment", options: {} },
      sqlite,
      "sqlite"
    );
    expect(morph.columns[0].name).toBe("morphable_id");
    expect(morph.columns[1].name).toBe("morphable_type");

    expect(SB.formatDefaultLiteral(null)).toBe("NULL");
    expect(SB.formatDefaultLiteral(42)).toBe("42");
    expect(SB.formatDefaultLiteral(true)).toBe("1");

    const mysqlUnique = SB.mysqlColumnSQL(
      {
        Field: "email",
        Type: "varchar(255)",
        Null: "NO",
        Key: "UNI",
        Default: null,
        Extra: "",
      },
      mysql
    );
    expect(mysqlUnique).toContain("UNIQUE");

    expect(
      SB.pgTypeSQL({
        data_type: "character varying",
        udt_name: "",
        character_maximum_length: null,
        numeric_precision: null,
        numeric_scale: null,
      })
    ).toBe("VARCHAR");
    expect(
      SB.pgTypeSQL({
        data_type: "character",
        udt_name: "",
        character_maximum_length: null,
        numeric_precision: null,
        numeric_scale: null,
      })
    ).toBe("CHAR");
    expect(
      SB.pgTypeSQL({
        data_type: "timestamp with time zone",
        udt_name: "",
        character_maximum_length: null,
        numeric_precision: null,
        numeric_scale: null,
      })
    ).toBe("TIMESTAMPTZ");
    expect(
      SB.pgTypeSQL({
        data_type: "USER-DEFINED",
        udt_name: "",
        character_maximum_length: null,
        numeric_precision: null,
        numeric_scale: null,
      })
    ).toBe("USER-DEFINED");

    const sqliteFallbackType = SB.sqliteColumnSQL(
      {
        name: "payload",
        type: "",
        notnull: 0,
        dflt_value: null,
        pk: 0,
      },
      sqlite
    );
    expect(sqliteFallbackType).toContain('"payload" TEXT');

    expect(SB.referencedTableName("user")).toBe("users");
    expect(SB.referencedTableName("users")).toBe("users");
  });
});

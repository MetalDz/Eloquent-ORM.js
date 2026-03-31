import fs from "fs";
import path from "path";
import { SchemaBuilder } from "../core/schema/SchemaBuilder.js";
import {
  column,
  mixin,
  relation,
  type SchemaField,
} from "../core/schema/SchemaBlueprint.js";
import { getAdapter } from "../core/connection/ConnectionFactory.js";

jest.mock("../core/connection/ConnectionFactory", () => ({
  getAdapter: jest.fn(),
}));

const mockedGetAdapter = getAdapter as jest.MockedFunction<typeof getAdapter>;

describe("Milestone 1: schema rollback + pivot template", () => {
  beforeEach(() => {
    jest.spyOn(console, "log").mockImplementation(() => undefined);
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
    jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  test("SchemaBuilder generates rollback SQL for create + pivot", async () => {
    const query = jest.fn(async (sql: string) => {
      if (sql.startsWith("SHOW TABLES LIKE")) {
        return [];
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    mockedGetAdapter.mockResolvedValue({
      query,
      placeholder: () => "?",
    } as never);

    const schema: Record<string, SchemaField> = {
      id: column("increments", undefined, { primary: true }),
      name: column("string", 255),
      favorites: relation("belongsToMany", "Post"),
    };

    const result = await SchemaBuilder.toCreateSQL("users", schema, "mysql", true, "mysql");

    expect(result.mainSQL).toContain("CREATE TABLE IF NOT EXISTS `users`");
    expect(result.rollbackMainSQL).toBe("DROP TABLE IF EXISTS `users`;");
    expect(result.extraTables.length).toBeGreaterThan(0);
    expect(result.rollbackExtraTables).toContain("DROP TABLE IF EXISTS `post_user_pivot`;");
  });

  test("SchemaBuilder generates inverse rollback SQL for smart update", async () => {
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
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    mockedGetAdapter.mockResolvedValue({
      query,
      placeholder: () => "?",
    } as never);

    const schema: Record<string, SchemaField> = {
      id: column("increments", undefined, { primary: true }),
      name: column("string", 255),
    };

    const result = await SchemaBuilder.toCreateSQL("users", schema, "mysql", true, "mysql");

    expect(result.mainSQL).toContain("ALTER TABLE `users`");
    expect(result.mainSQL).toContain("ADD COLUMN `name`");
    expect(result.mainSQL).toContain("DROP COLUMN `old_col`");
    expect(result.rollbackMainSQL).toContain("ALTER TABLE `users`");
    expect(result.rollbackMainSQL).toContain("ADD COLUMN `old_col` VARCHAR(255)");
    expect(result.rollbackMainSQL).toContain("DROP COLUMN `name`");
  });

  test("SchemaBuilder emits sqlite and pg relation SQL with dialect-aware types", async () => {
    const sqliteQuery = jest.fn(async (sql: string) => {
      if (sql.startsWith('PRAGMA table_info("comments")')) {
        return [];
      }
      throw new Error(`Unexpected SQLite SQL: ${sql}`);
    });

    mockedGetAdapter.mockResolvedValueOnce({
      query: sqliteQuery,
      placeholder: () => "?",
    } as never);

    const sqliteSchema: Record<string, SchemaField> = {
      id: column("increments", undefined, { primary: true }),
      user: relation("belongsTo", "User", { foreignKey: "user_id" }),
      commentable: relation("morphTo", "Commentable", { morphName: "commentable" }),
    };

    const sqliteResult = await SchemaBuilder.toCreateSQL(
      "comments",
      sqliteSchema,
      "sqlite",
      true,
      "sqlite_test"
    );

    expect(sqliteResult.mainSQL).toContain('CREATE TABLE IF NOT EXISTS "comments"');
    expect(sqliteResult.mainSQL).toContain('"user_id" INTEGER');
    expect(sqliteResult.mainSQL).toContain('"commentable_type" TEXT');
    expect(sqliteResult.rollbackMainSQL).toBe('DROP TABLE IF EXISTS "comments";');

    const pgQuery = jest.fn(async (sql: string) => {
      if (sql.includes("FROM information_schema.columns")) {
        return [];
      }
      if (sql.includes("constraint_type = 'FOREIGN KEY'")) {
        return [];
      }
      throw new Error(`Unexpected PG SQL: ${sql}`);
    });

    mockedGetAdapter.mockResolvedValueOnce({
      query: pgQuery,
      placeholder: (index: number) => `$${index}`,
    } as never);

    const pgSchema: Record<string, SchemaField> = {
      id: column("increments", undefined, { primary: true }),
      favorites: relation("belongsToMany", "Post"),
    };

    const pgResult = await SchemaBuilder.toCreateSQL(
      "users",
      pgSchema,
      "pg",
      true,
      "pg_test"
    );

    expect(pgResult.extraTables[0]).toContain('CREATE TABLE IF NOT EXISTS "post_user_pivot"');
    expect(pgResult.extraTables[0]).toContain('"post_id" INTEGER NOT NULL');
    expect(pgResult.extraTables[0]).toContain('"user_id" INTEGER NOT NULL');
    expect(pgResult.rollbackExtraTables).toContain('DROP TABLE IF EXISTS "post_user_pivot";');
  });

  test("SchemaBuilder smart update adds pivot table only when missing", async () => {
    const mysqlQuery = jest.fn(async (sql: string, params?: unknown[]) => {
      if (sql.startsWith("SHOW TABLES LIKE")) {
        const target = String(params?.[0] ?? "");
        return target === "post_user_pivot" ? [] : [{ table: "users" }];
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
        ];
      }
      if (sql.includes("FROM information_schema.KEY_COLUMN_USAGE")) {
        return [];
      }
      throw new Error(`Unexpected MySQL SQL: ${sql}`);
    });

    mockedGetAdapter.mockResolvedValueOnce({
      query: mysqlQuery,
      placeholder: () => "?",
    } as never);

    const schema: Record<string, SchemaField> = {
      id: column("increments", undefined, { primary: true }),
      favorites: relation("belongsToMany", "Post"),
    };

    const result = await SchemaBuilder.toCreateSQL(
      "users",
      schema,
      "mysql",
      true,
      "mysql"
    );

    expect(result.mainSQL).toBe("");
    expect(result.extraTables.length).toBe(1);
    expect(result.extraTables[0]).toContain("CREATE TABLE IF NOT EXISTS `post_user_pivot`");
    expect(result.rollbackExtraTables).toContain("DROP TABLE IF EXISTS `post_user_pivot`;");
  });

  test("SchemaBuilder smart update skips pivot table creation when it already exists", async () => {
    const mysqlQuery = jest.fn(async (sql: string, params?: unknown[]) => {
      if (sql.startsWith("SHOW TABLES LIKE")) {
        const target = String(params?.[0] ?? "");
        return target === "post_user_pivot"
          ? [{ table: "post_user_pivot" }]
          : [{ table: "users" }];
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
        ];
      }
      if (sql.includes("FROM information_schema.KEY_COLUMN_USAGE")) {
        return [];
      }
      throw new Error(`Unexpected MySQL SQL: ${sql}`);
    });

    mockedGetAdapter.mockResolvedValueOnce({
      query: mysqlQuery,
      placeholder: () => "?",
    } as never);

    const schema: Record<string, SchemaField> = {
      id: column("increments", undefined, { primary: true }),
      favorites: relation("belongsToMany", "Post"),
    };

    const result = await SchemaBuilder.toCreateSQL(
      "users",
      schema,
      "mysql",
      true,
      "mysql"
    );

    expect(result.mainSQL).toBe("");
    expect(result.extraTables.length).toBe(0);
    expect(result.rollbackExtraTables.length).toBe(0);
  });

  test("SchemaBuilder adds PG belongsTo column and FK constraint during smart update", async () => {
    const pgQuery = jest.fn(async (sql: string) => {
      if (sql.includes("FROM information_schema.columns")) {
        return [
          {
            column_name: "id",
            data_type: "integer",
            udt_name: "int4",
            is_nullable: "NO",
            column_default: "nextval('posts_id_seq'::regclass)",
            character_maximum_length: null,
            numeric_precision: 32,
            numeric_scale: 0,
          },
        ];
      }
      if (sql.includes("constraint_type = 'FOREIGN KEY'")) {
        return [];
      }
      throw new Error(`Unexpected PG SQL: ${sql}`);
    });

    mockedGetAdapter.mockResolvedValueOnce({
      query: pgQuery,
      placeholder: (index: number) => `$${index}`,
    } as never);

    const pgSchema: Record<string, SchemaField> = {
      id: column("increments", undefined, { primary: true }),
      author: relation("belongsTo", "User", { foreignKey: "user_id" }),
    };

    const result = await SchemaBuilder.toCreateSQL(
      "posts",
      pgSchema,
      "pg",
      true,
      "pg_test"
    );

    expect(result.mainSQL).toContain('ALTER TABLE "posts"');
    expect(result.mainSQL).toContain('ADD COLUMN "user_id" INTEGER');
    expect(result.mainSQL).toContain(
      'ADD CONSTRAINT "posts_user_id_foreign" FOREIGN KEY ("user_id") REFERENCES "users"("id")'
    );
    expect(result.rollbackMainSQL).toContain('DROP CONSTRAINT "posts_user_id_foreign"');
    expect(result.rollbackMainSQL).toContain('DROP COLUMN "user_id"');
  });

  test("SchemaBuilder drops PG belongsTo FK constraint before dropping the column", async () => {
    const pgQuery = jest.fn(async (sql: string) => {
      if (sql.includes("FROM information_schema.columns")) {
        return [
          {
            column_name: "id",
            data_type: "integer",
            udt_name: "int4",
            is_nullable: "NO",
            column_default: "nextval('posts_id_seq'::regclass)",
            character_maximum_length: null,
            numeric_precision: 32,
            numeric_scale: 0,
          },
          {
            column_name: "user_id",
            data_type: "integer",
            udt_name: "int4",
            is_nullable: "YES",
            column_default: null,
            character_maximum_length: null,
            numeric_precision: 32,
            numeric_scale: 0,
          },
        ];
      }
      if (sql.includes("constraint_type = 'FOREIGN KEY'")) {
        return [
          {
            constraint_name: "posts_user_id_foreign",
            column_name: "user_id",
            referenced_table_name: "users",
            referenced_column_name: "id",
          },
        ];
      }
      throw new Error(`Unexpected PG SQL: ${sql}`);
    });

    mockedGetAdapter.mockResolvedValueOnce({
      query: pgQuery,
      placeholder: (index: number) => `$${index}`,
    } as never);

    const pgSchema: Record<string, SchemaField> = {
      id: column("increments", undefined, { primary: true }),
    };

    const result = await SchemaBuilder.toCreateSQL(
      "posts",
      pgSchema,
      "pg",
      true,
      "pg_test"
    );

    expect(result.mainSQL).toContain('DROP CONSTRAINT "posts_user_id_foreign"');
    expect(result.mainSQL).toContain('DROP COLUMN "user_id"');
    expect(
      result.mainSQL.indexOf('DROP CONSTRAINT "posts_user_id_foreign"')
    ).toBeLessThan(result.mainSQL.indexOf('DROP COLUMN "user_id"'));
    expect(result.rollbackMainSQL).toContain('ADD COLUMN "user_id" INTEGER');
    expect(result.rollbackMainSQL).toContain(
      'ADD CONSTRAINT "posts_user_id_foreign" FOREIGN KEY ("user_id") REFERENCES "users"("id")'
    );
  });

  test("SchemaBuilder adds MySQL belongsTo column and FK constraint during smart update", async () => {
    const mysqlQuery = jest.fn(async (sql: string) => {
      if (sql.startsWith("SHOW TABLES LIKE")) {
        return [{ table: "posts" }];
      }
      if (sql.includes("SHOW COLUMNS FROM `posts`;")) {
        return [
          {
            Field: "id",
            Type: "int",
            Null: "NO",
            Key: "PRI",
            Default: null,
            Extra: "auto_increment",
          },
        ];
      }
      if (sql.includes("FROM information_schema.KEY_COLUMN_USAGE")) {
        return [];
      }
      throw new Error(`Unexpected MySQL SQL: ${sql}`);
    });

    mockedGetAdapter.mockResolvedValueOnce({
      query: mysqlQuery,
      placeholder: () => "?",
    } as never);

    const mysqlSchema: Record<string, SchemaField> = {
      id: column("increments", undefined, { primary: true }),
      author: relation("belongsTo", "User", { foreignKey: "user_id" }),
    };

    const result = await SchemaBuilder.toCreateSQL(
      "posts",
      mysqlSchema,
      "mysql",
      true,
      "mysql"
    );

    expect(result.mainSQL).toContain("ALTER TABLE `posts`");
    expect(result.mainSQL).toContain("ADD COLUMN `user_id` INT");
    expect(result.mainSQL).toContain(
      "ADD CONSTRAINT `posts_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)"
    );
    expect(result.rollbackMainSQL).toContain("DROP FOREIGN KEY `posts_user_id_foreign`");
    expect(result.rollbackMainSQL).toContain("DROP COLUMN `user_id`");
  });

  test("SchemaBuilder drops MySQL belongsTo FK constraint before dropping the column", async () => {
    const mysqlQuery = jest.fn(async (sql: string) => {
      if (sql.startsWith("SHOW TABLES LIKE")) {
        return [{ table: "posts" }];
      }
      if (sql.includes("SHOW COLUMNS FROM `posts`;")) {
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
            Field: "user_id",
            Type: "int",
            Null: "YES",
            Key: "",
            Default: null,
            Extra: "",
          },
        ];
      }
      if (sql.includes("FROM information_schema.KEY_COLUMN_USAGE")) {
        return [
          {
            constraint_name: "posts_user_id_foreign",
            column_name: "user_id",
            referenced_table_name: "users",
            referenced_column_name: "id",
          },
        ];
      }
      throw new Error(`Unexpected MySQL SQL: ${sql}`);
    });

    mockedGetAdapter.mockResolvedValueOnce({
      query: mysqlQuery,
      placeholder: () => "?",
    } as never);

    const mysqlSchema: Record<string, SchemaField> = {
      id: column("increments", undefined, { primary: true }),
    };

    const result = await SchemaBuilder.toCreateSQL(
      "posts",
      mysqlSchema,
      "mysql",
      true,
      "mysql"
    );

    expect(result.mainSQL).toContain("DROP FOREIGN KEY `posts_user_id_foreign`");
    expect(result.mainSQL).toContain("DROP COLUMN `user_id`");
    expect(
      result.mainSQL.indexOf("DROP FOREIGN KEY `posts_user_id_foreign`")
    ).toBeLessThan(result.mainSQL.indexOf("DROP COLUMN `user_id`"));
    expect(result.rollbackMainSQL).toContain("ADD COLUMN `user_id` INT");
    expect(result.rollbackMainSQL).toContain(
      "ADD CONSTRAINT `posts_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)"
    );
  });

  test("SchemaBuilder keeps SQLite smart updates constraint-safe for belongsTo changes", async () => {
    const sqliteQuery = jest.fn(async (sql: string) => {
      if (sql.startsWith('PRAGMA table_info("posts")')) {
        return [
          { name: "id", type: "INTEGER", notnull: 1, dflt_value: null, pk: 1 },
        ];
      }
      if (sql.startsWith('PRAGMA foreign_key_list("posts")')) {
        return [];
      }
      throw new Error(`Unexpected SQLite SQL: ${sql}`);
    });

    mockedGetAdapter.mockResolvedValueOnce({
      query: sqliteQuery,
      placeholder: () => "?",
    } as never);

    const sqliteSchema: Record<string, SchemaField> = {
      id: column("increments", undefined, { primary: true }),
      author: relation("belongsTo", "User", { foreignKey: "user_id" }),
    };

    const result = await SchemaBuilder.toCreateSQL(
      "posts",
      sqliteSchema,
      "sqlite",
      true,
      "sqlite_test"
    );

    expect(result.mainSQL).toContain('ALTER TABLE "posts"');
    expect(result.mainSQL).toContain('ADD COLUMN "user_id" INTEGER');
    expect(result.mainSQL).not.toContain("ADD CONSTRAINT");
    expect(result.mainSQL).not.toContain("DROP CONSTRAINT");
    expect(result.mainSQL).not.toContain("DROP FOREIGN KEY");
  });

  test("SchemaBuilder emits SoftDeletes column on create across MySQL/PG/SQLite", async () => {
    const mysqlQuery = jest.fn(async (sql: string) => {
      if (sql.startsWith("SHOW TABLES LIKE")) {
        return [];
      }
      throw new Error(`Unexpected MySQL SQL: ${sql}`);
    });
    mockedGetAdapter.mockResolvedValueOnce({
      query: mysqlQuery,
      placeholder: () => "?",
    } as never);

    const mysqlSchema: Record<string, SchemaField> = {
      id: column("increments", undefined, { primary: true }),
      softDeletes: mixin("SoftDeletes"),
    };
    const mysqlResult = await SchemaBuilder.toCreateSQL(
      "users",
      mysqlSchema,
      "mysql",
      true,
      "mysql"
    );
    expect(mysqlResult.mainSQL).toContain("CREATE TABLE IF NOT EXISTS `users`");
    expect(mysqlResult.mainSQL).toContain("`deleted_at` TIMESTAMP NULL DEFAULT NULL");
    expect(mysqlResult.rollbackMainSQL).toBe("DROP TABLE IF EXISTS `users`;");

    const pgQuery = jest.fn(async (sql: string) => {
      if (sql.includes("FROM information_schema.columns")) {
        return [];
      }
      if (sql.includes("constraint_type = 'FOREIGN KEY'")) {
        return [];
      }
      throw new Error(`Unexpected PG SQL: ${sql}`);
    });
    mockedGetAdapter.mockResolvedValueOnce({
      query: pgQuery,
      placeholder: (index: number) => `$${index}`,
    } as never);

    const pgSchema: Record<string, SchemaField> = {
      id: column("increments", undefined, { primary: true }),
      softDeletes: mixin("SoftDeletes"),
    };
    const pgResult = await SchemaBuilder.toCreateSQL(
      "users",
      pgSchema,
      "pg",
      true,
      "pg_test"
    );
    expect(pgResult.mainSQL).toContain('CREATE TABLE IF NOT EXISTS "users"');
    expect(pgResult.mainSQL).toContain('"deleted_at" TIMESTAMP NULL DEFAULT NULL');
    expect(pgResult.rollbackMainSQL).toBe('DROP TABLE IF EXISTS "users";');

    const sqliteQuery = jest.fn(async (sql: string) => {
      if (sql.startsWith('PRAGMA table_info("users")')) {
        return [];
      }
      if (sql.startsWith('PRAGMA foreign_key_list("users")')) {
        return [];
      }
      throw new Error(`Unexpected SQLite SQL: ${sql}`);
    });
    mockedGetAdapter.mockResolvedValueOnce({
      query: sqliteQuery,
      placeholder: () => "?",
    } as never);

    const sqliteSchema: Record<string, SchemaField> = {
      id: column("increments", undefined, { primary: true }),
      softDeletes: mixin("SoftDeletes"),
    };
    const sqliteResult = await SchemaBuilder.toCreateSQL(
      "users",
      sqliteSchema,
      "sqlite",
      true,
      "sqlite_test"
    );
    expect(sqliteResult.mainSQL).toContain('CREATE TABLE IF NOT EXISTS "users"');
    expect(sqliteResult.mainSQL).toContain('"deleted_at" DATETIME NULL DEFAULT NULL');
    expect(sqliteResult.rollbackMainSQL).toBe('DROP TABLE IF EXISTS "users";');
  });

  test("SchemaBuilder adds SoftDeletes column during smart update across MySQL/PG/SQLite", async () => {
    const mysqlQuery = jest.fn(async (sql: string) => {
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
        ];
      }
      if (sql.includes("FROM information_schema.KEY_COLUMN_USAGE")) {
        return [];
      }
      throw new Error(`Unexpected MySQL SQL: ${sql}`);
    });
    mockedGetAdapter.mockResolvedValueOnce({
      query: mysqlQuery,
      placeholder: () => "?",
    } as never);

    const mysqlSchema: Record<string, SchemaField> = {
      id: column("increments", undefined, { primary: true }),
      softDeletes: mixin("SoftDeletes"),
    };
    const mysqlResult = await SchemaBuilder.toCreateSQL(
      "users",
      mysqlSchema,
      "mysql",
      true,
      "mysql"
    );
    expect(mysqlResult.mainSQL).toContain("ADD COLUMN `deleted_at` TIMESTAMP");
    expect(mysqlResult.rollbackMainSQL).toContain("DROP COLUMN `deleted_at`");

    const pgQuery = jest.fn(async (sql: string) => {
      if (sql.includes("FROM information_schema.columns")) {
        return [
          {
            column_name: "id",
            data_type: "integer",
            udt_name: "int4",
            is_nullable: "NO",
            column_default: "nextval('users_id_seq'::regclass)",
            character_maximum_length: null,
            numeric_precision: 32,
            numeric_scale: 0,
          },
        ];
      }
      if (sql.includes("constraint_type = 'FOREIGN KEY'")) {
        return [];
      }
      throw new Error(`Unexpected PG SQL: ${sql}`);
    });
    mockedGetAdapter.mockResolvedValueOnce({
      query: pgQuery,
      placeholder: (index: number) => `$${index}`,
    } as never);

    const pgSchema: Record<string, SchemaField> = {
      id: column("increments", undefined, { primary: true }),
      softDeletes: mixin("SoftDeletes"),
    };
    const pgResult = await SchemaBuilder.toCreateSQL(
      "users",
      pgSchema,
      "pg",
      true,
      "pg_test"
    );
    expect(pgResult.mainSQL).toContain('ADD COLUMN "deleted_at" TIMESTAMP NULL DEFAULT NULL');
    expect(pgResult.rollbackMainSQL).toContain('DROP COLUMN "deleted_at"');

    const sqliteQuery = jest.fn(async (sql: string) => {
      if (sql.startsWith('PRAGMA table_info("users")')) {
        return [{ name: "id", type: "INTEGER", notnull: 1, dflt_value: null, pk: 1 }];
      }
      if (sql.startsWith('PRAGMA foreign_key_list("users")')) {
        return [];
      }
      throw new Error(`Unexpected SQLite SQL: ${sql}`);
    });
    mockedGetAdapter.mockResolvedValueOnce({
      query: sqliteQuery,
      placeholder: () => "?",
    } as never);

    const sqliteSchema: Record<string, SchemaField> = {
      id: column("increments", undefined, { primary: true }),
      softDeletes: mixin("SoftDeletes"),
    };
    const sqliteResult = await SchemaBuilder.toCreateSQL(
      "users",
      sqliteSchema,
      "sqlite",
      true,
      "sqlite_test"
    );
    expect(sqliteResult.mainSQL).toContain('ADD COLUMN "deleted_at" DATETIME NULL DEFAULT NULL');
    expect(sqliteResult.rollbackMainSQL).toContain('DROP COLUMN "deleted_at"');
  });

  test("SchemaBuilder drops SoftDeletes column when schema removes it across MySQL/PG/SQLite", async () => {
    const mysqlQuery = jest.fn(async (sql: string) => {
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
            Field: "deleted_at",
            Type: "timestamp",
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
      throw new Error(`Unexpected MySQL SQL: ${sql}`);
    });
    mockedGetAdapter.mockResolvedValueOnce({
      query: mysqlQuery,
      placeholder: () => "?",
    } as never);

    const mysqlSchema: Record<string, SchemaField> = {
      id: column("increments", undefined, { primary: true }),
    };
    const mysqlResult = await SchemaBuilder.toCreateSQL(
      "users",
      mysqlSchema,
      "mysql",
      true,
      "mysql"
    );
    expect(mysqlResult.mainSQL).toContain("DROP COLUMN `deleted_at`");
    expect(mysqlResult.rollbackMainSQL).toContain("ADD COLUMN `deleted_at` TIMESTAMP");

    const pgQuery = jest.fn(async (sql: string) => {
      if (sql.includes("FROM information_schema.columns")) {
        return [
          {
            column_name: "id",
            data_type: "integer",
            udt_name: "int4",
            is_nullable: "NO",
            column_default: "nextval('users_id_seq'::regclass)",
            character_maximum_length: null,
            numeric_precision: 32,
            numeric_scale: 0,
          },
          {
            column_name: "deleted_at",
            data_type: "timestamp without time zone",
            udt_name: "timestamp",
            is_nullable: "YES",
            column_default: null,
            character_maximum_length: null,
            numeric_precision: null,
            numeric_scale: null,
          },
        ];
      }
      if (sql.includes("constraint_type = 'FOREIGN KEY'")) {
        return [];
      }
      throw new Error(`Unexpected PG SQL: ${sql}`);
    });
    mockedGetAdapter.mockResolvedValueOnce({
      query: pgQuery,
      placeholder: (index: number) => `$${index}`,
    } as never);

    const pgSchema: Record<string, SchemaField> = {
      id: column("increments", undefined, { primary: true }),
    };
    const pgResult = await SchemaBuilder.toCreateSQL(
      "users",
      pgSchema,
      "pg",
      true,
      "pg_test"
    );
    expect(pgResult.mainSQL).toContain('DROP COLUMN "deleted_at"');
    expect(pgResult.rollbackMainSQL).toContain('ADD COLUMN "deleted_at" TIMESTAMP');

    const sqliteQuery = jest.fn(async (sql: string) => {
      if (sql.startsWith('PRAGMA table_info("users")')) {
        return [
          { name: "id", type: "INTEGER", notnull: 1, dflt_value: null, pk: 1 },
          {
            name: "deleted_at",
            type: "DATETIME",
            notnull: 0,
            dflt_value: "NULL",
            pk: 0,
          },
        ];
      }
      if (sql.startsWith('PRAGMA foreign_key_list("users")')) {
        return [];
      }
      throw new Error(`Unexpected SQLite SQL: ${sql}`);
    });
    mockedGetAdapter.mockResolvedValueOnce({
      query: sqliteQuery,
      placeholder: () => "?",
    } as never);

    const sqliteSchema: Record<string, SchemaField> = {
      id: column("increments", undefined, { primary: true }),
    };
    const sqliteResult = await SchemaBuilder.toCreateSQL(
      "users",
      sqliteSchema,
      "sqlite",
      true,
      "sqlite_test"
    );
    expect(sqliteResult.mainSQL).toContain('DROP COLUMN "deleted_at"');
    expect(sqliteResult.rollbackMainSQL).toContain('ADD COLUMN "deleted_at" DATETIME');
  });

  test("SchemaBuilder diffs morphTo columns across MySQL/PG/SQLite smart updates", async () => {
    const mysqlQuery = jest.fn(async (sql: string) => {
      if (sql.startsWith("SHOW TABLES LIKE")) {
        return [{ table: "comments" }];
      }
      if (sql.includes("SHOW COLUMNS FROM `comments`;")) {
        return [
          {
            Field: "id",
            Type: "int",
            Null: "NO",
            Key: "PRI",
            Default: null,
            Extra: "auto_increment",
          },
        ];
      }
      if (sql.includes("FROM information_schema.KEY_COLUMN_USAGE")) {
        return [];
      }
      throw new Error(`Unexpected MySQL SQL: ${sql}`);
    });
    mockedGetAdapter.mockResolvedValueOnce({
      query: mysqlQuery,
      placeholder: () => "?",
    } as never);

    const mysqlSchema: Record<string, SchemaField> = {
      id: column("increments", undefined, { primary: true }),
      commentable: relation("morphTo", "Commentable", { morphName: "commentable" }),
    };
    const mysqlResult = await SchemaBuilder.toCreateSQL(
      "comments",
      mysqlSchema,
      "mysql",
      true,
      "mysql"
    );
    expect(mysqlResult.mainSQL).toContain("ADD COLUMN `commentable_id` INT");
    expect(mysqlResult.mainSQL).toContain("ADD COLUMN `commentable_type` VARCHAR(255)");
    expect(mysqlResult.rollbackMainSQL).toContain("DROP COLUMN `commentable_id`");
    expect(mysqlResult.rollbackMainSQL).toContain("DROP COLUMN `commentable_type`");

    const pgQuery = jest.fn(async (sql: string) => {
      if (sql.includes("FROM information_schema.columns")) {
        return [
          {
            column_name: "id",
            data_type: "integer",
            udt_name: "int4",
            is_nullable: "NO",
            column_default: "nextval('comments_id_seq'::regclass)",
            character_maximum_length: null,
            numeric_precision: 32,
            numeric_scale: 0,
          },
        ];
      }
      if (sql.includes("constraint_type = 'FOREIGN KEY'")) {
        return [];
      }
      throw new Error(`Unexpected PG SQL: ${sql}`);
    });
    mockedGetAdapter.mockResolvedValueOnce({
      query: pgQuery,
      placeholder: (index: number) => `$${index}`,
    } as never);

    const pgSchema: Record<string, SchemaField> = {
      id: column("increments", undefined, { primary: true }),
      commentable: relation("morphTo", "Commentable", { morphName: "commentable" }),
    };
    const pgResult = await SchemaBuilder.toCreateSQL(
      "comments",
      pgSchema,
      "pg",
      true,
      "pg_test"
    );
    expect(pgResult.mainSQL).toContain('ADD COLUMN "commentable_id" INTEGER');
    expect(pgResult.mainSQL).toContain('ADD COLUMN "commentable_type" VARCHAR(255)');
    expect(pgResult.rollbackMainSQL).toContain('DROP COLUMN "commentable_id"');
    expect(pgResult.rollbackMainSQL).toContain('DROP COLUMN "commentable_type"');

    const sqliteQuery = jest.fn(async (sql: string) => {
      if (sql.startsWith('PRAGMA table_info("comments")')) {
        return [{ name: "id", type: "INTEGER", notnull: 1, dflt_value: null, pk: 1 }];
      }
      if (sql.startsWith('PRAGMA foreign_key_list("comments")')) {
        return [];
      }
      throw new Error(`Unexpected SQLite SQL: ${sql}`);
    });
    mockedGetAdapter.mockResolvedValueOnce({
      query: sqliteQuery,
      placeholder: () => "?",
    } as never);

    const sqliteSchema: Record<string, SchemaField> = {
      id: column("increments", undefined, { primary: true }),
      commentable: relation("morphTo", "Commentable", { morphName: "commentable" }),
    };
    const sqliteResult = await SchemaBuilder.toCreateSQL(
      "comments",
      sqliteSchema,
      "sqlite",
      true,
      "sqlite_test"
    );
    expect(sqliteResult.mainSQL).toContain('ADD COLUMN "commentable_id" INTEGER');
    expect(sqliteResult.mainSQL).toContain('ADD COLUMN "commentable_type" TEXT');
    expect(sqliteResult.rollbackMainSQL).toContain('DROP COLUMN "commentable_id"');
    expect(sqliteResult.rollbackMainSQL).toContain('DROP COLUMN "commentable_type"');
  });

  test("SchemaBuilder drops morphTo columns when relation is removed across MySQL/PG/SQLite", async () => {
    const mysqlQuery = jest.fn(async (sql: string) => {
      if (sql.startsWith("SHOW TABLES LIKE")) {
        return [{ table: "comments" }];
      }
      if (sql.includes("SHOW COLUMNS FROM `comments`;")) {
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
            Field: "commentable_id",
            Type: "int",
            Null: "YES",
            Key: "",
            Default: null,
            Extra: "",
          },
          {
            Field: "commentable_type",
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
      throw new Error(`Unexpected MySQL SQL: ${sql}`);
    });
    mockedGetAdapter.mockResolvedValueOnce({
      query: mysqlQuery,
      placeholder: () => "?",
    } as never);

    const mysqlSchema: Record<string, SchemaField> = {
      id: column("increments", undefined, { primary: true }),
    };
    const mysqlResult = await SchemaBuilder.toCreateSQL(
      "comments",
      mysqlSchema,
      "mysql",
      true,
      "mysql"
    );
    expect(mysqlResult.mainSQL).toContain("DROP COLUMN `commentable_id`");
    expect(mysqlResult.mainSQL).toContain("DROP COLUMN `commentable_type`");
    expect(mysqlResult.rollbackMainSQL).toContain("ADD COLUMN `commentable_id` INT");
    expect(mysqlResult.rollbackMainSQL).toContain(
      "ADD COLUMN `commentable_type` VARCHAR(255)"
    );

    const pgQuery = jest.fn(async (sql: string) => {
      if (sql.includes("FROM information_schema.columns")) {
        return [
          {
            column_name: "id",
            data_type: "integer",
            udt_name: "int4",
            is_nullable: "NO",
            column_default: "nextval('comments_id_seq'::regclass)",
            character_maximum_length: null,
            numeric_precision: 32,
            numeric_scale: 0,
          },
          {
            column_name: "commentable_id",
            data_type: "integer",
            udt_name: "int4",
            is_nullable: "YES",
            column_default: null,
            character_maximum_length: null,
            numeric_precision: 32,
            numeric_scale: 0,
          },
          {
            column_name: "commentable_type",
            data_type: "character varying",
            udt_name: "varchar",
            is_nullable: "YES",
            column_default: null,
            character_maximum_length: 255,
            numeric_precision: null,
            numeric_scale: null,
          },
        ];
      }
      if (sql.includes("constraint_type = 'FOREIGN KEY'")) {
        return [];
      }
      throw new Error(`Unexpected PG SQL: ${sql}`);
    });
    mockedGetAdapter.mockResolvedValueOnce({
      query: pgQuery,
      placeholder: (index: number) => `$${index}`,
    } as never);

    const pgSchema: Record<string, SchemaField> = {
      id: column("increments", undefined, { primary: true }),
    };
    const pgResult = await SchemaBuilder.toCreateSQL(
      "comments",
      pgSchema,
      "pg",
      true,
      "pg_test"
    );
    expect(pgResult.mainSQL).toContain('DROP COLUMN "commentable_id"');
    expect(pgResult.mainSQL).toContain('DROP COLUMN "commentable_type"');
    expect(pgResult.rollbackMainSQL).toContain('ADD COLUMN "commentable_id" INTEGER');
    expect(pgResult.rollbackMainSQL).toContain(
      'ADD COLUMN "commentable_type" VARCHAR(255)'
    );

    const sqliteQuery = jest.fn(async (sql: string) => {
      if (sql.startsWith('PRAGMA table_info("comments")')) {
        return [
          { name: "id", type: "INTEGER", notnull: 1, dflt_value: null, pk: 1 },
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
      throw new Error(`Unexpected SQLite SQL: ${sql}`);
    });
    mockedGetAdapter.mockResolvedValueOnce({
      query: sqliteQuery,
      placeholder: () => "?",
    } as never);

    const sqliteSchema: Record<string, SchemaField> = {
      id: column("increments", undefined, { primary: true }),
    };
    const sqliteResult = await SchemaBuilder.toCreateSQL(
      "comments",
      sqliteSchema,
      "sqlite",
      true,
      "sqlite_test"
    );
    expect(sqliteResult.mainSQL).toContain('DROP COLUMN "commentable_id"');
    expect(sqliteResult.mainSQL).toContain('DROP COLUMN "commentable_type"');
    expect(sqliteResult.rollbackMainSQL).toContain('ADD COLUMN "commentable_id" INTEGER');
    expect(sqliteResult.rollbackMainSQL).toContain('ADD COLUMN "commentable_type" TEXT');
  });

  test("pivot factory template uses corrected import paths", () => {
    const templatePath = path.join(
      process.cwd(),
      "src/cli/templates/pivot-factory.tpl"
    );
    const template = fs.readFileSync(templatePath, "utf8");

    expect(template).toContain(
      'import { BaseModel, Factory, PivotHelperMixin } from "{{packageImportPath}}";'
    );
  });
});

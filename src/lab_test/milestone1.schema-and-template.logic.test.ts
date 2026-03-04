import fs from "fs";
import path from "path";
import { SchemaBuilder } from "../core/schema/SchemaBuilder";
import { column, relation, type SchemaField } from "../core/schema/SchemaBlueprint";
import { getAdapter } from "../core/connection/ConnectionFactory";

jest.mock("../core/connection/ConnectionFactory", () => ({
  getAdapter: jest.fn(),
}));

const mockedGetAdapter = getAdapter as jest.MockedFunction<typeof getAdapter>;

describe("Milestone 1: schema rollback + pivot template", () => {
  afterEach(() => {
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

  test("pivot factory template uses corrected import paths", () => {
    const templatePath = path.join(
      process.cwd(),
      "src/cli/templates/pivot-factory.tpl"
    );
    const template = fs.readFileSync(templatePath, "utf8");

    expect(template).toContain(
      'import { BaseModel, Factory, PivotHelperMixin } from "eloquentjs";'
    );
  });
});

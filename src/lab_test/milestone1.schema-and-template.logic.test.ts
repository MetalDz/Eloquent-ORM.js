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

  test("pivot factory template uses corrected import paths", () => {
    const templatePath = path.join(
      process.cwd(),
      "src/cli/templates/pivot-factory.tpl"
    );
    const template = fs.readFileSync(templatePath, "utf8");

    expect(template).toContain(
      'import { Factory } from "../../../cli/utils/factories/Factory";'
    );
    expect(template).toContain(
      'import { BaseModel } from "../../../core/model/BaseModel";'
    );
    expect(template).toContain(
      'import { PivotHelperMixin } from "../../../core/orm/mixins/PivotHelperMixin";'
    );
  });
});

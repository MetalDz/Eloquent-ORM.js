import fs from "fs";
import path from "path";
import { SchemaBuilder } from "../core/schema/SchemaBuilder";
import { column, relation, type SchemaField } from "../core/schema/SchemaBlueprint";
import { getConnection } from "../core/connection/ConnectionFactory";

jest.mock("../core/connection/ConnectionFactory", () => ({
  getConnection: jest.fn(),
}));

const mockedGetConnection = getConnection as jest.MockedFunction<typeof getConnection>;

describe("Milestone 1: schema rollback + pivot template", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test("SchemaBuilder generates rollback SQL for create + pivot", async () => {
    const query = jest.fn(async (sql: string) => {
      if (sql.startsWith("SHOW TABLES LIKE")) {
        return [[], []];
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    mockedGetConnection.mockResolvedValue({ query } as never);

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
        return [[{ table: "users" }], []];
      }
      if (sql.includes("SHOW COLUMNS FROM `users`;")) {
        return [[
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
        ], []];
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    mockedGetConnection.mockResolvedValue({ query } as never);

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


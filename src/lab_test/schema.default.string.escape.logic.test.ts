import { SchemaBuilder } from "../core/schema/SchemaBuilder.js";
import { column, type SchemaField } from "../core/schema/SchemaBlueprint.js";
import { getAdapter } from "../core/connection/ConnectionFactory.js";

jest.mock("../core/connection/ConnectionFactory", () => ({
  getAdapter: jest.fn(),
}));

const mockedGetAdapter = getAdapter as jest.MockedFunction<typeof getAdapter>;

describe("SchemaBuilder default string SQL escaping", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  test("escapes single quotes in string defaults for CREATE SQL across dialects", async () => {
    const schema: Record<string, SchemaField> = {
      id: column("increments", undefined, { primary: true }),
      title: column("string", undefined, { default: "O'Reilly" }),
    };

    for (const dialect of ["mysql", "pg", "sqlite"] as const) {
      const result = await SchemaBuilder.toCreateSQL(
        "books",
        schema,
        dialect,
        true,
        undefined,
        true
      );

      expect(result.mainSQL).toContain("DEFAULT 'O''Reilly'");
      expect(result.mainSQL).not.toContain("DEFAULT 'O'Reilly'");
    }
  });

  test("escapes single quotes in string defaults for UPDATE add-column SQL", async () => {
    const mysqlAdapter = {
      query: jest.fn(async (sql: string) => {
        if (sql.includes("SHOW TABLES LIKE")) {
          return [{ Tables_in_db: "books" }];
        }
        if (sql.includes("SHOW COLUMNS FROM")) {
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
        if (sql.includes("information_schema.KEY_COLUMN_USAGE")) {
          return [];
        }
        return [];
      }),
      placeholder: (index: number) => `?${index}`,
    };
    mockedGetAdapter.mockResolvedValue(mysqlAdapter as never);

    const schema: Record<string, SchemaField> = {
      id: column("increments", undefined, { primary: true }),
      title: column("string", undefined, { default: "O'Reilly" }),
    };

    const result = await SchemaBuilder.toCreateSQL(
      "books",
      schema,
      "mysql",
      true,
      "mysql_test"
    );

    expect(result.mainSQL).toContain("ADD COLUMN `title` VARCHAR DEFAULT 'O''Reilly'");
    expect(result.mainSQL).not.toContain("ADD COLUMN `title` VARCHAR DEFAULT 'O'Reilly'");
  });
});

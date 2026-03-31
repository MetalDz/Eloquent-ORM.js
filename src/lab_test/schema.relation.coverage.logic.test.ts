import { SchemaBuilder } from "../core/schema/SchemaBuilder.js";
import { column, relation, type SchemaField } from "../core/schema/SchemaBlueprint.js";
import { getAdapter } from "../core/connection/ConnectionFactory.js";

jest.mock("../core/connection/ConnectionFactory", () => ({
  getAdapter: jest.fn(),
}));

const mockedGetAdapter = getAdapter as jest.MockedFunction<typeof getAdapter>;

type SqlDialect = "mysql" | "pg" | "sqlite";

function existingIdColumnRows(dialect: SqlDialect): unknown[] {
  if (dialect === "mysql") {
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
  if (dialect === "pg") {
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
  return [{ name: "id", type: "INTEGER", notnull: 1, dflt_value: null, pk: 1 }];
}

function mockAdapterForNoTable(dialect: SqlDialect): void {
  if (dialect === "mysql") {
    const query = jest.fn(async (sql: string) => {
      if (sql.startsWith("SHOW TABLES LIKE")) return [];
      throw new Error(`Unexpected mysql SQL: ${sql}`);
    });
    mockedGetAdapter.mockResolvedValueOnce({
      query,
      placeholder: () => "?",
    } as never);
    return;
  }

  if (dialect === "pg") {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes("FROM information_schema.columns")) return [];
      if (sql.includes("constraint_type = 'FOREIGN KEY'")) return [];
      throw new Error(`Unexpected pg SQL: ${sql}`);
    });
    mockedGetAdapter.mockResolvedValueOnce({
      query,
      placeholder: (index: number) => `$${index}`,
    } as never);
    return;
  }

  const query = jest.fn(async (sql: string) => {
    if (sql.startsWith('PRAGMA table_info("users")')) return [];
    if (sql.startsWith('PRAGMA foreign_key_list("users")')) return [];
    throw new Error(`Unexpected sqlite SQL: ${sql}`);
  });
  mockedGetAdapter.mockResolvedValueOnce({
    query,
    placeholder: () => "?",
  } as never);
}

function mockAdapterForExistingTable(dialect: SqlDialect): void {
  if (dialect === "mysql") {
    const query = jest.fn(async (sql: string) => {
      if (sql.startsWith("SHOW TABLES LIKE")) return [{ table: "users" }];
      if (sql.includes("SHOW COLUMNS FROM `users`;")) return existingIdColumnRows("mysql");
      if (sql.includes("FROM information_schema.KEY_COLUMN_USAGE")) return [];
      throw new Error(`Unexpected mysql SQL: ${sql}`);
    });
    mockedGetAdapter.mockResolvedValueOnce({
      query,
      placeholder: () => "?",
    } as never);
    return;
  }

  if (dialect === "pg") {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes("FROM information_schema.columns")) return existingIdColumnRows("pg");
      if (sql.includes("constraint_type = 'FOREIGN KEY'")) return [];
      throw new Error(`Unexpected pg SQL: ${sql}`);
    });
    mockedGetAdapter.mockResolvedValueOnce({
      query,
      placeholder: (index: number) => `$${index}`,
    } as never);
    return;
  }

  const query = jest.fn(async (sql: string) => {
    if (sql.startsWith('PRAGMA table_info("users")')) return existingIdColumnRows("sqlite");
    if (sql.startsWith('PRAGMA foreign_key_list("users")')) return [];
    throw new Error(`Unexpected sqlite SQL: ${sql}`);
  });
  mockedGetAdapter.mockResolvedValueOnce({
    query,
    placeholder: () => "?",
  } as never);
}

function mockPivotMissing(dialect: Exclude<SqlDialect, "mysql">): void {
  if (dialect === "pg") {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes("FROM information_schema.columns")) return existingIdColumnRows("pg");
      if (sql.includes("constraint_type = 'FOREIGN KEY'")) return [];
      if (sql.includes("FROM information_schema.tables")) return [];
      throw new Error(`Unexpected pg SQL: ${sql}`);
    });
    mockedGetAdapter.mockResolvedValueOnce({
      query,
      placeholder: (index: number) => `$${index}`,
    } as never);
    return;
  }

  const query = jest.fn(async (sql: string) => {
    if (sql.startsWith('PRAGMA table_info("users")')) return existingIdColumnRows("sqlite");
    if (sql.startsWith('PRAGMA foreign_key_list("users")')) return [];
    if (sql.includes("FROM sqlite_master")) return [];
    throw new Error(`Unexpected sqlite SQL: ${sql}`);
  });
  mockedGetAdapter.mockResolvedValueOnce({
    query,
    placeholder: () => "?",
  } as never);
}

function mockPivotExists(dialect: Exclude<SqlDialect, "mysql">): void {
  if (dialect === "pg") {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes("FROM information_schema.columns")) return existingIdColumnRows("pg");
      if (sql.includes("constraint_type = 'FOREIGN KEY'")) return [];
      if (sql.includes("FROM information_schema.tables")) return [{ table_name: "post_user_pivot" }];
      throw new Error(`Unexpected pg SQL: ${sql}`);
    });
    mockedGetAdapter.mockResolvedValueOnce({
      query,
      placeholder: (index: number) => `$${index}`,
    } as never);
    return;
  }

  const query = jest.fn(async (sql: string) => {
    if (sql.startsWith('PRAGMA table_info("users")')) return existingIdColumnRows("sqlite");
    if (sql.startsWith('PRAGMA foreign_key_list("users")')) return [];
    if (sql.includes("FROM sqlite_master")) return [{ name: "post_user_pivot" }];
    throw new Error(`Unexpected sqlite SQL: ${sql}`);
  });
  mockedGetAdapter.mockResolvedValueOnce({
    query,
    placeholder: () => "?",
  } as never);
}

describe("Schema relation coverage parity", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test.each<SqlDialect>(["mysql", "pg", "sqlite"])(
    "inverse relations are create-time no-op on %s",
    async (dialect) => {
      mockAdapterForNoTable(dialect);

      const schema: Record<string, SchemaField> = {
        id: column("increments", undefined, { primary: true }),
        profile: relation("hasOne", "Profile", { foreignKey: "user_id" }),
        posts: relation("hasMany", "Post", { foreignKey: "user_id" }),
        image: relation("morphOne", "Image", { morphName: "imageable" }),
        comments: relation("morphMany", "Comment", { morphName: "commentable" }),
      };

      const result = await SchemaBuilder.toCreateSQL("users", schema, dialect, true, dialect);

      expect(result.extraTables).toHaveLength(0);
      expect(result.mainSQL).toContain("CREATE TABLE IF NOT EXISTS");
      expect(result.mainSQL).not.toContain("user_id");
      expect(result.mainSQL).not.toContain("imageable");
      expect(result.mainSQL).not.toContain("commentable");
    }
  );

  test.each<SqlDialect>(["mysql", "pg", "sqlite"])(
    "inverse relations are smart-update no-op on %s",
    async (dialect) => {
      mockAdapterForExistingTable(dialect);

      const schema: Record<string, SchemaField> = {
        id: column("increments", undefined, { primary: true }),
        profile: relation("hasOne", "Profile", { foreignKey: "user_id" }),
        posts: relation("hasMany", "Post", { foreignKey: "user_id" }),
        image: relation("morphOne", "Image", { morphName: "imageable" }),
        comments: relation("morphMany", "Comment", { morphName: "commentable" }),
      };

      const result = await SchemaBuilder.toCreateSQL("users", schema, dialect, true, dialect);

      expect(result.mainSQL).toBe("");
      expect(result.rollbackMainSQL).toBe("");
      expect(result.extraTables).toHaveLength(0);
      expect(result.rollbackExtraTables).toHaveLength(0);
    }
  );

  test.each<Exclude<SqlDialect, "mysql">>(["pg", "sqlite"])(
    "belongsToMany smart-update emits pivot create when missing on %s",
    async (dialect) => {
      mockPivotMissing(dialect);

      const schema: Record<string, SchemaField> = {
        id: column("increments", undefined, { primary: true }),
        favorites: relation("belongsToMany", "Post"),
      };

      const result = await SchemaBuilder.toCreateSQL(
        "users",
        schema,
        dialect,
        true,
        dialect
      );

      expect(result.mainSQL).toBe("");
      expect(result.extraTables).toHaveLength(1);
      expect(result.extraTables[0]).toContain("post_user_pivot");
      expect(result.rollbackExtraTables).toHaveLength(1);
      expect(result.rollbackExtraTables[0]).toContain("post_user_pivot");
    }
  );

  test.each<Exclude<SqlDialect, "mysql">>(["pg", "sqlite"])(
    "belongsToMany smart-update skips pivot create when it already exists on %s",
    async (dialect) => {
      mockPivotExists(dialect);

      const schema: Record<string, SchemaField> = {
        id: column("increments", undefined, { primary: true }),
        favorites: relation("belongsToMany", "Post"),
      };

      const result = await SchemaBuilder.toCreateSQL(
        "users",
        schema,
        dialect,
        true,
        dialect
      );

      expect(result.mainSQL).toBe("");
      expect(result.extraTables).toHaveLength(0);
      expect(result.rollbackExtraTables).toHaveLength(0);
    }
  );
});

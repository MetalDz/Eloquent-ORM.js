import fs from "fs";
import os from "os";
import path from "path";

import { PathMap } from "../cli/utils/PathMap.js";
import { TypeScriptCompiler } from "../cli/utils/typescript/TypeScriptCompiler.js";
import { loadModule } from "../cli/utils/typescript/tsRuntime.js";
import { resolveConnectionName } from "../core/connection/resolveConnectionName.js";
import {
  closeAllConnections,
  getAdapter,
} from "../core/connection/ConnectionFactory.js";
import {
  column,
  relation,
  type ModelDatabaseDefinition,
  type SchemaField,
} from "../core/schema/SchemaBlueprint.js";
import { SchemaBuilder } from "../core/schema/SchemaBuilder.js";

type MakeMigrationFn = typeof import("../cli/commands/makeMigration.js").makeMigration;
let makeMigration: MakeMigrationFn;

jest.mock("chalk", () => ({
  __esModule: true,
  default: {
    blue: (value: string) => value,
    green: (value: string) => value,
    yellow: (value: string) => value,
    red: (value: string) => value,
    cyan: (value: string) => value,
    cyanBright: (value: string) => value,
    gray: (value: string) => value,
  },
}));

jest.mock("../core/connection/ConnectionFactory", () => ({
  getAdapter: jest.fn(),
  closeAllConnections: jest.fn(),
}));

jest.mock("../cli/utils/typescript/TypeScriptCompiler", () => ({
  TypeScriptCompiler: {
    compile: jest.fn(),
  },
}));

jest.mock("../cli/utils/typescript/tsRuntime", () => ({
  loadModule: jest.fn(),
}));

jest.mock("../core/connection/resolveConnectionName", () => ({
  resolveConnectionName: jest.fn(),
}));

const mockedGetAdapter = getAdapter as jest.MockedFunction<typeof getAdapter>;
const mockedCloseAllConnections =
  closeAllConnections as jest.MockedFunction<typeof closeAllConnections>;
const mockedCompile = TypeScriptCompiler.compile as jest.MockedFunction<
  typeof TypeScriptCompiler.compile
>;
const mockedLoadModule = loadModule as jest.MockedFunction<typeof loadModule>;
const mockedResolveConnectionName =
  resolveConnectionName as jest.MockedFunction<typeof resolveConnectionName>;

function pgIdColumn(columnName = "id"): Array<Record<string, unknown>> {
  return [
    {
      column_name: columnName,
      data_type: "uuid",
      udt_name: "uuid",
      is_nullable: "NO",
      column_default: null,
      character_maximum_length: null,
      numeric_precision: null,
      numeric_scale: null,
    },
  ];
}

function pgQueryMock(handlers: {
  columns?: Array<Record<string, unknown>>;
  foreignKeys?: Array<Record<string, unknown>>;
  indexes?: Array<Record<string, unknown>>;
}) {
  return jest.fn(async (sql: string) => {
    if (sql.includes("FROM information_schema.columns")) {
      return handlers.columns ?? [];
    }
    if (sql.includes("constraint_type = 'FOREIGN KEY'")) {
      return handlers.foreignKeys ?? [];
    }
    if (sql.includes("FROM pg_indexes")) {
      return handlers.indexes ?? [];
    }
    throw new Error(`Unexpected SQL: ${sql}`);
  });
}

describe("relational DDL metadata and safe diffing", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  beforeEach(() => {
    makeMigration = require("../cli/commands/makeMigration").makeMigration as MakeMigrationFn;
  });

  test("SchemaBuilder emits named pg foreign keys and composite indexes from model metadata", async () => {
    mockedGetAdapter.mockResolvedValueOnce({
      query: pgQueryMock({ columns: [], foreignKeys: [], indexes: [] }),
      placeholder: (index: number) => `$${index}`,
    } as never);

    const schema: Record<string, SchemaField> = {
      id: column("uuid", undefined, { primary: true }),
      registration_intake_id: column("uuid"),
      scope_code: column("string", 50, { notNull: true }),
      actor_id: column("uuid"),
      route_key: column("string", 100, { notNull: true }),
      idempotency_key: column("string", 190, { notNull: true }),
    };

    const database: ModelDatabaseDefinition = {
      foreignKeys: [
        {
          name: "identity_documents_registration_intake_fk",
          column: "registration_intake_id",
          references: { table: "registration_intakes", column: "id" },
          onDelete: "SET NULL",
        },
      ],
      indexes: [
        {
          name: "idempotency_records_scope_actor_route_key_unique",
          unique: true,
          columns: ["scope_code", "actor_id", "route_key", "idempotency_key"],
        },
      ],
    };

    const result = await SchemaBuilder.toCreateSQL(
      "identity_documents",
      schema,
      "pg",
      true,
      "pg_test",
      false,
      database,
    );

    expect(result.mainSQL).toContain(
      'CONSTRAINT "identity_documents_registration_intake_fk" FOREIGN KEY ("registration_intake_id") REFERENCES "registration_intakes"("id") ON DELETE SET NULL',
    );
    expect(result.extraTables).toContain(
      'CREATE UNIQUE INDEX IF NOT EXISTS "idempotency_records_scope_actor_route_key_unique" ON "identity_documents" ("scope_code", "actor_id", "route_key", "idempotency_key");',
    );
    expect(result.rollbackExtraTables).toContain(
      'DROP INDEX IF EXISTS "idempotency_records_scope_actor_route_key_unique";',
    );
  });

  test("SchemaBuilder emits default-named pg relational metadata with on update and partial indexes", async () => {
    mockedGetAdapter.mockResolvedValueOnce({
      query: pgQueryMock({ columns: [], foreignKeys: [], indexes: [] }),
      placeholder: (index: number) => `$${index}`,
    } as never);

    const schema: Record<string, SchemaField> = {
      id: column("uuid", undefined, { primary: true }),
      account_id: column("uuid"),
      email: column("string", 190, { notNull: true }),
      deleted_at: column("timestamp"),
    };

    const result = await SchemaBuilder.toCreateSQL(
      "users",
      schema,
      "pg",
      true,
      "pg_test",
      false,
      {
        foreignKeys: [
          {
            column: "account_id",
            references: { table: "accounts" },
            onDelete: "SET NULL",
            onUpdate: "CASCADE",
          },
        ],
        indexes: [
          {
            unique: true,
            columns: ["email", "deleted_at"],
            where: '"deleted_at" IS NULL',
          },
        ],
      },
    );

    expect(result.mainSQL).toContain(
      'CONSTRAINT "users_account_id_foreign" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE',
    );
    expect(result.extraTables).toContain(
      'CREATE UNIQUE INDEX IF NOT EXISTS "users_email_deleted_at_unique" ON "users" ("email", "deleted_at") WHERE "deleted_at" IS NULL;',
    );
  });

  test("SchemaBuilder preserves unmanaged pg foreign keys during smart update", async () => {
    mockedGetAdapter.mockResolvedValueOnce({
      query: pgQueryMock({
        columns: [
          ...pgIdColumn(),
          {
            column_name: "registration_intake_id",
            data_type: "uuid",
            udt_name: "uuid",
            is_nullable: "YES",
            column_default: null,
            character_maximum_length: null,
            numeric_precision: null,
            numeric_scale: null,
          },
        ],
        foreignKeys: [
          {
            constraint_name: "identity_documents_registration_intake_fk",
            column_name: "registration_intake_id",
            referenced_table_name: "registration_intakes",
            referenced_column_name: "id",
          },
        ],
        indexes: [],
      }),
      placeholder: (index: number) => `$${index}`,
    } as never);

    const schema: Record<string, SchemaField> = {
      id: column("uuid", undefined, { primary: true }),
      registration_intake_id: column("uuid"),
    };

    const result = await SchemaBuilder.toCreateSQL(
      "identity_documents",
      schema,
      "pg",
      true,
      "pg_test",
    );

    expect(result.mainSQL).toBe("");
    expect(result.rollbackMainSQL).toBe("");
    expect(result.mainSQL).not.toContain("DROP CONSTRAINT");
  });

  test("SchemaBuilder still drops ORM-managed default-named pg foreign keys when the relation is removed", async () => {
    mockedGetAdapter.mockResolvedValueOnce({
      query: pgQueryMock({
        columns: [
          ...pgIdColumn(),
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
        ],
        foreignKeys: [
          {
            constraint_name: "posts_user_id_foreign",
            column_name: "user_id",
            referenced_table_name: "users",
            referenced_column_name: "id",
          },
        ],
        indexes: [],
      }),
      placeholder: (index: number) => `$${index}`,
    } as never);

    const schema: Record<string, SchemaField> = {
      id: column("increments", undefined, { primary: true }),
    };

    const result = await SchemaBuilder.toCreateSQL(
      "posts",
      schema,
      "pg",
      true,
      "pg_test",
    );

    expect(result.mainSQL).toContain('DROP CONSTRAINT "posts_user_id_foreign"');
    expect(result.mainSQL).toContain('DROP COLUMN "user_id"');
    expect(
      result.mainSQL.indexOf('DROP CONSTRAINT "posts_user_id_foreign"'),
    ).toBeLessThan(result.mainSQL.indexOf('DROP COLUMN "user_id"'));
  });

  test("SchemaBuilder logs added indexes for pg smart-update diffs", async () => {
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);

    mockedGetAdapter.mockResolvedValueOnce({
      query: pgQueryMock({
        columns: [
          ...pgIdColumn(),
          {
            column_name: "email",
            data_type: "character varying",
            udt_name: "varchar",
            is_nullable: "NO",
            column_default: null,
            character_maximum_length: 190,
            numeric_precision: null,
            numeric_scale: null,
          },
          {
            column_name: "legacy_name",
            data_type: "character varying",
            udt_name: "varchar",
            is_nullable: "YES",
            column_default: null,
            character_maximum_length: 120,
            numeric_precision: null,
            numeric_scale: null,
          },
        ],
        foreignKeys: [],
        indexes: [],
      }),
      placeholder: (index: number) => `$${index}`,
    } as never);

    await SchemaBuilder.toCreateSQL(
      "users",
      {
        id: column("uuid", undefined, { primary: true }),
        email: column("string", 190, { notNull: true }),
        display_name: column("string", 120),
      },
      "pg",
      true,
      "pg_test",
      false,
      {
        indexes: [
          {
            name: "users_email_unique",
            unique: true,
            columns: ["email"],
          },
        ],
      },
    );

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('+idx[users_email_unique]'));
  });

  test("SchemaBuilder reuses existing mysql composite indexes during smart update", async () => {
    const mysqlQuery = jest.fn(async (sql: string) => {
      if (sql.startsWith("SHOW TABLES LIKE")) {
        return [{ [`Tables_in_test (${sql})`]: "audit_logs" }];
      }
      if (sql.startsWith("SHOW COLUMNS FROM")) {
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
            Field: "scope_code",
            Type: "varchar(50)",
            Null: "NO",
            Key: "",
            Default: null,
            Extra: "",
          },
          {
            Field: "actor_id",
            Type: "char(36)",
            Null: "YES",
            Key: "",
            Default: null,
            Extra: "",
          },
        ];
      }
      if (sql.startsWith("SHOW INDEX FROM")) {
        return [
          {
            Key_name: "PRIMARY",
            Column_name: "id",
            Non_unique: 0,
            Seq_in_index: 1,
          },
          {
            Key_name: "audit_scope_actor_unique",
            Column_name: "scope_code",
            Non_unique: 0,
            Seq_in_index: 1,
          },
          {
            Key_name: "audit_scope_actor_unique",
            Column_name: "actor_id",
            Non_unique: 0,
            Seq_in_index: 2,
          },
        ];
      }
      if (sql.includes("KEY_COLUMN_USAGE")) {
        return [];
      }
      return [];
    });

    mockedGetAdapter.mockResolvedValueOnce({
      query: mysqlQuery,
      placeholder: (index: number) => `?${index}`,
    } as never);

    const result = await SchemaBuilder.toCreateSQL(
      "audit_logs",
      {
        id: column("increments", undefined, { primary: true }),
        scope_code: column("string", 50, { notNull: true }),
        actor_id: column("uuid"),
      },
      "mysql",
      true,
      "mysql_test",
      false,
      {
        indexes: [
          {
            unique: true,
            columns: ["scope_code", "actor_id"],
          },
        ],
      },
    );

    expect(result.extraTables).toEqual([]);
    expect(result.rollbackExtraTables).toEqual([]);
  });

  test("SchemaBuilder ignores pg primary keys and malformed index definitions when diffing indexes", async () => {
    mockedGetAdapter.mockResolvedValueOnce({
      query: pgQueryMock({
        columns: [
          ...pgIdColumn(),
          {
            column_name: "email",
            data_type: "character varying",
            udt_name: "varchar",
            is_nullable: "NO",
            column_default: null,
            character_maximum_length: 190,
            numeric_precision: null,
            numeric_scale: null,
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
        ],
        foreignKeys: [],
        indexes: [
          {
            indexname: "users_pkey",
            indexdef: 'CREATE UNIQUE INDEX users_pkey ON public.users USING btree ("id")',
          },
          {
            indexname: "broken_idx",
            indexdef: "CREATE INDEX broken_idx ON public.users",
          },
          {
            indexname: "users_email_deleted_at_unique",
            indexdef:
              'CREATE UNIQUE INDEX users_email_deleted_at_unique ON public.users USING btree ("email", "deleted_at") WHERE ("deleted_at" IS NULL)',
          },
        ],
      }),
      placeholder: (index: number) => `$${index}`,
    } as never);

    const result = await SchemaBuilder.toCreateSQL(
      "users",
      {
        id: column("uuid", undefined, { primary: true }),
        email: column("string", 190, { notNull: true }),
        deleted_at: column("timestamp"),
      },
      "pg",
      true,
      "pg_test",
      false,
      {
        indexes: [
          {
            unique: true,
            columns: ["email", "deleted_at"],
            where: '("deleted_at" IS NULL)',
          },
        ],
      },
    );

    expect(result.extraTables).toEqual([]);
    expect(result.rollbackExtraTables).toEqual([]);
  });

  test("SchemaBuilder reuses existing sqlite indexes and sqlite foreign key metadata safely", async () => {
    const sqliteQuery = jest.fn(async (sql: string) => {
      if (sql.startsWith("PRAGMA table_info")) {
        return [
          { name: "id", type: "INTEGER", notnull: 1, dflt_value: null, pk: 1 },
          { name: "account_id", type: "TEXT", notnull: 0, dflt_value: null, pk: 0 },
          { name: "email", type: "TEXT", notnull: 1, dflt_value: null, pk: 0 },
        ];
      }
      if (sql.startsWith("PRAGMA foreign_key_list")) {
        return [{ table: "accounts", from: "account_id", to: "id" }];
      }
      if (sql.startsWith('PRAGMA index_list')) {
        return [
          { name: "sqlite_autoindex_users_1", unique: 1, origin: "pk" },
          { name: "users_account_email_idx", unique: 0, origin: "c" },
        ];
      }
      if (sql.startsWith('PRAGMA index_info("users_account_email_idx")')) {
        return [
          { seqno: 2, name: "email" },
          { seqno: 0, name: "account_id" },
          { seqno: 1, name: "tenant_id" },
        ];
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    mockedGetAdapter.mockResolvedValueOnce({
      query: sqliteQuery,
      placeholder: (index: number) => `?${index}`,
    } as never);

    const result = await SchemaBuilder.toCreateSQL(
      "users",
      {
        id: column("increments", undefined, { primary: true }),
        account_id: column("uuid"),
        email: column("string", 190, { notNull: true }),
      },
      "sqlite",
      true,
      "sqlite_test",
      false,
      {
        foreignKeys: [
          {
            column: "account_id",
            references: { table: "accounts" },
            onUpdate: "CASCADE",
          },
        ],
        indexes: [
          {
            columns: ["account_id", "tenant_id", "email"],
          },
        ],
      },
    );

    expect(result.extraTables).toEqual([]);
    expect(result.rollbackExtraTables).toEqual([]);
  });

  test("makeMigration includes model relational metadata in generated pg migrations", async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-relational-ddl-"));
    const modelsDir = path.join(tempRoot, "models");
    const migrationsRoot = path.join(tempRoot, "migrations");
    const migrationsDir = path.join(migrationsRoot, "pg_test");

    fs.mkdirSync(modelsDir, { recursive: true });
    fs.mkdirSync(migrationsDir, { recursive: true });
    fs.writeFileSync(
      path.join(modelsDir, "IdentityDocument.ts"),
      "export class IdentityDocument {}",
      "utf8",
    );

    jest.spyOn(PathMap, "ensureDirs").mockImplementation(() => undefined);
    jest.spyOn(PathMap, "models").mockImplementation(() => modelsDir);
    jest
      .spyOn(PathMap, "migrations")
      .mockImplementation((_isTest = false, connectionName?: string) =>
        connectionName ? migrationsDir : migrationsRoot,
      );
    jest.spyOn(PathMap, "testMigrations").mockImplementation(() => migrationsRoot);
    jest.spyOn(PathMap, "appMigrations").mockImplementation(() => migrationsRoot);

    mockedCompile.mockReturnValue(true);
    mockedResolveConnectionName.mockReturnValue("pg_test" as never);
    mockedCloseAllConnections.mockResolvedValue(undefined);
    mockedLoadModule.mockReturnValue({
      IdentityDocument: {
        tableName: "identity_documents",
        connectionName: "pg_test",
        schema: {
          id: column("uuid", undefined, { primary: true }),
          registration_intake_id: column("uuid"),
          scope_code: column("string", 50, { notNull: true }),
          actor_id: column("uuid"),
          route_key: column("string", 100, { notNull: true }),
          idempotency_key: column("string", 190, { notNull: true }),
        } satisfies Record<string, SchemaField>,
        database: {
          foreignKeys: [
            {
              name: "identity_documents_registration_intake_fk",
              column: "registration_intake_id",
              references: { table: "registration_intakes", column: "id" },
              onDelete: "SET NULL",
            },
          ],
          indexes: [
            {
              name: "identity_documents_scope_actor_route_key_unique",
              unique: true,
              columns: ["scope_code", "actor_id", "route_key", "idempotency_key"],
            },
          ],
        } satisfies ModelDatabaseDefinition,
      },
    });

    mockedGetAdapter.mockResolvedValue({
      query: pgQueryMock({ columns: [], foreignKeys: [], indexes: [] }),
      placeholder: (index: number) => `$${index}`,
    } as never);

    await makeMigration("IdentityDocument", {
      test: true,
      connectionName: "pg_test" as never,
      exit: false,
    });

    const migrationFile = fs
      .readdirSync(migrationsDir)
      .find((file) => file.includes("create_identity_documents_table"));

    expect(migrationFile).toBeDefined();

    const content = fs.readFileSync(path.join(migrationsDir, migrationFile!), "utf8");
    expect(content).toContain('"identity_documents_registration_intake_fk"');
    expect(content).toContain('ON DELETE SET NULL');
    expect(content).toContain('"identity_documents_scope_actor_route_key_unique"');

    fs.rmSync(tempRoot, { recursive: true, force: true });
  });
});

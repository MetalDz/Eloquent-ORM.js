import type { TransactionContext } from "../core/connection/TransactionManager.js";
import type { DriverAdapter } from "../core/connection/DriverAdapter.js";

type MockAdapter = {
  query: jest.Mock<Promise<unknown[]>, [string, unknown[]?]>;
  queryOne: jest.Mock<Promise<Record<string, unknown> | null>, [string, unknown[]?]>;
  execute: jest.Mock<Promise<void>, [string, unknown[]?]>;
  insert: jest.Mock<
    Promise<{ id?: unknown; row?: Record<string, unknown> }>,
    [string, unknown[]?]
  >;
} & Omit<DriverAdapter, "query" | "queryOne" | "execute" | "insert">;

const makeSqlAdapter = (
  name: DriverAdapter["name"],
  driver: "pg" | "mysql" | "sqlite",
): MockAdapter => {
  const placeholder = driver === "pg" ? (index: number) => `$${index}` : () => "?";

  return {
    name,
    kind: "sql",
    query: jest.fn(async (_sql: string, _params?: unknown[]) => []) as MockAdapter["query"],
    queryOne: jest.fn(
      async (_sql: string, _params?: unknown[]) => null,
    ) as MockAdapter["queryOne"],
    execute: jest.fn(
      async (_sql: string, _params?: unknown[]) => undefined,
    ) as MockAdapter["execute"],
    insert: jest.fn(
      async (_sql: string, _params?: unknown[]) => ({ id: undefined }),
    ) as MockAdapter["insert"],
    placeholder,
    placeholders: (count: number, startIndex = 1) =>
      Array.from({ length: count }, (_, idx) => placeholder(startIndex + idx)).join(", "),
    inClause: (field: string, values: unknown[], startIndex = 1) => ({
      sql:
        driver === "pg"
          ? `${field} = ANY(${placeholder(startIndex)})`
          : `${field} IN (${values.map(() => "?").join(", ")})`,
      params: driver === "pg" ? [values] : values,
      nextIndex: startIndex + (driver === "pg" ? 1 : values.length),
    }),
    wrapId: (id: string) => (driver === "mysql" ? `\`${id}\`` : `"${id}"`),
  };
};

describe("transaction-scoped ORM locking helpers", () => {
  afterEach(() => {
    jest.resetModules();
    jest.restoreAllMocks();
  });

  test("pg transaction-bound finders emit FOR UPDATE SKIP LOCKED", async () => {
    const txAdapter = makeSqlAdapter("pg_test", "pg");

    jest.doMock("../core/connection/ConnectionFactory", () => ({
      getAdapter: jest.fn(async () => {
        throw new Error("global adapter should not be used");
      }),
      getConnection: jest.fn(),
    }));

    const { SqlModel } = await import("../core/model/BaseModel.js");
    const { column } = await import("../core/schema/SchemaBlueprint.js");

    class Appointment extends SqlModel {
      static schema = {
        id: column("int"),
        practitioner_id: column("int"),
        appointment_date: column("string"),
      };

      constructor() {
        super();
        this.tableName = "appointments";
        this.connectionName = "pg_test" as never;
      }
    }

    const tx = {
      ...txAdapter,
      connectionName: "pg_test" as const,
      driver: "pg" as const,
    } as unknown as TransactionContext;

    await Appointment.useTransaction(tx)
      .where("practitioner_id", 18)
      .orderBy("appointment_date")
      .limit(5)
      .forUpdate()
      .skipLocked()
      .get();

    expect(txAdapter.query).toHaveBeenCalledWith(
      'SELECT * FROM "appointments" WHERE "practitioner_id" = $1 ORDER BY "appointment_date" ASC LIMIT 5 FOR UPDATE SKIP LOCKED',
      [18],
    );
  });

  test("mysql transaction-bound finders emit FOR SHARE", async () => {
    const txAdapter = makeSqlAdapter("mysql_test", "mysql");

    jest.doMock("../core/connection/ConnectionFactory", () => ({
      getAdapter: jest.fn(async () => {
        throw new Error("global adapter should not be used");
      }),
      getConnection: jest.fn(),
    }));

    const { SqlModel } = await import("../core/model/BaseModel.js");
    const { column } = await import("../core/schema/SchemaBlueprint.js");

    class InventoryItem extends SqlModel {
      static schema = {
        id: column("int"),
        status: column("string"),
      };

      constructor() {
        super();
        this.tableName = "inventory_items";
        this.connectionName = "mysql_test" as never;
      }
    }

    const tx = {
      ...txAdapter,
      connectionName: "mysql_test" as const,
      driver: "mysql" as const,
    } as unknown as TransactionContext;

    await InventoryItem.useTransaction(tx)
      .where("status", "active")
      .forShare()
      .first();

    expect(txAdapter.queryOne).toHaveBeenCalledWith(
      "SELECT * FROM `inventory_items` WHERE `status` = ? LIMIT 1 FOR SHARE",
      ["active"],
    );
  });

  test("forUpdate rejects non-transaction queries", async () => {
    const { SqlModel } = await import("../core/model/BaseModel.js");
    const { column } = await import("../core/schema/SchemaBlueprint.js");

    class Appointment extends SqlModel {
      static schema = {
        id: column("int"),
        practitioner_id: column("int"),
      };

      constructor() {
        super();
        this.tableName = "appointments";
        this.connectionName = "pg_test" as never;
      }
    }

    expect(() => Appointment.where("practitioner_id", 9).forUpdate()).toThrow(
      "forUpdate() requires an active SQL transaction.",
    );
  });

  test("skipLocked requires an explicit lock mode first", async () => {
    const txAdapter = makeSqlAdapter("pg_test", "pg");

    const { SqlModel } = await import("../core/model/BaseModel.js");
    const { column } = await import("../core/schema/SchemaBlueprint.js");

    class Appointment extends SqlModel {
      static schema = {
        id: column("int"),
        practitioner_id: column("int"),
      };

      constructor() {
        super();
        this.tableName = "appointments";
        this.connectionName = "pg_test" as never;
      }
    }

    const tx = {
      ...txAdapter,
      connectionName: "pg_test" as const,
      driver: "pg" as const,
    } as unknown as TransactionContext;

    expect(() =>
      Appointment.useTransaction(tx).where("practitioner_id", 9).skipLocked()
    ).toThrow("skipLocked() requires forUpdate() or forShare() first.");
  });

  test("conflicting lock modes fail fast", async () => {
    const txAdapter = makeSqlAdapter("pg_test", "pg");

    const { SqlModel } = await import("../core/model/BaseModel.js");
    const { column } = await import("../core/schema/SchemaBlueprint.js");

    class Appointment extends SqlModel {
      static schema = {
        id: column("int"),
        practitioner_id: column("int"),
      };

      constructor() {
        super();
        this.tableName = "appointments";
        this.connectionName = "pg_test" as never;
      }
    }

    const tx = {
      ...txAdapter,
      connectionName: "pg_test" as const,
      driver: "pg" as const,
    } as unknown as TransactionContext;

    expect(() =>
      Appointment.useTransaction(tx)
        .where("practitioner_id", 9)
        .forShare()
        .forUpdate()
    ).toThrow("forUpdate() cannot be combined with forShare().");
  });

  test("sqlite and mongo finders reject row-lock helpers", async () => {
    const sqliteAdapter = makeSqlAdapter("sqlite_test", "sqlite");

    const { SqlModel, MongoModel } = await import("../core/model/BaseModel.js");
    const { column } = await import("../core/schema/SchemaBlueprint.js");

    class SqliteAppointment extends SqlModel {
      static schema = {
        id: column("int"),
      };

      constructor() {
        super();
        this.tableName = "appointments";
        this.connectionName = "sqlite_test" as never;
      }
    }

    class Wallet extends MongoModel {
      static schema = {
        id: column("string"),
        user_id: column("string"),
      };

      constructor() {
        super("wallets", "mongo_test" as never);
      }
    }

    const sqliteTx = {
      ...sqliteAdapter,
      connectionName: "sqlite_test" as const,
      driver: "sqlite" as const,
    } as unknown as TransactionContext;

    const mongoTx = {
      connectionName: "mongo_test" as const,
      driver: "mongo" as const,
      db: { collection: jest.fn() } as never,
      session: { id: "mongo-session" } as never,
      collection: jest.fn(),
    } as unknown as TransactionContext;

    expect(() => SqliteAppointment.useTransaction(sqliteTx).where("id", 1).forUpdate()).toThrow(
      "forUpdate() is not supported for sqlite finders.",
    );

    expect(() => Wallet.useTransaction(mongoTx).where("user_id", "u1").forUpdate()).toThrow(
      "forUpdate() is not supported for mongo finders.",
    );
  });
});

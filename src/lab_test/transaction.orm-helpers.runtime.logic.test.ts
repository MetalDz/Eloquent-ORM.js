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

const makeSqlAdapter = (name: DriverAdapter["name"]): MockAdapter => {
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
    placeholder: (index: number) => `$${index}`,
    placeholders: (count: number, startIndex = 1) =>
      Array.from({ length: count }, (_, idx) => `$${startIndex + idx}`).join(", "),
    inClause: (field: string, values: unknown[], startIndex = 1) => ({
      sql: `${field} = ANY($${startIndex})`,
      params: [values],
      nextIndex: startIndex + 1,
    }),
    wrapId: (id: string) => `"${id}"`,
  };
};

describe("transaction-scoped ORM helper runtime", () => {
  afterEach(() => {
    jest.resetModules();
    jest.restoreAllMocks();
  });

  test("static useTransaction scopes SQL finder reads and hydrated save() calls to the provided tx", async () => {
    const txAdapter = makeSqlAdapter("pg_test");
    txAdapter.queryOne.mockResolvedValue({
      id: 7,
      practitioner_id: 18,
      appointment_date: "2026-04-12",
    });

    const getAdapter = jest.fn(async () => {
      throw new Error("global adapter should not be used");
    });

    jest.doMock("../core/connection/ConnectionFactory", () => ({
      getAdapter,
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

    const found = await Appointment.useTransaction(tx).where("practitioner_id", 18).first();

    expect(found).toBeInstanceOf(Appointment);
    expect(txAdapter.queryOne).toHaveBeenCalledWith(
      expect.stringContaining(
        'SELECT * FROM "appointments" WHERE "practitioner_id" = $1 LIMIT 1'
      ),
      [18],
    );
    expect(getAdapter).not.toHaveBeenCalled();

    expect(found).not.toBeNull();
    (found as Appointment & { practitioner_id: number }).practitioner_id = 22;
    await found!.save();

    expect(txAdapter.execute).toHaveBeenCalledWith(
      expect.stringContaining(
        'UPDATE "appointments" SET "practitioner_id" = $1 WHERE "id" = $2'
      ),
      [22, 7],
    );
  });

  test("useTransaction scopes SQL create() to the provided tx and rejects mismatched connections", async () => {
    const txAdapter = makeSqlAdapter("pg_test");
    txAdapter.insert.mockResolvedValue({
      id: 11,
      row: { id: 11, practitioner_id: 9, appointment_date: "2026-04-13" },
    });

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

    const created = await Appointment.useTransaction(tx).create({
      practitioner_id: 9,
      appointment_date: "2026-04-13",
    });

    expect(created).toBeInstanceOf(Appointment);
    expect(txAdapter.insert).toHaveBeenCalledWith(
      expect.stringContaining(
        'INSERT INTO "appointments" ("practitioner_id", "appointment_date") VALUES ($1, $2)'
      ),
      [9, "2026-04-13"],
    );

    const mismatchedTx = {
      ...txAdapter,
      connectionName: "mysql_test" as const,
      driver: "pg" as const,
    } as unknown as TransactionContext;

    expect(() => Appointment.useTransaction(mismatchedTx)).toThrow(
      "Cannot bind transaction for connection 'mysql_test'",
    );
  });

  test("useTransaction scopes Mongo finder/create/save calls to the active session", async () => {
    type MockCursor = {
      sort: jest.Mock<MockCursor, [Record<string, 1 | -1>]>;
      limit: jest.Mock<MockCursor, [number]>;
      toArray: jest.Mock<Promise<Array<Record<string, unknown>>>, []>;
    };

    const cursor = {} as MockCursor;
    cursor.sort = jest.fn((_order: Record<string, 1 | -1>) => cursor);
    cursor.limit = jest.fn((_count: number) => cursor);
    cursor.toArray = jest.fn(async () => [{ id: "w1", user_id: "u1", balance_minor: 0 }]);

    const collection = {
      find: jest.fn(() => cursor),
      insertOne: jest.fn(async (_doc: unknown, _options?: unknown) => ({
        insertedId: "w2",
      })),
      updateOne: jest.fn(async () => ({ acknowledged: true })),
    };

    const db = {
      collection: jest.fn(() => collection),
    };
    const session = { id: "mongo-session" };

    jest.doMock("../core/connection/ConnectionFactory", () => ({
      getAdapter: jest.fn(),
      getConnection: jest.fn(async () => {
        throw new Error("global mongo connection should not be used");
      }),
    }));

    const { MongoModel } = await import("../core/model/BaseModel.js");
    const { column } = await import("../core/schema/SchemaBlueprint.js");

    class Wallet extends MongoModel {
      static schema = {
        id: column("string"),
        user_id: column("string"),
        balance_minor: column("int"),
      };

      constructor() {
        super("wallets", "mongo_test" as never);
      }
    }

    const tx = {
      connectionName: "mongo_test" as const,
      driver: "mongo" as const,
      db: db as never,
      session: session as never,
      collection: jest.fn(() => collection),
    } as unknown as TransactionContext;

    const found = await Wallet.useTransaction(tx).where("user_id", "u1").first();

    expect(collection.find).toHaveBeenCalledWith({ user_id: "u1" }, { session });
    expect(found).toBeInstanceOf(Wallet);

    expect(found).not.toBeNull();
    (found as Wallet & { balance_minor: number }).balance_minor = 500;
    await found!.save();

    expect(collection.updateOne).toHaveBeenCalledWith(
      {
        $or: [{ id: "w1" }, { _id: "w1" }],
      },
      { $set: { balance_minor: 500 } },
      { session },
    );

    const created = await Wallet.useTransaction(tx).create({
      user_id: "u2",
      balance_minor: 0,
    });

    expect(created).toBeInstanceOf(Wallet);
    expect(collection.insertOne).toHaveBeenCalledWith(
      { user_id: "u2", balance_minor: 0 },
      { session },
    );
  });
});

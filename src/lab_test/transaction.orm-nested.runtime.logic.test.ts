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

describe("transaction-scoped ORM nested helper semantics", () => {
  afterEach(() => {
    jest.resetModules();
    jest.restoreAllMocks();
  });

  test("rebinding the same instance to the same transaction is a no-op", async () => {
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
      };

      constructor() {
        super();
        this.tableName = "appointments";
        this.connectionName = "pg_test" as never;
      }
    }

    const tx = {
      ...makeSqlAdapter("pg_test"),
      connectionName: "pg_test" as const,
      driver: "pg" as const,
    } as unknown as TransactionContext;

    const bound = Appointment.useTransaction(tx);
    const rebound = bound.useTransaction(tx);

    expect(rebound).toBe(bound);
    expect(rebound.getTransactionContext()).toBe(tx);
  });

  test("rebinding a transaction-bound model to a different transaction on the same connection fails fast", async () => {
    jest.doMock("../core/connection/ConnectionFactory", () => ({
      getAdapter: jest.fn(),
      getConnection: jest.fn(),
    }));

    const { SqlModel } = await import("../core/model/BaseModel.js");
    const { column } = await import("../core/schema/SchemaBlueprint.js");

    class Appointment extends SqlModel {
      static schema = {
        id: column("int"),
      };

      constructor() {
        super();
        this.tableName = "appointments";
        this.connectionName = "pg_test" as never;
      }
    }

    const txA = {
      ...makeSqlAdapter("pg_test"),
      connectionName: "pg_test" as const,
      driver: "pg" as const,
    } as unknown as TransactionContext;

    const txB = {
      ...makeSqlAdapter("pg_test"),
      connectionName: "pg_test" as const,
      driver: "pg" as const,
    } as unknown as TransactionContext;

    const bound = Appointment.useTransaction(txA);

    expect(() => bound.useTransaction(txB)).toThrow(
      "Cannot rebind model 'Appointment' from one active transaction to another on connection 'pg_test'.",
    );
    expect(bound.getTransactionContext()).toBe(txA);
  });

  test("hydrated transaction-bound records keep the same transaction on nested helper reuse and never fall back to the global adapter", async () => {
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

    expect(found).not.toBeNull();
    expect(found!.getTransactionContext()).toBe(tx);

    const rebound = found!.useTransaction(tx);
    expect(rebound).toBe(found);
    expect(rebound.getTransactionContext()).toBe(tx);

    (rebound as Appointment & { practitioner_id: number }).practitioner_id = 22;
    await rebound.save();

    expect(txAdapter.execute).toHaveBeenCalledWith(
      expect.stringContaining(
        'UPDATE "appointments" SET "practitioner_id" = $1 WHERE "id" = $2'
      ),
      [22, 7],
    );
    expect(getAdapter).not.toHaveBeenCalled();
  });
});

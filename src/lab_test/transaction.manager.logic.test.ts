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

const makeAdapter = (name: DriverAdapter["name"]): MockAdapter => {
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
      sql: `${field} IN (${values.map(() => "?").join(", ")})`,
      params: values,
      nextIndex: startIndex + values.length,
    }),
    wrapId: (id: string) => id,
  };
};

describe("TransactionManager runtime", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    jest.resetModules();
  });

  test("transaction commits mysql work on a pooled connection", async () => {
    const adapter = makeAdapter("mysql_test");
    const pooledConnection = {
      beginTransaction: jest.fn(async () => undefined),
      commit: jest.fn(async () => undefined),
      rollback: jest.fn(async () => undefined),
      release: jest.fn(() => undefined),
      query: jest.fn(async () => [[], []]),
    };
    const pool = {
      getConnection: jest.fn(async () => pooledConnection),
    };
    const getConnection = jest.fn(async () => pool);
    const connectDB = jest.fn();
    const getMongoClient = jest.fn();
    const createAdapter = jest.fn(() => adapter);

    jest.doMock("../core/connection/ConnectionFactory", () => ({
      getConnection,
    }));
    jest.doMock("../core/connection/DatabaseConnection", () => ({
      connectDB,
      getMongoClient,
    }));
    jest.doMock("../core/connection/DriverAdapter", () => ({
      createAdapter,
    }));

    const { transaction } = await import("../core/connection/TransactionManager.js");

    const result = await transaction("mysql_test" as never, async (ctx) => {
      if (ctx.driver === "mongo") {
        throw new Error("expected SQL transaction context");
      }
      expect(ctx.connectionName).toBe("mysql_test");
      expect(ctx.driver).toBe("mysql");
      await ctx.execute("DELETE FROM users WHERE id = ?", [1]);
      return "committed";
    });

    expect(result).toBe("committed");
    expect(getConnection).toHaveBeenCalledWith("mysql_test");
    expect(pool.getConnection).toHaveBeenCalledTimes(1);
    expect(createAdapter).toHaveBeenCalledWith("mysql_test", pooledConnection);
    expect(pooledConnection.beginTransaction).toHaveBeenCalledTimes(1);
    expect(adapter.execute).toHaveBeenCalledWith("DELETE FROM users WHERE id = ?", [1]);
    expect(pooledConnection.commit).toHaveBeenCalledTimes(1);
    expect(pooledConnection.rollback).not.toHaveBeenCalled();
    expect(pooledConnection.release).toHaveBeenCalledTimes(1);
  });

  test("transaction rolls back mysql work when the callback fails and tolerates missing release", async () => {
    const adapter = makeAdapter("mysql_test");
    const pooledConnection = {
      beginTransaction: jest.fn(async () => undefined),
      commit: jest.fn(async () => undefined),
      rollback: jest.fn(async () => undefined),
      query: jest.fn(async () => [[], []]),
    };
    const pool = {
      getConnection: jest.fn(async () => pooledConnection),
    };

    jest.doMock("../core/connection/ConnectionFactory", () => ({
      getConnection: jest.fn(async () => pool),
    }));
    jest.doMock("../core/connection/DatabaseConnection", () => ({
      connectDB: jest.fn(),
      getMongoClient: jest.fn(),
    }));
    jest.doMock("../core/connection/DriverAdapter", () => ({
      createAdapter: jest.fn(() => adapter),
    }));

    const { transaction } = await import("../core/connection/TransactionManager.js");

    await expect(
      transaction("mysql_test" as never, async () => {
        throw new Error("mysql boom");
      }),
    ).rejects.toThrow("mysql boom");

    expect(pooledConnection.beginTransaction).toHaveBeenCalledTimes(1);
    expect(pooledConnection.rollback).toHaveBeenCalledTimes(1);
    expect(pooledConnection.commit).not.toHaveBeenCalled();
  });

  test("transaction preserves the original mysql error when rollback also fails", async () => {
    const pooledConnection = {
      beginTransaction: jest.fn(async () => undefined),
      commit: jest.fn(async () => undefined),
      rollback: jest.fn(async () => {
        throw new Error("mysql rollback failed");
      }),
      query: jest.fn(async () => [[], []]),
    };
    const pool = {
      getConnection: jest.fn(async () => pooledConnection),
    };

    jest.doMock("../core/connection/ConnectionFactory", () => ({
      getConnection: jest.fn(async () => pool),
    }));
    jest.doMock("../core/connection/DatabaseConnection", () => ({
      connectDB: jest.fn(),
      getMongoClient: jest.fn(),
    }));
    jest.doMock("../core/connection/DriverAdapter", () => ({
      createAdapter: jest.fn(() => makeAdapter("mysql_test")),
    }));

    const { transaction } = await import("../core/connection/TransactionManager.js");

    await expect(
      transaction("mysql_test" as never, async () => {
        throw new Error("mysql original boom");
      }),
    ).rejects.toThrow("mysql original boom");

    expect(pooledConnection.rollback).toHaveBeenCalledTimes(1);
  });

  test("transaction commits pg work and closes the dedicated connection", async () => {
    const adapter = makeAdapter("pg_test");
    const connection = {
      query: jest.fn(async () => ({ rows: [] })),
      end: jest.fn(async () => undefined),
    };

    jest.doMock("../core/connection/ConnectionFactory", () => ({
      getConnection: jest.fn(),
    }));
    jest.doMock("../core/connection/DatabaseConnection", () => ({
      connectDB: jest.fn(async () => connection),
      getMongoClient: jest.fn(),
    }));
    jest.doMock("../core/connection/DriverAdapter", () => ({
      createAdapter: jest.fn(() => adapter),
    }));

    const { transaction } = await import("../core/connection/TransactionManager.js");

    const result = await transaction("pg_test" as never, async (ctx) => {
      if (ctx.driver === "mongo") {
        throw new Error("expected SQL transaction context");
      }
      expect(ctx.driver).toBe("pg");
      await ctx.query("SELECT 1", []);
      return "pg-ok";
    });

    expect(result).toBe("pg-ok");
    expect(connection.query).toHaveBeenNthCalledWith(1, "BEGIN");
    expect(adapter.query).toHaveBeenCalledWith("SELECT 1", []);
    expect(connection.query).toHaveBeenNthCalledWith(2, "COMMIT");
    expect(connection.end).toHaveBeenCalledTimes(1);
  });

  test("transaction rolls back pg work on failure and tolerates connections without end()", async () => {
    const adapter = makeAdapter("pg_test");
    const connection = {
      query: jest.fn(async () => ({ rows: [] })),
    };

    jest.doMock("../core/connection/ConnectionFactory", () => ({
      getConnection: jest.fn(),
    }));
    jest.doMock("../core/connection/DatabaseConnection", () => ({
      connectDB: jest.fn(async () => connection),
      getMongoClient: jest.fn(),
    }));
    jest.doMock("../core/connection/DriverAdapter", () => ({
      createAdapter: jest.fn(() => adapter),
    }));

    const { transaction } = await import("../core/connection/TransactionManager.js");

    await expect(
      transaction("pg_test" as never, async () => {
        throw new Error("pg boom");
      }),
    ).rejects.toThrow("pg boom");

    expect(connection.query).toHaveBeenNthCalledWith(1, "BEGIN");
    expect(connection.query).toHaveBeenNthCalledWith(2, "ROLLBACK");
  });

  test("transaction preserves the original pg error when rollback also fails", async () => {
    const connection = {
      query: jest
        .fn()
        .mockResolvedValueOnce({ rows: [] })
        .mockRejectedValueOnce(new Error("pg rollback failed")),
      end: jest.fn(async () => undefined),
    };

    jest.doMock("../core/connection/ConnectionFactory", () => ({
      getConnection: jest.fn(),
    }));
    jest.doMock("../core/connection/DatabaseConnection", () => ({
      connectDB: jest.fn(async () => connection),
      getMongoClient: jest.fn(),
    }));
    jest.doMock("../core/connection/DriverAdapter", () => ({
      createAdapter: jest.fn(() => makeAdapter("pg_test")),
    }));

    const { transaction } = await import("../core/connection/TransactionManager.js");

    await expect(
      transaction("pg_test" as never, async () => {
        throw new Error("pg original boom");
      }),
    ).rejects.toThrow("pg original boom");

    expect(connection.end).toHaveBeenCalledTimes(1);
  });

  test("transaction supports sqlite deferred, exclusive, and default immediate modes", async () => {
    const adapter = makeAdapter("sqlite_test");
    const connection = {
      exec: jest.fn(async () => undefined),
    };

    jest.doMock("../core/connection/ConnectionFactory", () => ({
      getConnection: jest.fn(async () => connection),
    }));
    jest.doMock("../core/connection/DatabaseConnection", () => ({
      connectDB: jest.fn(),
      getMongoClient: jest.fn(),
    }));
    jest.doMock("../core/connection/DriverAdapter", () => ({
      createAdapter: jest.fn(() => adapter),
    }));

    const { transaction } = await import("../core/connection/TransactionManager.js");

    await transaction("sqlite_test" as never, async (ctx) => {
      expect(ctx.driver).toBe("sqlite");
      return undefined;
    }, { sqliteMode: "deferred" });
    await transaction("sqlite_test" as never, async () => undefined, {
      sqliteMode: "exclusive",
    });
    await transaction("sqlite_test" as never, async () => undefined);

    expect(connection.exec).toHaveBeenNthCalledWith(1, "BEGIN;");
    expect(connection.exec).toHaveBeenNthCalledWith(2, "COMMIT;");
    expect(connection.exec).toHaveBeenNthCalledWith(3, "BEGIN EXCLUSIVE;");
    expect(connection.exec).toHaveBeenNthCalledWith(4, "COMMIT;");
    expect(connection.exec).toHaveBeenNthCalledWith(5, "BEGIN IMMEDIATE;");
    expect(connection.exec).toHaveBeenNthCalledWith(6, "COMMIT;");
  });

  test("transaction rolls back sqlite work on failure", async () => {
    const adapter = makeAdapter("sqlite_test");
    const connection = {
      exec: jest.fn(async () => undefined),
    };

    jest.doMock("../core/connection/ConnectionFactory", () => ({
      getConnection: jest.fn(async () => connection),
    }));
    jest.doMock("../core/connection/DatabaseConnection", () => ({
      connectDB: jest.fn(),
      getMongoClient: jest.fn(),
    }));
    jest.doMock("../core/connection/DriverAdapter", () => ({
      createAdapter: jest.fn(() => adapter),
    }));

    const { transaction } = await import("../core/connection/TransactionManager.js");

    await expect(
      transaction("sqlite_test" as never, async () => {
        throw new Error("sqlite boom");
      }),
    ).rejects.toThrow("sqlite boom");

    expect(connection.exec).toHaveBeenNthCalledWith(1, "BEGIN IMMEDIATE;");
    expect(connection.exec).toHaveBeenNthCalledWith(2, "ROLLBACK;");
  });

  test("transaction preserves the original sqlite error when rollback also fails", async () => {
    const connection = {
      exec: jest
        .fn()
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error("sqlite rollback failed")),
    };

    jest.doMock("../core/connection/ConnectionFactory", () => ({
      getConnection: jest.fn(async () => connection),
    }));
    jest.doMock("../core/connection/DatabaseConnection", () => ({
      connectDB: jest.fn(),
      getMongoClient: jest.fn(),
    }));
    jest.doMock("../core/connection/DriverAdapter", () => ({
      createAdapter: jest.fn(() => makeAdapter("sqlite_test")),
    }));

    const { transaction } = await import("../core/connection/TransactionManager.js");

    await expect(
      transaction("sqlite_test" as never, async () => {
        throw new Error("sqlite original boom");
      }),
    ).rejects.toThrow("sqlite original boom");
  });

  test("transaction exposes mongo db and session context", async () => {
    const usersCollection = { name: "users" };
    const db = {
      collection: jest.fn(() => usersCollection),
    };
    const session = {
      withTransaction: jest.fn(async (work: () => Promise<string>, options: unknown) => {
        expect(options).toEqual({ maxCommitTimeMS: 5000 });
        return await work();
      }),
      endSession: jest.fn(async () => undefined),
    };
    const client = {
      startSession: jest.fn(() => session),
    };

    jest.doMock("../core/connection/ConnectionFactory", () => ({
      getConnection: jest.fn(async () => db),
    }));
    jest.doMock("../core/connection/DatabaseConnection", () => ({
      connectDB: jest.fn(),
      getMongoClient: jest.fn(() => client),
    }));
    jest.doMock("../core/connection/DriverAdapter", () => ({
      createAdapter: jest.fn(),
    }));

    const { transaction } = await import("../core/connection/TransactionManager.js");

    const result = await transaction(
      "mongo" as never,
      async (ctx) => {
        if (ctx.driver !== "mongo") {
          throw new Error("expected Mongo transaction context");
        }
        expect(ctx.driver).toBe("mongo");
        expect(ctx.collection("users")).toBe(usersCollection);
        expect(ctx.session).toBe(session);
        return "mongo-ok";
      },
      { mongo: { maxCommitTimeMS: 5000 } },
    );

    expect(result).toBe("mongo-ok");
    expect(client.startSession).toHaveBeenCalledTimes(1);
    expect(session.withTransaction).toHaveBeenCalledTimes(1);
    expect(session.endSession).toHaveBeenCalledTimes(1);
  });

  test("transaction rejects mongo work when no tracked MongoClient is available", async () => {
    jest.doMock("../core/connection/ConnectionFactory", () => ({
      getConnection: jest.fn(async () => ({ collection: jest.fn() })),
    }));
    jest.doMock("../core/connection/DatabaseConnection", () => ({
      connectDB: jest.fn(),
      getMongoClient: jest.fn(() => null),
    }));
    jest.doMock("../core/connection/DriverAdapter", () => ({
      createAdapter: jest.fn(),
    }));

    const { transaction } = await import("../core/connection/TransactionManager.js");

    await expect(
      transaction("mongo" as never, async () => "never"),
    ).rejects.toThrow('Mongo transaction support requires a tracked MongoClient');
  });

  test("lockedTransaction commits pg work inside an advisory lock", async () => {
    const adapter = makeAdapter("pg_test");
    const connection = {
      query: jest.fn(async () => ({ rows: [] })),
      end: jest.fn(async () => undefined),
    };

    jest.doMock("../core/connection/ConnectionFactory", () => ({
      getConnection: jest.fn(),
    }));
    jest.doMock("../core/connection/DatabaseConnection", () => ({
      connectDB: jest.fn(async () => connection),
      getMongoClient: jest.fn(),
    }));
    jest.doMock("../core/connection/DriverAdapter", () => ({
      createAdapter: jest.fn(() => adapter),
    }));

    const { lockedTransaction } = await import("../core/connection/TransactionManager.js");

    const result = await lockedTransaction("pg_test" as never, "appointments:slot:1", async () => {
      return "locked-pg";
    });

    expect(result).toBe("locked-pg");
    expect(connection.query).toHaveBeenNthCalledWith(1, "BEGIN");
    expect(connection.query).toHaveBeenNthCalledWith(
      2,
      "SELECT pg_advisory_xact_lock(hashtext($1))",
      ["appointments:slot:1"],
    );
    expect(connection.query).toHaveBeenNthCalledWith(3, "COMMIT");
    expect(connection.end).toHaveBeenCalledTimes(1);
  });

  test("lockedTransaction rolls back pg work on failure", async () => {
    const adapter = makeAdapter("pg_test");
    const connection = {
      query: jest.fn(async () => ({ rows: [] })),
    };

    jest.doMock("../core/connection/ConnectionFactory", () => ({
      getConnection: jest.fn(),
    }));
    jest.doMock("../core/connection/DatabaseConnection", () => ({
      connectDB: jest.fn(async () => connection),
      getMongoClient: jest.fn(),
    }));
    jest.doMock("../core/connection/DriverAdapter", () => ({
      createAdapter: jest.fn(() => adapter),
    }));

    const { lockedTransaction } = await import("../core/connection/TransactionManager.js");

    await expect(
      lockedTransaction("pg_test" as never, "appointments:slot:2", async () => {
        throw new Error("locked pg boom");
      }),
    ).rejects.toThrow("locked pg boom");

    expect(connection.query).toHaveBeenNthCalledWith(1, "BEGIN");
    expect(connection.query).toHaveBeenNthCalledWith(
      2,
      "SELECT pg_advisory_xact_lock(hashtext($1))",
      ["appointments:slot:2"],
    );
    expect(connection.query).toHaveBeenNthCalledWith(3, "ROLLBACK");
  });

  test("lockedTransaction commits mysql work after acquiring a named lock", async () => {
    const adapter = makeAdapter("mysql_test");
    const pooledConnection = {
      beginTransaction: jest.fn(async () => undefined),
      commit: jest.fn(async () => undefined),
      rollback: jest.fn(async () => undefined),
      release: jest.fn(() => undefined),
      query: jest
        .fn()
        .mockResolvedValueOnce([[{ lock_status: 1 }]])
        .mockResolvedValueOnce([[]]),
    };
    const pool = {
      getConnection: jest.fn(async () => pooledConnection),
    };

    jest.doMock("../core/connection/ConnectionFactory", () => ({
      getConnection: jest.fn(async () => pool),
    }));
    jest.doMock("../core/connection/DatabaseConnection", () => ({
      connectDB: jest.fn(),
      getMongoClient: jest.fn(),
    }));
    jest.doMock("../core/connection/DriverAdapter", () => ({
      createAdapter: jest.fn(() => adapter),
    }));

    const { lockedTransaction } = await import("../core/connection/TransactionManager.js");

    const result = await lockedTransaction("mysql_test" as never, "pharmacy:stock:1", async () => {
      return "locked-mysql";
    });

    expect(result).toBe("locked-mysql");
    expect(pooledConnection.query).toHaveBeenNthCalledWith(
      1,
      "SELECT GET_LOCK(?, ?) AS lock_status",
      ["pharmacy:stock:1", 10],
    );
    expect(pooledConnection.beginTransaction).toHaveBeenCalledTimes(1);
    expect(pooledConnection.commit).toHaveBeenCalledTimes(1);
    expect(pooledConnection.query).toHaveBeenNthCalledWith(
      2,
      "SELECT RELEASE_LOCK(?)",
      ["pharmacy:stock:1"],
    );
    expect(pooledConnection.release).toHaveBeenCalledTimes(1);
  });

  test("lockedTransaction swallows mysql unlock cleanup failures after a successful commit", async () => {
    const pooledConnection = {
      beginTransaction: jest.fn(async () => undefined),
      commit: jest.fn(async () => undefined),
      rollback: jest.fn(async () => undefined),
      release: jest.fn(() => undefined),
      query: jest
        .fn()
        .mockResolvedValueOnce([[{ lock_status: 1 }]])
        .mockRejectedValueOnce(new Error("release lock failed")),
    };
    const pool = {
      getConnection: jest.fn(async () => pooledConnection),
    };

    jest.doMock("../core/connection/ConnectionFactory", () => ({
      getConnection: jest.fn(async () => pool),
    }));
    jest.doMock("../core/connection/DatabaseConnection", () => ({
      connectDB: jest.fn(),
      getMongoClient: jest.fn(),
    }));
    jest.doMock("../core/connection/DriverAdapter", () => ({
      createAdapter: jest.fn(() => makeAdapter("mysql_test")),
    }));

    const { lockedTransaction } = await import("../core/connection/TransactionManager.js");

    await expect(
      lockedTransaction("mysql_test" as never, "pharmacy:stock:cleanup", async () => "ok"),
    ).resolves.toBe("ok");

    expect(pooledConnection.commit).toHaveBeenCalledTimes(1);
    expect(pooledConnection.release).toHaveBeenCalledTimes(1);
  });

  test("lockedTransaction rejects mysql work when the named lock cannot be acquired", async () => {
    const adapter = makeAdapter("mysql_test");
    const pooledConnection = {
      beginTransaction: jest.fn(async () => undefined),
      commit: jest.fn(async () => undefined),
      rollback: jest.fn(async () => undefined),
      release: jest.fn(() => undefined),
      query: jest
        .fn()
        .mockResolvedValueOnce([[{}]])
        .mockResolvedValueOnce([[]]),
    };
    const pool = {
      getConnection: jest.fn(async () => pooledConnection),
    };

    jest.doMock("../core/connection/ConnectionFactory", () => ({
      getConnection: jest.fn(async () => pool),
    }));
    jest.doMock("../core/connection/DatabaseConnection", () => ({
      connectDB: jest.fn(),
      getMongoClient: jest.fn(),
    }));
    jest.doMock("../core/connection/DriverAdapter", () => ({
      createAdapter: jest.fn(() => adapter),
    }));

    const { lockedTransaction } = await import("../core/connection/TransactionManager.js");

    await expect(
      lockedTransaction("mysql_test" as never, "pharmacy:stock:2", async () => {
        throw new Error("should not run");
      }, { timeoutSeconds: 3 }),
    ).rejects.toThrow("Failed to acquire MySQL named lock for key: pharmacy:stock:2");

    expect(pooledConnection.query).toHaveBeenNthCalledWith(
      1,
      "SELECT GET_LOCK(?, ?) AS lock_status",
      ["pharmacy:stock:2", 3],
    );
    expect(pooledConnection.rollback).toHaveBeenCalledTimes(1);
    expect(pooledConnection.query).toHaveBeenNthCalledWith(
      2,
      "SELECT RELEASE_LOCK(?)",
      ["pharmacy:stock:2"],
    );
  });

  test("lockedTransaction rejects mysql work when GET_LOCK returns a non-array payload", async () => {
    const pooledConnection = {
      beginTransaction: jest.fn(async () => undefined),
      commit: jest.fn(async () => undefined),
      rollback: jest.fn(async () => undefined),
      release: jest.fn(() => undefined),
      query: jest
        .fn()
        .mockResolvedValueOnce({ not: "an-array" })
        .mockResolvedValueOnce([[]]),
    };
    const pool = {
      getConnection: jest.fn(async () => pooledConnection),
    };

    jest.doMock("../core/connection/ConnectionFactory", () => ({
      getConnection: jest.fn(async () => pool),
    }));
    jest.doMock("../core/connection/DatabaseConnection", () => ({
      connectDB: jest.fn(),
      getMongoClient: jest.fn(),
    }));
    jest.doMock("../core/connection/DriverAdapter", () => ({
      createAdapter: jest.fn(() => makeAdapter("mysql_test")),
    }));

    const { lockedTransaction } = await import("../core/connection/TransactionManager.js");

    await expect(
      lockedTransaction("mysql_test" as never, "pharmacy:stock:shape", async () => "never"),
    ).rejects.toThrow("Failed to acquire MySQL named lock for key: pharmacy:stock:shape");

    expect(pooledConnection.beginTransaction).not.toHaveBeenCalled();
    expect(pooledConnection.rollback).toHaveBeenCalledTimes(1);
  });

  test("lockedTransaction rejects unsupported sqlite and unknown driver targets", async () => {
    const { lockedTransaction, transaction } = await import("../core/connection/TransactionManager.js");

    await expect(
      lockedTransaction("sqlite_test" as never, "unsupported", async () => "never"),
    ).rejects.toThrow("Native lockedTransaction() is supported only for mysql and pg connections.");

    await expect(
      transaction("missing_connection" as never, async () => "never"),
    ).rejects.toThrow("Unsupported transaction driver for connection: missing_connection");
  });
});

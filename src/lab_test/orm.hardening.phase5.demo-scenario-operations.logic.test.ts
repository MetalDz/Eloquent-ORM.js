import { dbConfig } from "../config/database";
import { demoScenario } from "../cli/commands/demoScenario";
import * as connectionFactory from "../core/connection/ConnectionFactory";
import * as scenarioMorphAliasRouting from "../cli/utils/ScenarioMorphAliasRouting";

jest.mock("chalk", () => ({
  __esModule: true,
  default: new Proxy(
    (value: unknown): string => String(value ?? ""),
    {
      get: () => (value: unknown): string => String(value ?? ""),
      apply: (_target, _thisArg, args: unknown[]) => String(args[0] ?? ""),
    }
  ),
}));

describe("ORM hardening phase 5 demoScenario operations", () => {
  const originalConnections = dbConfig.connections;

  beforeEach(() => {
    jest.restoreAllMocks();
    dbConfig.connections = { ...originalConnections };
    delete process.env.ELOQUENT_CLI;
    jest.spyOn(console, "log").mockImplementation(() => undefined);
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    dbConfig.connections = { ...originalConnections };
    delete process.env.ELOQUENT_CLI;
  });

  test("SQL random mode uses RANDOM() outside mysql and logs zero post comments without IN clause work", async () => {
    (dbConfig.connections as Record<string, { driver?: string }>).sqlite_test = {
      driver: "sqlite",
    };

    const queryOne = jest
      .fn()
      .mockResolvedValueOnce({ count: 5 })
      .mockResolvedValueOnce({ count: 15 })
      .mockResolvedValueOnce({ count: 35 })
      .mockResolvedValueOnce({ count: 10 })
      .mockResolvedValueOnce({ id: 7 })
      .mockResolvedValueOnce({ id: 7, name: "Alpha" });
    const query = jest
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 1 }])
      .mockResolvedValueOnce([]);
    const inClause = jest.fn();
    const adapter = {
      wrapId: (value: string) => `"${value}"`,
      placeholder: (index: number) => `?${index}`,
      queryOne,
      query,
      inClause,
    };

    jest.spyOn(scenarioMorphAliasRouting, "resolveScenarioMorphAliases").mockReturnValue({
      userMorph: "users",
      postMorph: "posts",
    });
    jest.spyOn(connectionFactory, "getAdapter").mockResolvedValue(adapter as never);
    jest
      .spyOn(connectionFactory, "closeAllConnections")
      .mockImplementation(async () => undefined);

    await demoScenario({
      test: true,
      connectionName: "sqlite_test",
      random: true,
    });

    expect(queryOne.mock.calls[4]?.[0]).toContain("ORDER BY RANDOM()");
    expect(inClause).not.toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith("comments on posts:", 0);
    expect(console.log).toHaveBeenCalledWith("favorite posts:", 0);
  });

  test("SQL path logs no-user message when the selected user record is missing", async () => {
    (dbConfig.connections as Record<string, { driver?: string }>).sqlite_test = {
      driver: "sqlite",
    };

    const queryOne = jest
      .fn()
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce(null);
    const adapter = {
      wrapId: (value: string) => `"${value}"`,
      placeholder: (index: number) => `?${index}`,
      queryOne,
      query: jest.fn(),
      inClause: jest.fn(),
    };

    jest.spyOn(connectionFactory, "getAdapter").mockResolvedValue(adapter as never);
    jest
      .spyOn(connectionFactory, "closeAllConnections")
      .mockImplementation(async () => undefined);

    await demoScenario({
      test: true,
      connectionName: "sqlite_test",
    });

    expect(adapter.query).not.toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith("\nNo users found to demonstrate relations.");
  });

  test("Mongo default mode uses findOne({}) and logs no-user message when the collection is empty", async () => {
    (dbConfig.connections as Record<string, { driver?: string }>).mongo_test = {
      driver: "mongo",
    };

    const usersCollection = {
      countDocuments: jest.fn(async () => 0),
      findOne: jest.fn(async () => null),
      aggregate: jest.fn(() => ({
        toArray: async () => [{ _id: "ignored" }],
      })),
    };
    const postsCollection = {
      countDocuments: jest.fn(async () => 0),
    };
    const commentsCollection = {
      countDocuments: jest.fn(async () => 0),
    };
    const pivotCollection = {
      countDocuments: jest.fn(async () => 0),
    };
    const db = {
      collection: jest.fn((name: string) => {
        if (name === "users") return usersCollection;
        if (name === "posts") return postsCollection;
        if (name === "comments") return commentsCollection;
        return pivotCollection;
      }),
    };

    jest.spyOn(connectionFactory, "getConnection").mockResolvedValue(db as never);
    jest
      .spyOn(connectionFactory, "closeAllConnections")
      .mockImplementation(async () => undefined);

    await demoScenario({
      test: true,
      connectionName: "mongo_test",
    });

    expect(usersCollection.findOne).toHaveBeenCalledWith({});
    expect(usersCollection.aggregate).not.toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith("\nNo users found to demonstrate relations.");
  });

  test("top-level failures are logged with the shared demoScenario error contract", async () => {
    (dbConfig.connections as Record<string, { driver?: string }>).sqlite_test = {
      driver: "sqlite",
    };

    jest
      .spyOn(connectionFactory, "getAdapter")
      .mockRejectedValue(new Error("phase5-demo-boom"));
    jest
      .spyOn(connectionFactory, "closeAllConnections")
      .mockImplementation(async () => undefined);

    await demoScenario({
      test: true,
      connectionName: "sqlite_test",
    });

    expect(console.error).toHaveBeenCalledWith("Demo scenario failed.");
    expect(console.error).toHaveBeenCalledWith("phase5-demo-boom");
  });

  test("CLI mode schedules process.exit(0) after demoScenario completes", async () => {
    jest.useFakeTimers();
    process.env.ELOQUENT_CLI = "true";
    (dbConfig.connections as Record<string, { driver?: string }>).sqlite_test = {
      driver: "sqlite",
    };

    const queryOne = jest
      .fn()
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce(null);
    const adapter = {
      wrapId: (value: string) => `"${value}"`,
      placeholder: (index: number) => `?${index}`,
      queryOne,
      query: jest.fn(),
      inClause: jest.fn(),
    };

    const exitSpy = jest
      .spyOn(process, "exit")
      .mockImplementation(((code?: number) => undefined) as never);
    jest.spyOn(connectionFactory, "getAdapter").mockResolvedValue(adapter as never);
    jest
      .spyOn(connectionFactory, "closeAllConnections")
      .mockImplementation(async () => undefined);

    await demoScenario({
      test: true,
      connectionName: "sqlite_test",
    });

    jest.runOnlyPendingTimers();
    expect(exitSpy).toHaveBeenCalledWith(0);
  });
});

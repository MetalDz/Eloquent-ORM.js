import fs from "fs";
import path from "path";

describe("LTS phase 5 demoScenario coverage", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    jest.resetModules();
    process.exitCode = 0;
    delete process.env.ELOQUENT_CLI;
  });

  test("plan tracks the dedicated demoScenario coverage slice", () => {
    const planPath = path.resolve(
      process.cwd(),
      "validation tasks/LTS-Phase5-DemoScenario-Coverage-Plan.md",
    );
    const content = fs.readFileSync(planPath, "utf8");

    expect(content).toContain("# LTS Phase 5 DemoScenario Coverage Plan");
    expect(content).toContain("Status: COMPLETED");
    expect(content).toContain("src/cli/commands/demoScenario.ts");
    expect(content).toContain("src/lab_test/lts.phase5.demo-scenario-coverage.logic.test.ts");
  });

  test("covers SQL explicit-user flow, string/zero count normalization, and post comment inClause lookup", async () => {
    jest.doMock("chalk", () => ({
      __esModule: true,
      default: {
        cyanBright: (value: string) => value,
        gray: (value: string) => value,
        yellow: (value: string) => value,
        red: (value: string) => value,
      },
    }));

    const queryOne = jest
      .fn()
      .mockResolvedValueOnce({ count: "5" })
      .mockResolvedValueOnce({ count: 2 })
      .mockResolvedValueOnce({ count: 7 })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ id: 42, name: "Alice" });

    const query = jest
      .fn()
      .mockResolvedValueOnce([
        { id: 101, title: "First" },
        { id: "bad-id", title: "Skip" },
        { title: "Missing" },
      ])
      .mockResolvedValueOnce([{ id: 201 }, { id: 202 }])
      .mockResolvedValueOnce([{ id: 301 }]);

    const inClause = jest.fn(() => ({
      sql: '"commentable_id IN (?)',
      params: [101],
      nextIndex: 2,
    }));

    const adapter = {
      wrapId: (value: string) => value,
      placeholder: (index: number) => `$${index}`,
      queryOne,
      query,
      inClause,
    };

    const getAdapter = jest.fn(async () => adapter);
    const closeAllConnections = jest.fn(async () => undefined);

    jest.doMock("../core/connection/ConnectionFactory", () => ({
      getAdapter,
      getConnection: jest.fn(),
      closeAllConnections,
    }));
    jest.doMock("../core/connection/resolveConnectionName", () => ({
      resolveConnectionName: jest.fn(() => "sqlite"),
    }));
    jest.doMock("../config/database", () => ({
      dbConfig: {
        connections: {
          sqlite: { driver: "sqlite" },
        },
      },
    }));
    jest.doMock("../cli/utils/ScenarioMorphAliasRouting", () => ({
      resolveScenarioMorphAliases: jest.fn(() => ({
        userMorph: "User",
        postMorph: "Post",
      })),
    }));

    const logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);

    const { demoScenario } = await import("../cli/commands/demoScenario.js");
    await demoScenario({
      connectionName: "sqlite",
      user: 42,
    });

    expect(getAdapter).toHaveBeenCalledWith("sqlite");
    expect(queryOne).toHaveBeenNthCalledWith(5, expect.stringContaining("WHERE id = $1"), [42]);
    expect(inClause).toHaveBeenCalledWith("commentable_id", [101], 1);
    expect(query).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining("commentable_type = $2"),
      [101, "Post"],
    );
    expect(logSpy).toHaveBeenCalledWith("users:", 5);
    expect(logSpy).toHaveBeenCalledWith("post_user_pivot:", 0);
    expect(logSpy).toHaveBeenCalledWith("comments on posts:", 1);
    expect(closeAllConnections).toHaveBeenCalledTimes(1);
  });

  test("covers SQL driver fallback and mysql random-user selection", async () => {
    jest.doMock("chalk", () => ({
      __esModule: true,
      default: {
        cyanBright: (value: string) => value,
        gray: (value: string) => value,
        yellow: (value: string) => value,
        red: (value: string) => value,
      },
    }));

    const queryOne = jest
      .fn()
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 2 })
      .mockResolvedValueOnce({ count: 3 })
      .mockResolvedValueOnce({ count: 4 })
      .mockResolvedValueOnce({ id: 7 })
      .mockResolvedValueOnce({ id: 7, name: "Random User" });

    const query = jest
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const adapter = {
      wrapId: (value: string) => value,
      placeholder: (index: number) => `$${index}`,
      queryOne,
      query,
      inClause: jest.fn(),
    };

    const getAdapter = jest.fn(async () => adapter);
    const closeAllConnections = jest.fn(async () => undefined);

    jest.doMock("../core/connection/ConnectionFactory", () => ({
      getAdapter,
      getConnection: jest.fn(),
      closeAllConnections,
    }));
    jest.doMock("../core/connection/resolveConnectionName", () => ({
      resolveConnectionName: jest.fn(() => "mysql"),
    }));
    jest.doMock("../config/database", () => ({
      dbConfig: {
        connections: {},
      },
    }));
    jest.doMock("../cli/utils/ScenarioMorphAliasRouting", () => ({
      resolveScenarioMorphAliases: jest.fn(() => ({
        userMorph: "User",
        postMorph: "Post",
      })),
    }));

    const { demoScenario } = await import("../cli/commands/demoScenario.js");
    await demoScenario({
      connectionName: "mysql",
      random: true,
    });

    expect(queryOne).toHaveBeenNthCalledWith(
      5,
      expect.stringContaining("ORDER BY RAND() LIMIT 1"),
    );
    expect(queryOne).toHaveBeenNthCalledWith(
      6,
      expect.stringContaining("WHERE id = $1"),
      [7],
    );
    expect(closeAllConnections).toHaveBeenCalledTimes(1);
  });

  test("covers SQL random-user fallback when the sampled id is not numeric", async () => {
    jest.doMock("chalk", () => ({
      __esModule: true,
      default: {
        cyanBright: (value: string) => value,
        gray: (value: string) => value,
        yellow: (value: string) => value,
        red: (value: string) => value,
      },
    }));

    const queryOne = jest
      .fn()
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 2 })
      .mockResolvedValueOnce({ count: 3 })
      .mockResolvedValueOnce({ count: 4 })
      .mockResolvedValueOnce({ id: "bad-id" })
      .mockResolvedValueOnce({ id: 11, name: "Fallback User" });

    const query = jest
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const adapter = {
      wrapId: (value: string) => value,
      placeholder: (index: number) => `$${index}`,
      queryOne,
      query,
      inClause: jest.fn(),
    };

    const closeAllConnections = jest.fn(async () => undefined);

    jest.doMock("../core/connection/ConnectionFactory", () => ({
      getAdapter: jest.fn(async () => adapter),
      getConnection: jest.fn(),
      closeAllConnections,
    }));
    jest.doMock("../core/connection/resolveConnectionName", () => ({
      resolveConnectionName: jest.fn(() => "pg"),
    }));
    jest.doMock("../config/database", () => ({
      dbConfig: {
        connections: {
          pg: { driver: "pg" },
        },
      },
    }));
    jest.doMock("../cli/utils/ScenarioMorphAliasRouting", () => ({
      resolveScenarioMorphAliases: jest.fn(() => ({
        userMorph: "User",
        postMorph: "Post",
      })),
    }));

    const { demoScenario } = await import("../cli/commands/demoScenario.js");
    await demoScenario({
      connectionName: "pg",
      random: true,
    });

    expect(queryOne).toHaveBeenNthCalledWith(
      5,
      expect.stringContaining("ORDER BY RANDOM() LIMIT 1"),
    );
    expect(queryOne).toHaveBeenNthCalledWith(
      6,
      expect.stringContaining("ORDER BY id LIMIT 1"),
    );
    expect(closeAllConnections).toHaveBeenCalledTimes(1);
  });

  test("covers top-level non-Error failure logging without a second message", async () => {
    jest.doMock("chalk", () => ({
      __esModule: true,
      default: {
        cyanBright: (value: string) => value,
        gray: (value: string) => value,
        yellow: (value: string) => value,
        red: (value: string) => value,
      },
    }));

    const closeAllConnections = jest.fn(async () => undefined);

    jest.doMock("../core/connection/ConnectionFactory", () => ({
      getAdapter: jest.fn(async () => {
        throw "sql exploded";
      }),
      getConnection: jest.fn(),
      closeAllConnections,
    }));
    jest.doMock("../core/connection/resolveConnectionName", () => ({
      resolveConnectionName: jest.fn(() => "sqlite"),
    }));
    jest.doMock("../config/database", () => ({
      dbConfig: {
        connections: {
          sqlite: { driver: "sqlite" },
        },
      },
    }));

    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);

    const { demoScenario } = await import("../cli/commands/demoScenario.js");
    await demoScenario({
      connectionName: "sqlite",
    });

    expect(errorSpy).toHaveBeenCalledWith("Demo scenario failed.");
    expect(errorSpy).not.toHaveBeenCalledWith("sql exploded");
    expect(closeAllConnections).toHaveBeenCalledTimes(1);
  });

  test("covers Mongo random-user sampling and favorite postId fallback", async () => {
    jest.doMock("chalk", () => ({
      __esModule: true,
      default: {
        cyanBright: (value: string) => value,
        gray: (value: string) => value,
        yellow: (value: string) => value,
        red: (value: string) => value,
      },
    }));

    const usersCollection = {
      countDocuments: jest.fn(async () => 1),
      findOne: jest.fn(async () => null),
      aggregate: jest.fn(() => ({
        toArray: async () => [{ _id: "user-1" }],
      })),
    };
    const postsCollection = {
      countDocuments: jest
        .fn()
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(1),
      find: jest.fn(() => ({
        limit: () => ({
          toArray: async () => [{ _id: "post-1" }],
        }),
      })),
    };
    const commentsCollection = {
      countDocuments: jest
        .fn()
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(3),
    };
    const pivotCollection = {
      countDocuments: jest.fn(async () => 1),
      find: jest.fn(() => ({
        limit: () => ({
          toArray: async () => [{ postId: "post-1" }],
        }),
      })),
    };
    const db = {
      collection: jest.fn((name: string) => {
        if (name === "users") return usersCollection;
        if (name === "posts") return postsCollection;
        if (name === "comments") return commentsCollection;
        return pivotCollection;
      }),
    };

    const closeAllConnections = jest.fn(async () => undefined);
    jest.doMock("../core/connection/ConnectionFactory", () => ({
      getAdapter: jest.fn(),
      getConnection: jest.fn(async () => db),
      closeAllConnections,
    }));
    jest.doMock("../core/connection/resolveConnectionName", () => ({
      resolveConnectionName: jest.fn(() => "mongo"),
    }));
    jest.doMock("../config/database", () => ({
      dbConfig: {
        connections: {
          mongo: { driver: "mongo" },
        },
      },
    }));
    jest.doMock("../cli/utils/ScenarioMorphAliasRouting", () => ({
      resolveScenarioMorphAliases: jest.fn(() => ({
        userMorph: "User",
        postMorph: "Post",
      })),
    }));

    const logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);

    const { demoScenario } = await import("../cli/commands/demoScenario.js");
    await demoScenario({
      connectionName: "mongo",
      random: true,
    });

    expect(usersCollection.aggregate).toHaveBeenCalledWith([{ $sample: { size: 1 } }]);
    expect(pivotCollection.find).toHaveBeenCalledWith({ user_id: "user-1" });
    expect(postsCollection.countDocuments).toHaveBeenLastCalledWith({
      $or: [
        { id: { $in: ["post-1"] } },
        { _id: { $in: ["post-1"] } },
      ],
    });
    expect(logSpy).toHaveBeenCalledWith("favorite posts:", 1);
    expect(closeAllConnections).toHaveBeenCalledTimes(1);
  });

  test("covers Mongo random-user sampling when no user is returned", async () => {
    jest.doMock("chalk", () => ({
      __esModule: true,
      default: {
        cyanBright: (value: string) => value,
        gray: (value: string) => value,
        yellow: (value: string) => value,
        red: (value: string) => value,
      },
    }));

    const usersCollection = {
      countDocuments: jest.fn(async () => 0),
      findOne: jest.fn(async () => null),
      aggregate: jest.fn(() => ({
        toArray: async () => [],
      })),
    };
    const genericCollection = {
      countDocuments: jest.fn(async () => 0),
      find: jest.fn(() => ({
        limit: () => ({
          toArray: async () => [],
        }),
      })),
    };
    const db = {
      collection: jest.fn((name: string) => {
        if (name === "users") return usersCollection;
        return genericCollection;
      }),
    };

    const closeAllConnections = jest.fn(async () => undefined);
    jest.doMock("../core/connection/ConnectionFactory", () => ({
      getAdapter: jest.fn(),
      getConnection: jest.fn(async () => db),
      closeAllConnections,
    }));
    jest.doMock("../core/connection/resolveConnectionName", () => ({
      resolveConnectionName: jest.fn(() => "mongo"),
    }));
    jest.doMock("../config/database", () => ({
      dbConfig: {
        connections: {
          mongo: { driver: "mongo" },
        },
      },
    }));
    jest.doMock("../cli/utils/ScenarioMorphAliasRouting", () => ({
      resolveScenarioMorphAliases: jest.fn(() => ({
        userMorph: "User",
        postMorph: "Post",
      })),
    }));

    const logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);

    const { demoScenario } = await import("../cli/commands/demoScenario.js");
    await demoScenario({
      connectionName: "mongo",
      random: true,
    });

    expect(usersCollection.aggregate).toHaveBeenCalledWith([{ $sample: { size: 1 } }]);
    expect(logSpy).toHaveBeenCalledWith("\nNo users found to demonstrate relations.");
    expect(closeAllConnections).toHaveBeenCalledTimes(1);
  });
});

const passthroughChalk = {
  __esModule: true,
  default: {
    gray: (value: string) => value,
    yellow: (value: string) => value,
    cyan: (value: string) => value,
    green: (value: string) => value,
    greenBright: (value: string) => value,
    red: (value: string) => value,
    redBright: (value: string) => value,
  },
};

export {};

describe("LTS phase 5 migrateFresh continuation", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
    jest.clearAllMocks();
    process.exitCode = 0;
  });

  test("continuation plan records the completed migrateFresh slice", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const planPath = path.resolve(
      process.cwd(),
      "validation tasks/LTS-Phase5-MigrateFresh-Continuation-Plan.md",
    );
    const content = fs.readFileSync(planPath, "utf8");

    expect(content).toContain("# LTS Phase 5 MigrateFresh Continuation Plan");
    expect(content).toContain("Status: COMPLETED");
    expect(content).toContain("line `28`");
    expect(content).toContain("line `143`");
    expect(content).toContain(
      "src/lab_test/lts.phase5.migrate-fresh-continuation.logic.test.ts",
    );
    expect(content).toContain("focused Docker `v8` run:");
    expect(content).toContain(
      "`migrateFresh.ts` -> `100%` statements / `100%` branches / `100%` functions / `100%` lines",
    );
  });

  test("migrateFresh uses getConnection for mongo and skips system collections", async () => {
    jest.resetModules();

    const userDrop = jest.fn(async () => undefined);
    const mongoDb = {
      listCollections: jest.fn(() => ({
        toArray: async () => [
          { name: "users" },
          { name: "system.profile" },
          { name: "" },
        ],
      })),
      collection: jest.fn((name: string) => ({
        drop: name === "users" ? userDrop : jest.fn(async () => undefined),
      })),
    };

    const getAdapter = jest.fn(async () => {
      throw new Error("getAdapter should not be used for mongo getConnection path");
    });
    const getConnection = jest.fn(async () => mongoDb);
    const closeAllConnections = jest.fn(async () => undefined);
    const migrateRun = jest.fn(async () => undefined);
    const makeMigration = jest.fn(async () => undefined);

    jest.doMock("chalk", () => passthroughChalk);
    jest.doMock("../core/connection/ConnectionFactory", () => ({
      getAdapter,
      getConnection,
      closeAllConnections,
    }));
    jest.doMock("../config/database", () => ({
      dbConfig: {
        connections: {
          mongo: { driver: "mongo" },
        },
      },
    }));
    jest.doMock("../cli/commands/migrateRun", () => ({
      migrateRun,
    }));
    jest.doMock("../cli/commands/makeMigration", () => ({
      makeMigration,
    }));

    const { migrateFresh } = await import("../cli/commands/migrateFresh");
    await migrateFresh({
      force: true,
      connectionNames: ["mongo" as never],
    });

    expect(getConnection).toHaveBeenCalledWith("mongo");
    expect(getAdapter).not.toHaveBeenCalled();
    expect(userDrop).toHaveBeenCalledTimes(1);
    expect(mongoDb.collection).toHaveBeenCalledTimes(1);
  });

  test("migrateFresh covers PostgreSQL and SQLite drop flows", async () => {
    const path = ["pg", "sqlite"] as const;

    for (const driver of path) {
      jest.resetModules();

      const execute = jest.fn(async () => undefined);
      const query =
        driver === "pg"
          ? jest.fn(async () => [{ tablename: "users" }, { tablename: "posts" }])
          : jest.fn(async () => [{ name: "users" }, { name: "posts" }]);
      const db = {
        execute,
        query,
        wrapId: jest.fn((id: string) => `\`${id}\``),
      };

      const getAdapter = jest.fn(async () => db);
      const getConnection = jest.fn(async () => ({}));
      const closeAllConnections = jest.fn(async () => undefined);
      const migrateRun = jest.fn(async () => undefined);
      const makeMigration = jest.fn(async () => undefined);

      jest.doMock("chalk", () => passthroughChalk);
      jest.doMock("../core/connection/ConnectionFactory", () => ({
        getAdapter,
        getConnection,
        closeAllConnections,
      }));
      jest.doMock("../config/database", () => ({
        dbConfig: {
          connections: {
            [driver]: { driver },
          },
        },
      }));
      jest.doMock("../cli/commands/migrateRun", () => ({
        migrateRun,
      }));
      jest.doMock("../cli/commands/makeMigration", () => ({
        makeMigration,
      }));

      const { migrateFresh } = await import("../cli/commands/migrateFresh");
      await migrateFresh({
        force: true,
        connectionNames: [driver as never],
      });

      if (driver === "pg") {
        expect(execute).toHaveBeenNthCalledWith(1, "DROP TABLE IF EXISTS `users` CASCADE;");
        expect(execute).toHaveBeenNthCalledWith(2, "DROP TABLE IF EXISTS `posts` CASCADE;");
      } else {
        expect(execute).toHaveBeenNthCalledWith(1, "PRAGMA foreign_keys = OFF;");
        expect(execute).toHaveBeenNthCalledWith(2, "DROP TABLE IF EXISTS `users`;");
        expect(execute).toHaveBeenNthCalledWith(3, "DROP TABLE IF EXISTS `posts`;");
        expect(execute).toHaveBeenNthCalledWith(4, "PRAGMA foreign_keys = ON;");
      }
    }
  });

  test("migrateFresh resolves the default test connection and exits early when the user cancels", async () => {
    jest.resetModules();

    const getAdapter = jest.fn(async () => ({}));
    const getConnection = jest.fn(async () => ({}));
    const closeAllConnections = jest.fn(async () => undefined);
    const resolveConnectionName = jest.fn(() => "sqlite_test");
    const migrateRun = jest.fn(async () => undefined);
    const makeMigration = jest.fn(async () => undefined);
    const createInterface = jest.fn(() => ({
      question: (_prompt: string, callback: (answer: string) => void) => callback("n"),
      close: jest.fn(),
    }));

    jest.doMock("chalk", () => passthroughChalk);
    jest.doMock("readline", () => ({
      createInterface,
    }));
    jest.doMock("../core/connection/ConnectionFactory", () => ({
      getAdapter,
      getConnection,
      closeAllConnections,
    }));
    jest.doMock("../core/connection/resolveConnectionName", () => ({
      resolveConnectionName,
    }));
    jest.doMock("../config/database", () => ({
      dbConfig: {
        connections: {
          sqlite_test: { driver: "sqlite" },
        },
      },
    }));
    jest.doMock("../cli/commands/migrateRun", () => ({
      migrateRun,
    }));
    jest.doMock("../cli/commands/makeMigration", () => ({
      makeMigration,
    }));

    const logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);

    const { migrateFresh } = await import("../cli/commands/migrateFresh");
    await migrateFresh({
      test: true,
    });

    expect(resolveConnectionName).toHaveBeenCalledWith(undefined, { test: true });
    expect(createInterface).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("Operation cancelled by user."));
    expect(getAdapter).not.toHaveBeenCalled();
    expect(migrateRun).not.toHaveBeenCalled();
  });

  test("migrateFresh marks hadFailure when a drop operation returns false but still reruns migrations", async () => {
    jest.resetModules();

    const getAdapter = jest.fn(async () => {
      throw new Error("adapter failed");
    });
    const getConnection = jest.fn(async () => ({}));
    const closeAllConnections = jest.fn(async () => undefined);
    const migrateRun = jest.fn(async () => undefined);
    const makeMigration = jest.fn(async () => undefined);

    jest.doMock("chalk", () => passthroughChalk);
    jest.doMock("../core/connection/ConnectionFactory", () => ({
      getAdapter,
      getConnection,
      closeAllConnections,
    }));
    jest.doMock("../config/database", () => ({
      dbConfig: {
        connections: {
          mysql: { driver: "mysql" },
        },
      },
    }));
    jest.doMock("../cli/commands/migrateRun", () => ({
      migrateRun,
    }));
    jest.doMock("../cli/commands/makeMigration", () => ({
      makeMigration,
    }));

    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);

    const { migrateFresh } = await import("../cli/commands/migrateFresh");
    await migrateFresh({
      force: true,
      connectionNames: ["mysql" as never],
      auditCommand: "lts:migrate:fresh",
    });

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("Error while dropping tables for mysql:"),
    );
    expect(closeAllConnections).toHaveBeenCalled();
    expect(migrateRun).toHaveBeenCalledWith(false, undefined, false, false, {
      connectionNames: ["mysql"],
      auditCommand: "lts:migrate:fresh",
    });
    expect(process.exitCode).toBe(1);
  });
});

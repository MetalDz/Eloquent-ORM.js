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

describe("LTS phase 5 migrateFresh coverage", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
    jest.clearAllMocks();
    process.exitCode = 0;
  });

  test("plan tracks the dedicated migrateFresh LTS slice", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const planPath = path.resolve(
      process.cwd(),
      "validation tasks/LTS-Phase5-MigrateFresh-Coverage-Plan.md",
    );
    const content = fs.readFileSync(planPath, "utf8");

    expect(content).toContain("# LTS Phase 5 MigrateFresh Coverage Plan");
    expect(content).toContain("Status: COMPLETED");
    expect(content).toContain("src/cli/commands/migrateFresh.ts");
    expect(content).toContain(
      "src/lab_test/lts.phase5.migrate-fresh-coverage.logic.test.ts",
    );
  });

  test("migrateFresh uses getAdapter fallback when getConnection is unavailable for mongo", async () => {
    jest.resetModules();

    const drop = jest.fn(async () => undefined);
    const mongoDb = {
      listCollections: jest.fn(() => ({
        toArray: async () => [{ name: "users" }],
      })),
      collection: jest.fn(() => ({
        drop,
      })),
    };

    const getAdapter = jest.fn(async () => mongoDb);
    const closeAllConnections = jest.fn(async () => undefined);
    const migrateRun = jest.fn(async () => undefined);
    const makeMigration = jest.fn(async () => undefined);

    jest.doMock("chalk", () => passthroughChalk);
    jest.doMock("../core/connection/ConnectionFactory", () => ({
      getAdapter,
      getConnection: undefined,
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

    expect(getAdapter).toHaveBeenCalledWith("mongo");
    expect(drop).toHaveBeenCalledTimes(1);
    expect(makeMigration).not.toHaveBeenCalled();
    expect(migrateRun).toHaveBeenCalledWith(false, undefined, false, false, {
      connectionNames: ["mongo"],
      auditCommand: "migrate:fresh",
    });
  });

  test("migrateFresh skips unsupported drivers cleanly", async () => {
    jest.resetModules();

    const getAdapter = jest.fn(async () => ({}));
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
          oracle: { driver: "oracle" },
        },
      },
    }));
    jest.doMock("../cli/commands/migrateRun", () => ({
      migrateRun,
    }));
    jest.doMock("../cli/commands/makeMigration", () => ({
      makeMigration,
    }));

    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);

    const { migrateFresh } = await import("../cli/commands/migrateFresh");
    await migrateFresh({
      force: true,
      connectionNames: ["oracle" as never],
    });

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Skipping unsupported connection: oracle (oracle)."),
    );
    expect(getAdapter).toHaveBeenCalledWith("oracle");
    expect(makeMigration).not.toHaveBeenCalled();
    expect(migrateRun).toHaveBeenCalled();
    expect(process.exitCode).toBe(0);
  });

  test("migrateFresh covers mysql drop flow and --all-migrations failure path", async () => {
    jest.resetModules();

    const execute = jest.fn(async () => undefined);
    const query = jest.fn(async () => [
      { Tables_in_demo: "users" },
      { Tables_in_demo: "posts" },
    ]);
    const db = {
      execute,
      query,
      wrapId: jest.fn((id: string) => `\`${id}\``),
    };

    const getAdapter = jest.fn(async () => db);
    const getConnection = jest.fn(async () => ({}));
    const closeAllConnections = jest.fn(async () => undefined);
    const migrateRun = jest.fn(async () => undefined);
    const makeMigration = jest.fn(async () => {
      throw new Error("generate failed");
    });

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
      allMigrations: true,
      connectionNames: ["mysql" as never],
    });

    expect(execute).toHaveBeenNthCalledWith(1, "SET FOREIGN_KEY_CHECKS = 0;");
    expect(execute).toHaveBeenNthCalledWith(2, "DROP TABLE IF EXISTS `users`;");
    expect(execute).toHaveBeenNthCalledWith(3, "DROP TABLE IF EXISTS `posts`;");
    expect(execute).toHaveBeenNthCalledWith(4, "SET FOREIGN_KEY_CHECKS = 1;");
    expect(makeMigration).toHaveBeenCalledWith("all", {
      test: false,
      connectionName: "mysql",
      exit: false,
    });
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        "Failed to auto-generate migrations (--all-migrations) for mysql.",
      ),
    );
    expect(errorSpy).toHaveBeenCalledWith(expect.any(Error));
    expect(process.exitCode).toBe(1);
  });
});

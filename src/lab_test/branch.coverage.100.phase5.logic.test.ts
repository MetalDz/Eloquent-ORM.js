jest.mock("chalk", () => {
  const passthrough = (value: unknown): string => String(value ?? "");
  const proxy = new Proxy(passthrough, {
    get: () => passthrough,
    apply: (_target, _thisArg, args: unknown[]) => passthrough(args[0]),
  });
  return { __esModule: true, default: proxy };
});

jest.mock("../core/connection/ConnectionFactory", () => ({
  closeAllConnections: jest.fn(),
  getConnection: jest.fn(),
  getAdapter: jest.fn(),
}));

jest.mock("../core/connection/resolveConnectionName", () => ({
  resolveConnectionName: jest.fn(),
}));

jest.mock("../cli/utils/typescript/tsRuntime", () => ({
  loadModule: jest.fn(),
}));

jest.mock("../cli/utils/AuditTrail", () => ({
  appendAuditEvent: jest.fn(),
}));

const fs = require("fs") as typeof import("fs");
const artifactStorage = require("../cli/utils/ArtifactStorage") as typeof import("../cli/utils/ArtifactStorage.js");
const { PathMap } = require("../cli/utils/PathMap") as typeof import("../cli/utils/PathMap.js");
const { dbSeed } = require("../cli/commands/dbSeed") as typeof import("../cli/commands/dbSeed.js");
const seedPrecheck = require("../cli/utils/SeedBootstrapPrecheck") as typeof import("../cli/utils/SeedBootstrapPrecheck.js");
const tsRuntime = require("../cli/utils/typescript/tsRuntime") as typeof import("../cli/utils/typescript/tsRuntime.js");
const connectionFactory = require("../core/connection/ConnectionFactory") as typeof import("../core/connection/ConnectionFactory.js");
const resolveConnection = require("../core/connection/resolveConnectionName") as typeof import("../core/connection/resolveConnectionName.js");
const { dbConfig } = require("../config/database") as typeof import("../config/database.js");

describe("Branch coverage 100% - phase 5 hard-to-reach environment paths", () => {
  const originalDbConnection = process.env.DB_CONNECTION;
  const originalDbTestConnection = process.env.DB_TEST_CONNECTION;
  const originalCliFlag = process.env.ELOQUENT_CLI;
  const originalExitCode = process.exitCode;

  beforeEach(() => {
    process.env.DB_CONNECTION = "mysql_test";
    process.env.DB_TEST_CONNECTION = "mysql_test";
    process.exitCode = 0;

    jest.spyOn(console, "log").mockImplementation(() => undefined);
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
    jest.spyOn(console, "error").mockImplementation(() => undefined);

    jest
      .spyOn(connectionFactory, "closeAllConnections")
      .mockImplementation(async () => undefined);
    jest
      .spyOn(resolveConnection, "resolveConnectionName")
      .mockReturnValue("sqlite_test" as never);
    jest
      .spyOn(artifactStorage, "resolveSeederStorageKindFromFile")
      .mockReturnValue("unknown");
  });

  afterEach(() => {
    process.env.DB_CONNECTION = "mysql_test";
    process.env.DB_TEST_CONNECTION = "mysql_test";
    process.env.ELOQUENT_CLI = originalCliFlag;
    process.exitCode = 0;
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  afterAll(() => {
    process.env.DB_CONNECTION = originalDbConnection;
    process.env.DB_TEST_CONNECTION = originalDbTestConnection;
    process.env.ELOQUENT_CLI = originalCliFlag;
    process.exitCode = originalExitCode;
  });

  test("dbSeed handles missing seeds dir and empty seeds dir branches", async () => {
    jest.spyOn(PathMap, "seeds").mockReturnValue("virtual-seeds");

    const existsSpy = jest.spyOn(fs, "existsSync");
    const readDirSpy = jest.spyOn(fs, "readdirSync");

    existsSpy.mockReturnValueOnce(false);
    await dbSeed({ test: true, close: true, exit: false });
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("No seed directory found"));

    existsSpy.mockReturnValueOnce(true);
    readDirSpy.mockReturnValueOnce(["README.md"] as unknown as ReturnType<typeof fs.readdirSync>);
    await dbSeed({ test: true, close: true, exit: false });
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("No seeder files found"));
    expect(connectionFactory.closeAllConnections).toHaveBeenCalledTimes(2);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("All database connections closed"));
  });

  test("dbSeed covers class failure catch and top-level error handling", async () => {
    const boom = new Error("phase5-boom");
    jest.spyOn(PathMap, "seeds").mockReturnValue("virtual-seeds");
    jest.spyOn(fs, "existsSync").mockReturnValue(true);
    jest
      .spyOn(fs, "readdirSync")
      .mockReturnValue(["UserSeeder.ts"] as unknown as ReturnType<typeof fs.readdirSync>);
    jest.spyOn(tsRuntime, "loadModule").mockReturnValue({
      UserSeeder: async () => {
        throw boom;
      },
    });

    await dbSeed({
      test: true,
      class: "UserSeeder",
      connectionNames: ["sqlite_test"],
      close: false,
      exit: false,
    });

    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("Seeder execution failed."));
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("phase5-boom"));
    expect(process.exitCode).toBe(1);
  });

  test("dbSeed covers run-all branch, no seeder export branch, and non-callable seeder export branch", async () => {
    jest.spyOn(PathMap, "seeds").mockReturnValue("virtual-seeds");
    jest.spyOn(fs, "existsSync").mockReturnValue(true);
    jest.spyOn(fs, "readdirSync").mockReturnValue(
      ["NoSeeder.ts", "BrokenSeeder.ts"] as unknown as ReturnType<typeof fs.readdirSync>
    );

    jest.spyOn(tsRuntime, "loadModule").mockImplementation((filePath: string) => {
      if (filePath.includes("NoSeeder.ts")) {
        return { Utility: () => undefined };
      }
      return { BrokenSeeder: 123 };
    });

    await dbSeed({
      test: true,
      connectionNames: ["sqlite_test"],
      close: false,
      exit: false,
    });

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("No seeder function found"));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("is not callable"));
    expect(process.exitCode).toBe(0);
  });

  test("dbSeed schedules process.exit when CLI mode is enabled", async () => {
    jest.useFakeTimers();
    process.env.ELOQUENT_CLI = "true";

    const exitSpy = jest
      .spyOn(process, "exit")
      .mockImplementation(
        (() => undefined) as unknown as (code?: string | number | null | undefined) => never
      );

    jest.spyOn(PathMap, "seeds").mockReturnValue("virtual-seeds");
    jest.spyOn(fs, "existsSync").mockReturnValue(true);
    jest
      .spyOn(fs, "readdirSync")
      .mockReturnValue(["UserSeeder.ts"] as unknown as ReturnType<typeof fs.readdirSync>);
    jest.spyOn(tsRuntime, "loadModule").mockReturnValue({
      UserSeeder: async () => undefined,
    });

    await dbSeed({
      test: true,
      class: "UserSeeder",
      connectionNames: ["sqlite_test"],
      close: false,
    });

    jest.runOnlyPendingTimers();
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  test("seed bootstrap precheck covers missing dir, mongo connectivity branch, and clean print path", async () => {
    const migrationsPath = "virtual-migrations";
    jest.spyOn(PathMap, "migrations").mockReturnValue(migrationsPath);

    const existsSpy = jest.spyOn(fs, "existsSync");
    const readDirSpy = jest.spyOn(fs, "readdirSync");
    const getAdapterSpy = jest.spyOn(connectionFactory, "getAdapter");

    existsSpy.mockReturnValueOnce(false);
    const missingDirReport = await seedPrecheck.runSeedBootstrapPrecheck({
      connectionNames: ["mysql"],
    });
    expect(missingDirReport.clean).toBe(false);
    expect(missingDirReport.checks[0].reasons).toContain(
      `Missing migrations directory: ${migrationsPath}`
    );

    existsSpy.mockReturnValueOnce(true);
    readDirSpy.mockReturnValueOnce([] as unknown as ReturnType<typeof fs.readdirSync>);
    const mongoDriverBefore = dbConfig.connections.mongo.driver;
    const getConnectionSpy = jest
      .spyOn(connectionFactory, "getConnection")
      .mockResolvedValue({} as never);
    dbConfig.connections.mongo.driver = "mongo";
    const nonSqlReport = await seedPrecheck.runSeedBootstrapPrecheck({
      connectionNames: ["mongo" as never],
    });
    dbConfig.connections.mongo.driver = mongoDriverBefore;

    expect(nonSqlReport.clean).toBe(true);
    expect(nonSqlReport.checks[0].reasons).toEqual([]);
    expect(getConnectionSpy).toHaveBeenCalledWith("mongo");
    expect(getAdapterSpy).not.toHaveBeenCalled();

    seedPrecheck.printSeedBootstrapPrecheck({
      clean: true,
      checks: [
        {
          connectionName: "mysql",
          migrationsDir: "m",
          clean: true,
          reasons: [],
          pendingMigrations: [],
        },
      ],
    });
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("[mysql] clean"));
  });
});

export {};

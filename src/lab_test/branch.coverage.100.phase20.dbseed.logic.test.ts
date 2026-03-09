import fs from "fs";
import { dbSeed } from "../cli/commands/dbSeed";
import { PathMap } from "../cli/utils/PathMap";
import { loadModule } from "../cli/utils/typescript/tsRuntime";
import { closeAllConnections } from "../core/connection/ConnectionFactory";
import { resolveConnectionName } from "../core/connection/resolveConnectionName";
import { appendAuditEvent } from "../cli/utils/AuditTrail";

jest.mock("chalk", () => {
  const passthrough = (value: unknown): string => String(value ?? "");
  const proxy = new Proxy(passthrough, {
    get: () => passthrough,
    apply: (_target, _thisArg, args: unknown[]) => passthrough(args[0]),
  });
  return { __esModule: true, default: proxy };
});

jest.mock("../cli/utils/PathMap", () => ({
  PathMap: {
    seeds: jest.fn(),
  },
}));

jest.mock("../cli/utils/typescript/tsRuntime", () => ({
  loadModule: jest.fn(),
}));

jest.mock("../core/connection/ConnectionFactory", () => ({
  closeAllConnections: jest.fn(),
}));

jest.mock("../core/connection/resolveConnectionName", () => ({
  resolveConnectionName: jest.fn(),
}));

jest.mock("../cli/utils/AuditTrail", () => ({
  appendAuditEvent: jest.fn(),
}));

const mockedSeedsPath = PathMap.seeds as jest.MockedFunction<typeof PathMap.seeds>;
const mockedLoadModule = loadModule as jest.MockedFunction<typeof loadModule>;
const mockedCloseAllConnections =
  closeAllConnections as jest.MockedFunction<typeof closeAllConnections>;
const mockedResolveConnectionName =
  resolveConnectionName as jest.MockedFunction<typeof resolveConnectionName>;
const mockedAppendAuditEvent = appendAuditEvent as jest.MockedFunction<typeof appendAuditEvent>;

describe("Branch coverage 100% - phase 20 dbSeed edge branches", () => {
  const originalExitCode = process.exitCode;

  beforeEach(() => {
    jest.clearAllMocks();
    process.exitCode = 0;
    delete process.env.ELOQUENT_CLI;
    mockedCloseAllConnections.mockResolvedValue(undefined);
    mockedResolveConnectionName.mockReturnValue("sqlite_test" as never);

    jest.spyOn(console, "log").mockImplementation(() => undefined);
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
    jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.exitCode = originalExitCode;
    delete process.env.ELOQUENT_CLI;
  });

  function mockSeedDirectory(files: string[], exists: boolean): void {
    mockedSeedsPath.mockReturnValue("/virtual/seeds");
    jest.spyOn(fs, "existsSync").mockReturnValue(exists);
    if (exists) {
      jest
        .spyOn(fs, "readdirSync")
        .mockReturnValue(files as unknown as ReturnType<typeof fs.readdirSync>);
    }
  }

  test("returns early when seed directory is missing", async () => {
    mockSeedDirectory([], false);

    await dbSeed({
      test: true,
      connectionNames: ["sqlite_test" as never],
      exit: false,
    });

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("No seed directory found"));
    expect(mockedCloseAllConnections).toHaveBeenCalledTimes(1);
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("All database connections closed")
    );
  });

  test("returns early when no seeder files are present", async () => {
    mockSeedDirectory(["README.md"], true);

    await dbSeed({
      test: true,
      connectionNames: ["sqlite_test" as never],
      close: false,
      exit: false,
    });

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("No seeder files found"));
    expect(mockedCloseAllConnections).not.toHaveBeenCalled();
  });

  test("class seeder failure marks failure and reports error message", async () => {
    mockSeedDirectory(["UserSeeder.ts"], true);
    mockedLoadModule.mockReturnValue({
      UserSeeder: async () => {
        throw new Error("seed-class-failure");
      },
    } as never);

    await dbSeed({
      test: true,
      class: "UserSeeder",
      connectionNames: ["sqlite_test" as never],
      close: false,
      exit: false,
    });

    expect(process.exitCode).toBe(1);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("Seeder execution failed"));
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("seed-class-failure"));
    expect(mockedAppendAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        result: "failure",
        metadata: expect.objectContaining({ className: "UserSeeder" }),
      })
    );
  });

  test("class mode records not-found failure and restores existing hook env value", async () => {
    mockSeedDirectory(["UserSeeder.ts"], true);
    process.env.ELOQUENT_DISABLE_MODEL_HOOKS = "persisted";
    process.exitCode = 0;

    await dbSeed({
      test: true,
      class: "MissingSeeder",
      noHooks: true,
      connectionNames: ["sqlite_test" as never],
      close: false,
      exit: false,
    });

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Seeder 'MissingSeeder' not found."));
    expect(mockedAppendAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        result: "failure",
        metadata: expect.objectContaining({
          className: "MissingSeeder",
          reason: "seeder_not_found",
        }),
      })
    );
    expect(process.env.ELOQUENT_DISABLE_MODEL_HOOKS).toBe("persisted");
    expect(process.exitCode).toBe(1);
  });

  test("all-seeders mode failure marks failure with className null", async () => {
    mockSeedDirectory(["PostSeeder.ts"], true);
    mockedLoadModule.mockReturnValue({
      PostSeeder: async () => Promise.reject("seed-all-failure"),
    } as never);

    await dbSeed({
      test: false,
      connectionNames: ["sqlite" as never],
      close: false,
      exit: false,
    });

    expect(process.exitCode).toBe(1);
    expect(mockedAppendAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        result: "failure",
        metadata: expect.objectContaining({ className: null }),
      })
    );
  });

  test("uses resolver when connectionNames are omitted", async () => {
    mockSeedDirectory(["BlogSeeder.ts"], true);
    mockedLoadModule.mockReturnValue({
      BlogSeeder: async () => undefined,
    } as never);

    await dbSeed({
      test: true,
      close: false,
      exit: false,
    });

    expect(mockedResolveConnectionName).toHaveBeenCalledWith(undefined, { test: true });
    expect(mockedAppendAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ connectionName: "sqlite_test" })
    );
  });

  test("handles modules without seeder function and non-callable seeder export", async () => {
    mockSeedDirectory(["NoSeeder.ts", "BrokenSeeder.ts"], true);
    mockedLoadModule
      .mockReturnValueOnce({ HelperFactory: async () => undefined } as never)
      .mockReturnValueOnce({ BrokenSeeder: 123 } as never);

    await dbSeed({
      test: false,
      connectionNames: ["sqlite" as never],
      close: false,
      exit: false,
    });

    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("No seeder function found in")
    );
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("Exported BrokenSeeder is not callable")
    );
    expect(process.exitCode).toBe(0);
  });

  test("CLI mode schedules process.exit when run completes", async () => {
    process.env.ELOQUENT_CLI = "true";
    process.exitCode = undefined;
    mockSeedDirectory([], false);

    const exitSpy = jest
      .spyOn(process, "exit")
      .mockImplementation((() => undefined) as never);
    jest
      .spyOn(global, "setImmediate")
      .mockImplementation(((cb: (...args: unknown[]) => void, ...args: unknown[]) => {
        cb(...args);
        return 0 as never;
      }) as never);

    await dbSeed({
      test: false,
      connectionNames: ["sqlite" as never],
    });

    expect(exitSpy).toHaveBeenCalledWith(0);
  });
});

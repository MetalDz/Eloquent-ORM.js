jest.mock("chalk", () => {
  const passthrough = (value: unknown): string => String(value ?? "");
  const proxy = new Proxy(passthrough, {
    get: () => passthrough,
    apply: (_target, _thisArg, args: unknown[]) => passthrough(args[0]),
  });
  return { __esModule: true, default: proxy };
});

import { dbSeedFresh } from "../cli/commands/dbSeedFresh.js";
import * as migrateFreshCommand from "../cli/commands/migrateFresh.js";
import * as dbSeedCommand from "../cli/commands/dbSeed.js";
import * as connectionFactory from "../core/connection/ConnectionFactory.js";
import * as resolver from "../core/connection/resolveConnectionName.js";
import * as consoleSilencer from "../cli/utils/ConsoleSilencer.js";

describe("Branch coverage 70 - dbSeedFresh", () => {
  const originalEnv = { ...process.env };
  const originalExit = process.exit;
  const originalSetImmediate = global.setImmediate;
  const originalExitCode = process.exitCode;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.exitCode = 0;
    jest.spyOn(console, "log").mockImplementation(() => undefined);
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    jest.spyOn(consoleSilencer, "silenceConsoleOutput").mockReturnValue(() => undefined);
    jest
      .spyOn(connectionFactory, "closeAllConnections")
      .mockImplementation(async () => undefined);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    process.exit = originalExit;
    global.setImmediate = originalSetImmediate;
    process.exitCode = originalExitCode;
    jest.restoreAllMocks();
  });

  test("uses resolver default connection when connectionNames are omitted", async () => {
    const migrateSpy = jest
      .spyOn(migrateFreshCommand, "migrateFresh")
      .mockImplementation(async () => undefined);
    const seedSpy = jest.spyOn(dbSeedCommand, "dbSeed").mockImplementation(async () => undefined);
    jest.spyOn(resolver, "resolveConnectionName").mockReturnValue("mysql");

    await dbSeedFresh({ test: false });

    expect(resolver.resolveConnectionName).toHaveBeenCalledWith(undefined, { test: false });
    expect(migrateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        test: false,
        force: false,
        auditCommand: "db:seed:fresh",
      })
    );
    expect(seedSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        test: false,
        connectionNames: ["mysql"],
        auditCommand: "db:seed:fresh",
      })
    );
  });

  test("handles migrate failure path, logs error, and sets process.exitCode", async () => {
    jest
      .spyOn(migrateFreshCommand, "migrateFresh")
      .mockRejectedValue(new Error("fresh-failed"));
    const seedSpy = jest.spyOn(dbSeedCommand, "dbSeed").mockImplementation(async () => undefined);

    await dbSeedFresh({
      test: true,
      class: "BlogScenarioSeeder",
      connectionNames: ["pg_test"],
    });

    expect(seedSpy).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith("db:seed:fresh failed.");
    expect(console.error).toHaveBeenCalledWith("fresh-failed");
    expect(process.exitCode).toBe(1);
    expect(process.env.DB_TEST_CONNECTION).toBe(originalEnv.DB_TEST_CONNECTION);
    expect(process.env.DB_CONNECTION).toBe(originalEnv.DB_CONNECTION);
  });

  test("handles non-Error failures without printing an Error message line", async () => {
    jest.spyOn(migrateFreshCommand, "migrateFresh").mockRejectedValue("string-failure");
    jest.spyOn(dbSeedCommand, "dbSeed").mockImplementation(async () => undefined);

    await dbSeedFresh({
      test: false,
      connectionNames: ["mysql"],
      silent: false,
    });

    expect(console.error).toHaveBeenCalledWith("db:seed:fresh failed.");
    expect(console.error).not.toHaveBeenCalledWith("string-failure");
    expect(process.exitCode).toBe(1);
  });

  test("CLI mode schedules process.exit with final exit code", async () => {
    process.env.ELOQUENT_CLI = "true";
    process.exitCode = 0;
    jest.spyOn(migrateFreshCommand, "migrateFresh").mockImplementation(async () => undefined);
    jest.spyOn(dbSeedCommand, "dbSeed").mockImplementation(async () => undefined);
    const exitSpy = jest.fn() as any;
    process.exit = exitSpy;
    global.setImmediate = ((cb: (...args: any[]) => void, ...args: any[]) => {
      cb(...args);
      return 0 as any;
    }) as typeof setImmediate;

    await dbSeedFresh({
      test: false,
      connectionNames: ["mysql"],
      silent: true,
      noHooks: true,
      class: "UserSeeder",
    });

    expect(exitSpy).toHaveBeenCalledWith(0);
    expect(consoleSilencer.silenceConsoleOutput).toHaveBeenCalledWith(true);
    expect(dbSeedCommand.dbSeed).toHaveBeenCalledWith(
      expect.objectContaining({
        silent: true,
        noHooks: true,
      })
    );
  });

  test("CLI mode falls back to 0 when process.exitCode is undefined", async () => {
    process.env.ELOQUENT_CLI = "true";
    process.exitCode = undefined;
    jest.spyOn(migrateFreshCommand, "migrateFresh").mockImplementation(async () => undefined);
    jest.spyOn(dbSeedCommand, "dbSeed").mockImplementation(async () => undefined);
    const exitSpy = jest.fn() as any;
    process.exit = exitSpy;
    global.setImmediate = ((cb: (...args: any[]) => void, ...args: any[]) => {
      cb(...args);
      return 0 as any;
    }) as typeof setImmediate;

    await dbSeedFresh({
      test: false,
      connectionNames: ["mysql"],
    });

    expect(exitSpy).toHaveBeenCalledWith(0);
  });
});

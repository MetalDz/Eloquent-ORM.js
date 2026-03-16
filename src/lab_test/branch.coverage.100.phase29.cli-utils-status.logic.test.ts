import fs from "fs";
import os from "os";
import path from "path";
import {
  buildStructuredLogLine,
  isJsonLogFormat,
  resolveLogLevel,
} from "../cli/utils/StructuredLogger";
import { resolveSqlConnectionNames } from "../cli/utils/resolveSqlConnectionFlags";
import {
  checkProductionDestructiveCommand,
  isProductionRuntime,
} from "../cli/utils/ProductionSafety";
import { PathMap } from "../cli/utils/PathMap";

describe("Branch coverage 100% - phase 29 utility + migrateStatus edge closure", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
    jest.clearAllMocks();
    process.exitCode = 0;
  });

  test("StructuredLogger default arguments resolve from process env and empty context", () => {
    const oldLevel = process.env.ELOQUENT_LOG_LEVEL;
    const oldFormat = process.env.ELOQUENT_LOG_FORMAT;

    delete process.env.ELOQUENT_LOG_LEVEL;
    delete process.env.ELOQUENT_LOG_FORMAT;

    expect(resolveLogLevel()).toBe("info");
    expect(isJsonLogFormat()).toBe(false);

    const parsed = JSON.parse(buildStructuredLogLine("info", ["phase29-default"]));
    expect(parsed.level).toBe("info");
    expect(parsed.message).toBe("phase29-default");
    expect(parsed.command).toBeUndefined();

    if (oldLevel === undefined) delete process.env.ELOQUENT_LOG_LEVEL;
    else process.env.ELOQUENT_LOG_LEVEL = oldLevel;
    if (oldFormat === undefined) delete process.env.ELOQUENT_LOG_FORMAT;
    else process.env.ELOQUENT_LOG_FORMAT = oldFormat;
  });

  test("resolveSqlConnectionNames covers all flag and selection branches", () => {
    expect(resolveSqlConnectionNames(false)).toEqual([]);
    expect(resolveSqlConnectionNames(false, {})).toEqual([]);
    expect(resolveSqlConnectionNames(true, { allConnections: true })).toEqual([
      "mysql_test",
      "pg_test",
      "sqlite_test",
    ]);
    expect(resolveSqlConnectionNames(false, { allConnections: true })).toEqual([
      "mysql",
      "pg",
      "sqlite",
    ]);

    expect(() =>
      resolveSqlConnectionNames(false, { mysql: true, pg: true })
    ).toThrow("Choose only one explicit connection flag or use --all-connections.");

    expect(resolveSqlConnectionNames(true, { pg: true })).toEqual(["pg_test"]);
    expect(resolveSqlConnectionNames(false, { sqlite: true })).toEqual(["sqlite"]);
  });

  test("ProductionSafety covers default env argument and custom allow env key branch", () => {
    const oldNodeEnv = process.env.NODE_ENV;
    const oldAppEnv = process.env.APP_ENV;

    process.env.NODE_ENV = "production";
    delete process.env.APP_ENV;
    expect(isProductionRuntime()).toBe(true);

    process.env.NODE_ENV = "development";
    const nonProdResult = checkProductionDestructiveCommand({
      command: "migrate:fresh",
      force: false,
      yes: false,
    });
    expect(nonProdResult).toEqual({ allowed: true });

    process.env.NODE_ENV = "production";
    const result = checkProductionDestructiveCommand({
      command: "migrate:fresh",
      force: true,
      yes: true,
      allowEnvKey: "CUSTOM_ALLOW",
      env: {
        NODE_ENV: "production",
        CUSTOM_ALLOW: "true",
      } as NodeJS.ProcessEnv,
    });
    expect(result).toEqual({ allowed: true });

    if (oldNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = oldNodeEnv;
    if (oldAppEnv === undefined) delete process.env.APP_ENV;
    else process.env.APP_ENV = oldAppEnv;
  });

  test("ImportResolver falls back to eloquent-orm.js when package name is blank", async () => {
    const fsModule = require("fs") as typeof import("fs");
    const readSpy = jest
      .spyOn(fsModule, "readFileSync")
      .mockReturnValue('{ "name": "   " }');
    const cwdSpy = jest.spyOn(process, "cwd").mockReturnValue(path.join(os.tmpdir(), "outside-repo"));

    jest.resetModules();
    const { ImportResolver } = await import("../cli/utils/ImportResolver");

    expect(ImportResolver.coreImportPath(true)).toBe("eloquent-orm.js");
    expect(ImportResolver.schemaImportPath(false)).toBe("eloquent-orm.js");

    readSpy.mockRestore();
    cwdSpy.mockRestore();
  });

  test("PathMap.migrations uses the default isTest argument when omitted", () => {
    expect(PathMap.migrations()).toBe(PathMap.MIGRATIONS_ROOT);
  });

  test("migrateStatus default options handle .js files and applied-status branch", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-phase29-status-"));
    const migrationsDir = path.join(root, "sqlite");
    fs.mkdirSync(migrationsDir, { recursive: true });

    const jsMigration = "202603090001_create_users_table.js";
    const tsMigration = "202603090002_create_posts_table.ts";
    fs.writeFileSync(path.join(migrationsDir, jsMigration), "", "utf8");
    fs.writeFileSync(path.join(migrationsDir, tsMigration), "", "utf8");
    fs.writeFileSync(path.join(migrationsDir, "ignore.txt"), "", "utf8");

    const query = jest.fn(async () => [
      { name: jsMigration, batch: 7, run_at: "2026-03-09T00:00:00.000Z" },
    ]);
    const getAdapter = jest.fn(async () => ({ query }));
    const closeAllConnections = jest.fn(async () => undefined);
    const resolveConnectionName = jest.fn(() => "sqlite");

    jest.doMock("chalk", () => ({
      __esModule: true,
      default: {
        yellow: (v: string) => v,
        gray: (v: string) => v,
        cyan: (v: string) => v,
        red: (v: string) => v,
      },
    }));
    jest.doMock("../cli/utils/PathMap", () => ({
      PathMap: {
        migrations: () => migrationsDir,
      },
    }));
    jest.doMock("../core/connection/ConnectionFactory", () => ({
      getAdapter,
      closeAllConnections,
    }));
    jest.doMock("../core/connection/resolveConnectionName", () => ({
      resolveConnectionName,
    }));

    const logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
    const tableSpy = jest.spyOn(console, "table").mockImplementation(() => undefined);

    const { migrateStatus } = await import("../cli/commands/migrateStatus");
    await migrateStatus();

    expect(resolveConnectionName).toHaveBeenCalledWith(undefined, { test: false });
    expect(getAdapter).toHaveBeenCalledWith("sqlite");
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("Connected to sqlite."));
    expect(tableSpy).toHaveBeenCalledTimes(1);

    const tableRows = tableSpy.mock.calls[0][0] as Array<Record<string, unknown>>;
    expect(tableRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          Migration: jsMigration,
          Status: "Applied",
          Batch: 7,
          RunAt: "2026-03-09T00:00:00.000Z",
        }),
        expect.objectContaining({
          Migration: tsMigration,
          Status: "Pending",
          Batch: "-",
          RunAt: "-",
        }),
      ])
    );
    expect(tableRows.some((row) => row.Migration === "ignore.txt")).toBe(false);
    expect(closeAllConnections).toHaveBeenCalledTimes(1);

    fs.rmSync(root, { recursive: true, force: true });
  });
});

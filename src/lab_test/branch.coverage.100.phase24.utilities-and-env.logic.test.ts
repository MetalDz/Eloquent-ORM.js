import fs from "fs";
import path from "path";
import { PathMap } from "../cli/utils/PathMap";
import {
  assertSeedBootstrapPrecheck,
  printSeedBootstrapPrecheck,
  runSeedBootstrapPrecheck,
} from "../cli/utils/SeedBootstrapPrecheck";
import {
  resolveDbExecutionRole,
  resolveMysqlEnv,
  resolvePgEnv,
  resolveSqlitePath,
} from "../config/dbRoleEnv";
import { dbConfig } from "../config/database";
import {
  closeAllConnections,
  getAdapter,
} from "../core/connection/ConnectionFactory";
import { resolveConnectionName } from "../core/connection/resolveConnectionName";
import { SchemaValidator } from "../core/schema/SchemaValidator";

jest.mock("@faker-js/faker", () => ({
  faker: {},
}));

jest.mock("chalk", () => ({
  __esModule: true,
  default: {
    cyan: (value: string) => value,
    green: (value: string) => value,
    red: (value: string) => value,
    yellow: (value: string) => value,
  },
}));

jest.mock("../core/connection/ConnectionFactory", () => ({
  closeAllConnections: jest.fn(),
  getAdapter: jest.fn(),
}));

jest.mock("../core/connection/resolveConnectionName", () => ({
  resolveConnectionName: jest.fn(),
}));

const { Factory } = require("../cli/utils/factories/Factory") as typeof import("../cli/utils/factories/Factory");

const mockedCloseAllConnections =
  closeAllConnections as jest.MockedFunction<typeof closeAllConnections>;
const mockedGetAdapter = getAdapter as jest.MockedFunction<typeof getAdapter>;
const mockedResolveConnectionName =
  resolveConnectionName as jest.MockedFunction<typeof resolveConnectionName>;

describe("Branch coverage 100% - phase 24 utilities/env deep edge closure", () => {
  const originalEnv = { ...process.env };
  const originalConnections = dbConfig.connections;
  const originalDefault = dbConfig.default;
  const originalExistsSync = fs.existsSync;
  const originalReaddirSync = fs.readdirSync;
  const dirFixtures = new Map<string, { exists: boolean; files: string[] }>();

  beforeEach(() => {
    jest.clearAllMocks();
    process.exitCode = 0;
    process.env = { ...originalEnv };
    dbConfig.connections = { ...originalConnections };
    dbConfig.default = originalDefault;
    dirFixtures.clear();

    mockedCloseAllConnections.mockResolvedValue(undefined);
    mockedResolveConnectionName.mockReturnValue("mysql" as never);
    mockedGetAdapter.mockResolvedValue({
      query: jest.fn(async () => []),
    } as never);

    jest.spyOn(console, "log").mockImplementation(() => undefined);
    jest.spyOn(fs, "existsSync").mockImplementation((target: fs.PathLike) => {
      const normalized = path.resolve(String(target));
      const fixture = dirFixtures.get(normalized);
      if (fixture) return fixture.exists;
      return originalExistsSync(target);
    });
    jest.spyOn(fs, "readdirSync").mockImplementation((target: fs.PathLike) => {
      const normalized = path.resolve(String(target));
      const fixture = dirFixtures.get(normalized);
      if (fixture) {
        return fixture.files as unknown as ReturnType<typeof fs.readdirSync>;
      }
      return originalReaddirSync(target) as unknown as ReturnType<typeof fs.readdirSync>;
    });
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    dbConfig.connections = originalConnections;
    dbConfig.default = originalDefault;
    process.exitCode = 0;
    jest.restoreAllMocks();
  });

  test("Factory covers beforeCreate non-object branch, falsy create return branch, related() default count, and settled rejection race branch", async () => {
    class Phase24Factory extends Factory<any> {
      model: any;
      constructor(model: any) {
        super();
        this.model = model;
      }
      definition(index = 0): Record<string, unknown> {
        return { idx: index, base: true };
      }
      async callRelated(factoryOrCtor: any, count?: number): Promise<any> {
        return this.related(factoryOrCtor, count as any);
      }
    }

    class FalsyCreateModel {
      public payload: Record<string, unknown> = {};
      async create(data: Record<string, unknown>): Promise<void> {
        this.payload = data;
        return undefined;
      }
    }

    const falsyFactory = new Phase24Factory(FalsyCreateModel);
    falsyFactory.beforeCreate = async () => true as any;
    const created = await falsyFactory.create({ custom: "x" }, 7);
    expect(created.payload).toEqual({ idx: 7, base: true, custom: "x" });

    class RelatedModel {
      async create(): Promise<{ ok: boolean }> {
        return { ok: true };
      }
    }

    class RelatedFactory extends Phase24Factory {
      constructor() {
        super(RelatedModel);
      }
    }

    await expect(falsyFactory.callRelated(new RelatedFactory())).resolves.toEqual({
      ok: true,
    });

    class FailingFactory extends Phase24Factory {
      constructor() {
        super(class {});
      }
      async create(_attrs: any, index = 0): Promise<any> {
        if (index === 0) {
          throw new Error("primary-failure");
        }
        await new Promise((resolve) => setTimeout(resolve, 10));
        throw new Error("secondary-failure");
      }
    }

    const failing = new FailingFactory();
    await expect(failing.createMany(2, undefined, 2)).rejects.toThrow(
      "primary-failure"
    );
    await new Promise((resolve) => setTimeout(resolve, 25));

    // Force executor re-entry to cover settled early-return guard in next()
    const NativePromise = Promise;
    function DoubleExecutorPromise<T>(
      executor: (
        resolve: (value: T | PromiseLike<T>) => void,
        reject: (reason?: unknown) => void
      ) => void
    ) {
      return new NativePromise<T>((resolve, reject) => {
        executor(resolve, reject);
        executor(resolve, reject);
      });
    }
    (DoubleExecutorPromise as unknown as { prototype: unknown }).prototype =
      NativePromise.prototype;

    (global as unknown as { Promise: typeof Promise }).Promise =
      DoubleExecutorPromise as unknown as typeof Promise;
    try {
      const noWorkFactory = new Phase24Factory(FalsyCreateModel);
      await expect(noWorkFactory.createMany(0, undefined, 2)).resolves.toEqual([]);
    } finally {
      (global as unknown as { Promise: typeof Promise }).Promise = NativePromise;
    }
  });

  test("dbRoleEnv covers default-env parameters and numeric fallback parsing branches", () => {
    process.env.ELOQUENT_DB_ROLE = "  migration  ";
    process.env.DB_PORT = "not-a-number";
    process.env.PG_PORT = "invalid-port";
    delete process.env.SQLITE_PATH;
    delete process.env.SQLITE_MIGRATION_PATH;
    delete process.env.SQLITE_RUNTIME_PATH;

    expect(resolveDbExecutionRole()).toBe("migration");

    const mysql = resolveMysqlEnv();
    expect(mysql.port).toBe(3306);

    const pg = resolvePgEnv();
    expect(pg.port).toBe(5432);

    const sqlite = resolveSqlitePath();
    expect(sqlite).toBe("./data.sqlite");
  });

  test("SeedBootstrapPrecheck covers list filtering, string-error catch branch, pending print branch, and assert() default options", async () => {
    const mysqlMigrationsDir = PathMap.migrations(false, "mysql" as never);
    dirFixtures.set(path.resolve(mysqlMigrationsDir), {
      exists: true,
      files: ["20260301000001_create_users_table.ts", "20260301000002_patch.js", "README.md"],
    });

    (dbConfig.connections as Record<string, { driver?: string }>).mysql = {
      driver: "mysql",
    };

    mockedGetAdapter.mockRejectedValueOnce("raw-adapter-error" as never);
    const errorReport = await runSeedBootstrapPrecheck({
      connectionNames: ["mysql" as never],
    });

    expect(errorReport.clean).toBe(false);
    expect(errorReport.checks[0].reasons).toContain(
      "Unable to read migrations table: raw-adapter-error"
    );

    const adapter = {
      query: jest.fn(async () => [{ name: "20260301000001_create_users_table.ts" }]),
    };
    mockedGetAdapter.mockResolvedValueOnce(adapter as never);

    const pendingReport = await runSeedBootstrapPrecheck({
      connectionNames: ["mysql" as never],
    });
    expect(pendingReport.clean).toBe(false);
    expect(pendingReport.checks[0].pendingMigrations).toEqual([
      "20260301000002_patch.js",
    ]);

    printSeedBootstrapPrecheck(pendingReport);
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("Pending files: 20260301000002_patch.js")
    );

    printSeedBootstrapPrecheck({
      clean: false,
      checks: [
        {
          connectionName: "mysql" as never,
          migrationsDir: mysqlMigrationsDir,
          clean: false,
          reasons: ["manual-reason"],
          pendingMigrations: [],
        },
      ],
    });

    mockedGetAdapter.mockResolvedValueOnce({
      query: jest.fn(async () => [
        { name: "20260301000001_create_users_table.ts" },
        { name: "20260301000002_patch.js" },
      ]),
    } as never);

    const clean = await assertSeedBootstrapPrecheck();
    expect(clean).toBe(true);
    expect(process.exitCode).toBe(0);
    expect(mockedResolveConnectionName).toHaveBeenCalledWith(undefined, {
      test: false,
    });

    mockedGetAdapter.mockResolvedValueOnce({
      query: jest.fn(async () => [
        { name: "20260301000001_create_users_table.ts" },
        { name: "20260301000002_patch.js" },
      ]),
    } as never);
    await expect(runSeedBootstrapPrecheck()).resolves.toMatchObject({ clean: true });
  });

  test("SchemaValidator covers numeric-min/string-max plus required null/empty and valid-email branches", async () => {
    const errors = await SchemaValidator.validateData(
      {
        requiredNull: null,
        requiredEmpty: "",
        score: 1,
        title: "toolong",
        emailOk: "valid@example.com",
      },
      {
        requiredNull: { required: true },
        requiredEmpty: { required: true },
        score: { min: 2 },
        title: { max: 3 },
        emailOk: { email: true },
      }
    );

    expect(errors).toEqual(
      expect.arrayContaining([
        { field: "requiredNull", message: "is required" },
        { field: "requiredEmpty", message: "is required" },
        { field: "score", message: "must be >= 2" },
        { field: "title", message: "must be less than 3 characters" },
      ])
    );
  });
});

jest.mock("chalk", () => {
  const passthrough = (value: unknown): string => String(value ?? "");
  const proxy = new Proxy(passthrough, {
    get: () => passthrough,
    apply: (_target, _thisArg, args: unknown[]) => passthrough(args[0]),
  });
  return { __esModule: true, default: proxy };
});

const fs = require("fs") as typeof import("fs");
const { PathMap } = require("../cli/utils/PathMap") as typeof import("../cli/utils/PathMap");
const artifactStorage = require("../cli/utils/ArtifactStorage") as typeof import("../cli/utils/ArtifactStorage");
const tsRuntime = require("../cli/utils/typescript/tsRuntime") as typeof import("../cli/utils/typescript/tsRuntime");
const migrateFreshCommand = require("../cli/commands/migrateFresh") as typeof import("../cli/commands/migrateFresh");
const dbSeedCommand = require("../cli/commands/dbSeed") as typeof import("../cli/commands/dbSeed");
const connectionFactory = require("../core/connection/ConnectionFactory") as typeof import("../core/connection/ConnectionFactory");
const { dbSeed } = dbSeedCommand;
const { dbSeedFresh } = require("../cli/commands/dbSeedFresh") as typeof import("../cli/commands/dbSeedFresh");

describe("db seed connection env routing", () => {
  const originalDbConnection = process.env.DB_CONNECTION;
  const originalDbTestConnection = process.env.DB_TEST_CONNECTION;

  beforeEach(() => {
    process.env.DB_CONNECTION = "mysql_test";
    process.env.DB_TEST_CONNECTION = "mysql_test";

    jest
      .spyOn(artifactStorage, "resolveSeederStorageKindFromFile")
      .mockReturnValue("unknown");
    jest.spyOn(console, "log").mockImplementation(() => undefined);
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
    jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.env.DB_CONNECTION = "mysql_test";
    process.env.DB_TEST_CONNECTION = "mysql_test";
  });

  afterAll(() => {
    process.env.DB_CONNECTION = originalDbConnection;
    process.env.DB_TEST_CONNECTION = originalDbTestConnection;
  });

  test("dbSeed syncs DB_CONNECTION with selected test connection", async () => {
    const seenConnections: string[] = [];

    jest.spyOn(PathMap, "seeds").mockReturnValue("virtual-seeds");
    jest.spyOn(fs, "existsSync").mockReturnValue(true);
    jest
      .spyOn(fs, "readdirSync")
      .mockReturnValue(["BlogScenarioSeeder.ts"] as unknown as ReturnType<typeof fs.readdirSync>);
    jest.spyOn(tsRuntime, "loadModule").mockReturnValue({
      BlogScenarioSeeder: async () => {
        seenConnections.push(
          `${process.env.DB_CONNECTION}|${process.env.DB_TEST_CONNECTION}`
        );
      },
    });

    await dbSeed({
      test: true,
      class: "BlogScenarioSeeder",
      connectionNames: ["pg_test"],
      close: false,
      exit: false,
    });

    expect(seenConnections).toEqual(["pg_test|pg_test"]);
    expect(process.env.DB_CONNECTION).toBe("mysql_test");
    expect(process.env.DB_TEST_CONNECTION).toBe("mysql_test");
  });

  test("dbSeedFresh syncs DB_CONNECTION during each test connection cycle", async () => {
    const seenConnections: string[] = [];

    jest
      .spyOn(migrateFreshCommand, "migrateFresh")
      .mockImplementation(async () => {
        seenConnections.push(
          `fresh:${process.env.DB_CONNECTION}|${process.env.DB_TEST_CONNECTION}`
        );
      });

    jest.spyOn(dbSeedCommand, "dbSeed").mockImplementation(async () => {
      seenConnections.push(
        `seed:${process.env.DB_CONNECTION}|${process.env.DB_TEST_CONNECTION}`
      );
    });

    jest
      .spyOn(connectionFactory, "closeAllConnections")
      .mockImplementation(async () => undefined);

    await dbSeedFresh({
      test: true,
      class: "BlogScenarioSeeder",
      connectionNames: ["pg_test"],
    });

    expect(seenConnections).toEqual([
      "fresh:pg_test|pg_test",
      "seed:pg_test|pg_test",
    ]);
    expect(process.env.DB_CONNECTION).toBe("mysql_test");
    expect(process.env.DB_TEST_CONNECTION).toBe("mysql_test");
  });

  test("dbSeed toggles ELOQUENT_DISABLE_MODEL_HOOKS only during run when noHooks is enabled", async () => {
    const originalDisableHooks = process.env.ELOQUENT_DISABLE_MODEL_HOOKS;
    const seenFlags: string[] = [];

    jest.spyOn(PathMap, "seeds").mockReturnValue("virtual-seeds");
    jest.spyOn(fs, "existsSync").mockReturnValue(true);
    jest
      .spyOn(fs, "readdirSync")
      .mockReturnValue(["BlogScenarioSeeder.ts"] as unknown as ReturnType<typeof fs.readdirSync>);
    jest.spyOn(tsRuntime, "loadModule").mockReturnValue({
      BlogScenarioSeeder: async () => {
        seenFlags.push(String(process.env.ELOQUENT_DISABLE_MODEL_HOOKS));
      },
    });

    try {
      delete process.env.ELOQUENT_DISABLE_MODEL_HOOKS;
      await dbSeed({
        test: true,
        class: "BlogScenarioSeeder",
        connectionNames: ["pg_test"],
        noHooks: true,
        close: false,
        exit: false,
      });
    } finally {
      if (originalDisableHooks === undefined) {
        delete process.env.ELOQUENT_DISABLE_MODEL_HOOKS;
      } else {
        process.env.ELOQUENT_DISABLE_MODEL_HOOKS = originalDisableHooks;
      }
    }

    expect(seenFlags).toEqual(["true"]);
    expect(process.env.ELOQUENT_DISABLE_MODEL_HOOKS).toBe(originalDisableHooks);
  });

  test("dbSeed filters incompatible SQL seeders when targeting mongo", async () => {
    const seenSeeders: string[] = [];

    jest.spyOn(PathMap, "seeds").mockReturnValue("virtual-seeds");
    jest.spyOn(fs, "existsSync").mockReturnValue(true);
    jest
      .spyOn(fs, "readdirSync")
      .mockReturnValue([
        "BlogScenarioSeeder.ts",
        "GeoLocationSeeder.ts",
      ] as unknown as ReturnType<typeof fs.readdirSync>);
    jest
      .spyOn(artifactStorage, "resolveSeederStorageKindFromFile")
      .mockImplementation((filePath: string) =>
        filePath.includes("GeoLocationSeeder") ? "mongo" : "sql"
      );
    jest.spyOn(tsRuntime, "loadModule").mockImplementation((filePath: string) => {
      if (filePath.includes("GeoLocationSeeder")) {
        return {
          GeoLocationSeeder: async () => {
            seenSeeders.push("GeoLocationSeeder");
          },
        };
      }

      return {
        BlogScenarioSeeder: async () => {
          seenSeeders.push("BlogScenarioSeeder");
        },
      };
    });

    await dbSeed({
      test: true,
      connectionNames: ["mongo_test"],
      close: false,
      exit: false,
    });

    expect(seenSeeders).toEqual(["GeoLocationSeeder"]);
  });

  test("dbSeedFresh forwards noHooks and silent flags to dbSeed", async () => {
    jest.spyOn(migrateFreshCommand, "migrateFresh").mockImplementation(async () => undefined);
    const dbSeedSpy = jest
      .spyOn(dbSeedCommand, "dbSeed")
      .mockImplementation(async () => undefined);
    jest
      .spyOn(connectionFactory, "closeAllConnections")
      .mockImplementation(async () => undefined);

    await dbSeedFresh({
      test: true,
      class: "BlogScenarioSeeder",
      connectionNames: ["pg_test"],
      noHooks: true,
      silent: true,
    });

    expect(dbSeedSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        noHooks: true,
        silent: true,
      })
    );
  });
});

export {};

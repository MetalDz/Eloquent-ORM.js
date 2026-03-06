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
});

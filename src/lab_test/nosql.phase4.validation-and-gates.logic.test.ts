import fs from "fs";
import path from "path";
import { PathMap } from "../cli/utils/PathMap";
import { dbSeed } from "../cli/commands/dbSeed";
import { demoScenario } from "../cli/commands/demoScenario";
import * as tsRuntime from "../cli/utils/typescript/tsRuntime";
import * as connectionFactory from "../core/connection/ConnectionFactory";
import * as resolveConnectionModule from "../core/connection/resolveConnectionName";

jest.mock("chalk", () => ({
  __esModule: true,
  default: new Proxy(
    (value: unknown): string => String(value ?? ""),
    {
      get: () => (value: unknown): string => String(value ?? ""),
      apply: (_target, _thisArg, args: unknown[]) => String(args[0] ?? ""),
    }
  ),
}));

describe("NoSQL phase 4 validation and quality gates", () => {
  const originalDbConnection = process.env.DB_CONNECTION;
  const originalDbTestConnection = process.env.DB_TEST_CONNECTION;
  const originalCli = process.env.ELOQUENT_CLI;

  beforeEach(() => {
    jest.restoreAllMocks();
    process.env.DB_CONNECTION = "mysql";
    process.env.DB_TEST_CONNECTION = "mysql_test";
    delete process.env.ELOQUENT_CLI;
    jest.spyOn(console, "log").mockImplementation(() => undefined);
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
    jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.env.DB_CONNECTION = originalDbConnection;
    process.env.DB_TEST_CONNECTION = originalDbTestConnection;
    if (originalCli === undefined) {
      delete process.env.ELOQUENT_CLI;
    } else {
      process.env.ELOQUENT_CLI = originalCli;
    }
  });

  test("db:seed routes mongo app/test connections with expected env binding", async () => {
    const seenEnv: string[] = [];

    jest.spyOn(PathMap, "seeds").mockReturnValue("virtual-seeds");
    jest.spyOn(fs, "existsSync").mockReturnValue(true);
    jest
      .spyOn(fs, "readdirSync")
      .mockReturnValue(["MongoSeeder.ts"] as unknown as ReturnType<typeof fs.readdirSync>);
    jest.spyOn(tsRuntime, "loadModule").mockReturnValue({
      MongoSeeder: async () => {
        seenEnv.push(
          `${process.env.DB_CONNECTION ?? "missing"}|${process.env.DB_TEST_CONNECTION ?? "missing"}`
        );
      },
    });

    await dbSeed({
      class: "MongoSeeder",
      connectionNames: ["mongo" as never],
      close: false,
      exit: false,
    });

    await dbSeed({
      test: true,
      class: "MongoSeeder",
      connectionNames: ["mongo_test" as never],
      close: false,
      exit: false,
    });

    expect(seenEnv).toEqual(["mongo|mysql_test", "mongo_test|mongo_test"]);
    expect(process.env.DB_CONNECTION).toBe("mysql");
    expect(process.env.DB_TEST_CONNECTION).toBe("mysql_test");
  });

  test("demo:scenario uses mongo connection routing for app and test without SQL adapter", async () => {
    const mongoDb = {
      collection: jest.fn((name: string) => {
        if (name === "users") {
          return {
            countDocuments: jest.fn(async () => 1),
            findOne: jest.fn(async () => ({ id: 1, _id: "mongo-id" })),
          };
        }
        if (name === "posts") {
          return {
            countDocuments: jest.fn(async () => 1),
            find: jest.fn(() => ({
              limit: () => ({
                toArray: async () => [{ id: 11 }],
              }),
            })),
          };
        }
        if (name === "comments") {
          return {
            countDocuments: jest.fn(async () => 1),
          };
        }
        return {
          countDocuments: jest.fn(async () => 1),
          find: jest.fn(() => ({
            limit: () => ({
              toArray: async () => [{ post_id: 11 }],
            }),
          })),
        };
      }),
    };

    jest
      .spyOn(resolveConnectionModule, "resolveConnectionName")
      .mockReturnValueOnce("mongo" as never)
      .mockReturnValueOnce("mongo_test" as never);
    const getConnectionSpy = jest
      .spyOn(connectionFactory, "getConnection")
      .mockResolvedValue(mongoDb as never);
    const getAdapterSpy = jest
      .spyOn(connectionFactory, "getAdapter")
      .mockResolvedValue({} as never);
    jest
      .spyOn(connectionFactory, "closeAllConnections")
      .mockImplementation(async () => undefined);

    await demoScenario({ test: false, user: 1 });
    await demoScenario({ test: true, user: 1 });

    expect(getConnectionSpy).toHaveBeenNthCalledWith(1, "mongo");
    expect(getConnectionSpy).toHaveBeenNthCalledWith(2, "mongo_test");
    expect(getAdapterSpy).not.toHaveBeenCalled();
  });

  test("pack-smoke script covers NoSQL runtime wiring checks", () => {
    const script = fs.readFileSync(
      path.resolve(process.cwd(), "scripts/pack-smoke.js"),
      "utf8"
    );

    const requiredSnippets = [
      "function runNoSqlRuntimeSmoke(sample)",
      '["make:migration", "--all", "--test", "--mongo"]',
      '["migrate:status", "--test", "--mongo"]',
      '["migrate:run", "--test", "--mongo"]',
      '["migrate:rollback", "--test", "--mongo"]',
      "ELOQUENT_PACK_SMOKE_ENABLE_MONGO_RUNTIME",
      "NoSQL runtime smoke skipped",
      "Migration Status",
      "migration(s) applied successfully",
      "runNoSqlRuntimeSmoke(blogSample);",
    ];

    for (const snippet of requiredSnippets) {
      expect(script).toContain(snippet);
    }
  });
});

export {};

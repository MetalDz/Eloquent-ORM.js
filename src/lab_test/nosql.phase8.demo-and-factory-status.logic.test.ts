import fs from "fs";
import path from "path";
import { dbConfig } from "../config/database.js";
import { demoScenario } from "../cli/commands/demoScenario.js";
import * as connectionFactory from "../core/connection/ConnectionFactory.js";
import * as resolveConnectionModule from "../core/connection/resolveConnectionName.js";

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

type ParsedCommand = {
  name: string;
  optionFlags: string[];
};

const rootDir = process.cwd();
const cliSourcePaths = [
  path.resolve(rootDir, "src/cli/eloquent.ts"),
  path.resolve(rootDir, "src/cli/utils/CliSupportCommandRegistration.ts"),
  path.resolve(rootDir, "src/cli/utils/CliSeedScenarioCommandRegistration.ts"),
];

function parseCommandBlocks(source: string): ParsedCommand[] {
  const commandMatches = [...source.matchAll(/\.command\(\s*"([^"]+)"\s*\)/g)];
  const parseBoundary = source.indexOf("program.parse(process.argv);");
  const defaultBoundary = parseBoundary === -1 ? source.length : parseBoundary;

  return commandMatches.map((match, index) => {
    const declaration = match[1];
    const start = match.index ?? 0;
    const nextStart =
      index + 1 < commandMatches.length
        ? commandMatches[index + 1].index ?? defaultBoundary
        : defaultBoundary;
    const block = source.slice(start, nextStart);
    const optionFlags = [...block.matchAll(/\.option\(\s*"([^"]+)"/g)].map(
      (optionMatch) => optionMatch[1]
    );

    return {
      name: declaration.split(" ")[0],
      optionFlags,
    };
  });
}

function parseCommandBlocksFromFiles(sourcePaths: string[]): ParsedCommand[] {
  return sourcePaths.flatMap((sourcePath) =>
    parseCommandBlocks(fs.readFileSync(sourcePath, "utf8"))
  );
}

describe("NoSQL phase 8 demo/factory-status parity", () => {
  const originalConnections = dbConfig.connections;

  beforeEach(() => {
    jest.restoreAllMocks();
    dbConfig.connections = { ...originalConnections };
    delete process.env.ELOQUENT_CLI;
    jest.spyOn(console, "log").mockImplementation(() => undefined);
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
    jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    dbConfig.connections = { ...originalConnections };
    delete process.env.ELOQUENT_CLI;
  });

  test("demoScenario honors an explicit mongo connection target without SQL adapter fallback", async () => {
    (dbConfig.connections as Record<string, { driver?: string }>).mongo_test = {
      driver: "mongo",
    };

    const usersCollection = {
      countDocuments: jest.fn(async () => 1),
      findOne: jest.fn(async () => ({ id: 1, _id: "mongo-user-1" })),
      find: jest.fn(() => ({
        limit: () => ({
          toArray: async () => [],
        }),
      })),
      aggregate: jest.fn(() => ({
        toArray: async () => [{ id: 1, _id: "mongo-user-1" }],
      })),
    };
    const postsCollection = {
      countDocuments: jest.fn(async () => 0),
      find: jest.fn(() => ({
        limit: () => ({
          toArray: async () => [],
        }),
      })),
    };
    const commentsCollection = {
      countDocuments: jest.fn(async () => 0),
      find: jest.fn(() => ({
        limit: () => ({
          toArray: async () => [],
        }),
      })),
    };
    const pivotCollection = {
      countDocuments: jest.fn(async () => 0),
      find: jest.fn(() => ({
        limit: () => ({
          toArray: async () => [],
        }),
      })),
    };
    const db = {
      collection: jest.fn((name: string) => {
        if (name === "users") return usersCollection;
        if (name === "posts") return postsCollection;
        if (name === "comments") return commentsCollection;
        return pivotCollection;
      }),
    };

    const resolveSpy = jest
      .spyOn(resolveConnectionModule, "resolveConnectionName")
      .mockReturnValue("sqlite_test" as never);
    const getConnectionSpy = jest
      .spyOn(connectionFactory, "getConnection")
      .mockResolvedValue(db as never);
    const getAdapterSpy = jest
      .spyOn(connectionFactory, "getAdapter")
      .mockResolvedValue({} as never);
    jest
      .spyOn(connectionFactory, "closeAllConnections")
      .mockImplementation(async () => undefined);

    await demoScenario({
      test: true,
      connectionName: "mongo_test",
      user: 1,
    });

    expect(resolveSpy).not.toHaveBeenCalled();
    expect(getConnectionSpy).toHaveBeenCalledWith("mongo_test");
    expect(getAdapterSpy).not.toHaveBeenCalled();
  });

  test("CLI command surface exposes explicit driver targeting for demo:scenario and factory:status", () => {
    const commandMap = new Map(
      parseCommandBlocksFromFiles(cliSourcePaths).map((command) => [command.name, command])
    );

    expect(commandMap.get("demo:scenario")?.optionFlags).toEqual(
      expect.arrayContaining([
        "--user <id>",
        "--random",
        "--test",
        "--mysql",
        "--pg",
        "--sqlite",
        "--mongo",
      ])
    );

    expect(commandMap.get("factory:status")?.optionFlags).toEqual(
      expect.arrayContaining([
        "--test",
        "--mysql",
        "--pg",
        "--sqlite",
        "--mongo",
        "--all-connections",
        "--details",
        "--graph",
      ])
    );
  });
});

export {};

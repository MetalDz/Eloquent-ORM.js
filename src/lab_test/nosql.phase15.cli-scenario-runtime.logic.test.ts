import fs from "fs";
import os from "os";
import path from "path";
import { dbConfig } from "../config/database.js";
import { demoScenario } from "../cli/commands/demoScenario.js";
import * as connectionFactory from "../core/connection/ConnectionFactory.js";
import { PathMap } from "../cli/utils/PathMap.js";

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

describe("NoSQL phase 15 mongo CLI scenario runtime parity", () => {
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

  test("mongo demoScenario resolves morph aliases from model files and counts favorites via id/_id fallback", async () => {
    (dbConfig.connections as Record<string, { driver?: string }>).mongo_test = {
      driver: "mongo",
    };

    const modelsDir = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-mongo-scenario-models-"));
    const userModelPath = path.join(modelsDir, "User.ts");
    const postModelPath = path.join(modelsDir, "Post.ts");
    fs.writeFileSync(
      userModelPath,
      'export class User { static getMorphClass() { return "accounts"; } }\n',
      "utf8"
    );
    fs.writeFileSync(
      postModelPath,
      'export class Post { static getMorphClass() { return "articles"; } }\n',
      "utf8"
    );

    jest.spyOn(PathMap, "models").mockReturnValue(modelsDir);

    const usersCollection = {
      countDocuments: jest.fn(async () => 5),
      aggregate: jest.fn(() => ({
        toArray: async () => [{ _id: "mongo-user-1", name: "Alpha" }],
      })),
    };
    const postsCollection = {
      countDocuments: jest.fn(async (filter: Record<string, unknown>) => {
        if (Object.keys(filter).length === 0) {
          return 15;
        }

        expect(filter).toEqual({
          $or: [
            { id: { $in: ["p1", "p2"] } },
            { _id: { $in: ["p1", "p2"] } },
          ],
        });
        return 2;
      }),
      find: jest.fn((filter: Record<string, unknown>) => {
        expect(filter).toEqual({ user_id: "mongo-user-1" });
        return {
          limit: () => ({
            toArray: async () => [
              { _id: "p1", title: "Post A" },
              { _id: "p2", title: "Post B" },
            ],
          }),
        };
      }),
    };
    const commentsCollection = {
      countDocuments: jest.fn(async (filter: Record<string, unknown>) => {
        if (Object.keys(filter).length === 0) {
          return 35;
        }
        if (filter.commentable_type === "accounts") {
          expect(filter).toEqual({
            commentable_id: "mongo-user-1",
            commentable_type: "accounts",
          });
          return 1;
        }
        expect(filter).toEqual({
          commentable_id: { $in: ["p1", "p2"] },
          commentable_type: "articles",
        });
        return 5;
      }),
    };
    const pivotCollection = {
      countDocuments: jest.fn(async () => 10),
      find: jest.fn((filter: Record<string, unknown>) => {
        expect(filter).toEqual({ user_id: "mongo-user-1" });
        return {
          limit: () => ({
            toArray: async () => [{ post_id: "p1" }, { post_id: "p2" }],
          }),
        };
      }),
    };
    const db = {
      collection: jest.fn((name: string) => {
        if (name === "users") return usersCollection;
        if (name === "posts") return postsCollection;
        if (name === "comments") return commentsCollection;
        return pivotCollection;
      }),
    };

    const getConnectionSpy = jest
      .spyOn(connectionFactory, "getConnection")
      .mockResolvedValue(db as never);
    const getAdapterSpy = jest
      .spyOn(connectionFactory, "getAdapter")
      .mockResolvedValue({} as never);
    jest
      .spyOn(connectionFactory, "closeAllConnections")
      .mockImplementation(async () => undefined);

    try {
      await demoScenario({
        test: true,
        connectionName: "mongo_test",
        random: true,
      });

      expect(getConnectionSpy).toHaveBeenCalledWith("mongo_test");
      expect(getAdapterSpy).not.toHaveBeenCalled();
      expect(PathMap.models).toHaveBeenCalledWith(true);
      expect(console.log).toHaveBeenCalledWith("favorite posts:", 2);
      expect(console.log).toHaveBeenCalledWith("comments on user:", 1);
      expect(console.log).toHaveBeenCalledWith("comments on posts:", 5);
    } finally {
      fs.rmSync(modelsDir, { recursive: true, force: true });
    }
  });

  test("pack-smoke covers live mongo blog scenario generation and demo counts", () => {
    const script = fs.readFileSync(
      path.resolve(process.cwd(), "scripts/pack-smoke.js"),
      "utf8"
    );

    const requiredSnippets = [
      '["make:scenario", "blog", "--test", "--mongo", "--controllers", "--services", "--run", "--force"]',
      '"nosql make:scenario --mongo --run"',
      '"Completed: BlogScenarioSeeder"',
      '"nosql demo:scenario blog --mongo"',
      '"users: 5"',
      '"posts: 15"',
      '"comments: 35"',
      '"post_user_pivot: 10"',
      '"favorite posts: 2"',
    ];

    for (const snippet of requiredSnippets) {
      expect(script).toContain(snippet);
    }
  });
});

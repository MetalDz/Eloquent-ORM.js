import fs from "fs";
import path from "path";

describe("LTS phase 5 DatabaseConnection coverage and ASCII cleanup", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
  });

  test("plan tracks the dedicated DatabaseConnection coverage + ASCII slice", () => {
    const planPath = path.resolve(
      process.cwd(),
      "validation tasks/LTS-Phase5-DatabaseConnection-Coverage-And-ASCII-Plan.md",
    );
    const content = fs.readFileSync(planPath, "utf8");

    expect(content).toContain("# LTS Phase 5 DatabaseConnection Coverage and ASCII Plan");
    expect(content).toContain("Status: COMPLETED");
    expect(content).toContain("src/core/connection/DatabaseConnection.ts");
    expect(content).toContain(
      "src/lab_test/lts.phase5.database-connection.coverage-and-ascii.logic.test.ts",
    );
    expect(content).toContain("Connected to MongoDB: ...");
    expect(content).toContain("Unsupported driver: ...");
  });

  test("DatabaseConnection source is ASCII-only and uses normalized runtime text", () => {
    const filePath = path.resolve(
      process.cwd(),
      "src/core/connection/DatabaseConnection.ts",
    );
    const content = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");

    expect(content).not.toMatch(/[^\x00-\x7F]/);
    expect(content).toContain("1. Type Declarations for Configurations");
    expect(content).toContain("2. Connect Function (Multi-Driver)");
    expect(content).toContain("Connected to MongoDB:");
    expect(content).toContain("Unsupported driver:");
  });

  test("connectDB covers empty Mongo DNS servers and generic cleanup failure normalization", async () => {
    const setServers = jest.fn();
    const getServers = jest.fn(() => ["127.0.0.1"]);
    const mongoClose = jest.fn().mockRejectedValue(new Error("close failed"));
    const MongoClient = jest.fn(() => ({
      connect: jest.fn().mockRejectedValue("plain mongo failure"),
      db: jest.fn(),
      close: mongoClose,
    }));

    jest.doMock("dns", () => ({
      __esModule: true,
      default: { setServers, getServers },
      setServers,
      getServers,
    }));
    jest.doMock("mongodb", () => ({ MongoClient }));
    jest.doMock("../config/database", () => ({
      dbConfig: {
        connections: {
          mongo_generic_error: {
            driver: "mongo",
            uri: "mongodb+srv://user:pass@example.mongodb.net/?appName=Cluster0",
            database: "Cluster0",
            dnsServers: ["   ", ""],
          },
        },
      },
    }));

    const { connectDB } = require("../core/connection/DatabaseConnection") as {
      connectDB: (name: string) => Promise<unknown>;
    };

    await expect(connectDB("mongo_generic_error")).rejects.toThrow("plain mongo failure");
    expect(setServers).not.toHaveBeenCalled();
    expect(mongoClose).toHaveBeenCalled();
  });

  test("connectDB covers missing Mongo DNS servers and generic Error passthrough", async () => {
    const setServers = jest.fn();
    const getServers = jest.fn(() => ["127.0.0.1"]);
    const genericError = new Error("generic mongo failure");
    const mongoClose = jest.fn().mockResolvedValue(undefined);
    const MongoClient = jest.fn(() => ({
      connect: jest.fn().mockRejectedValue(genericError),
      db: jest.fn(),
      close: mongoClose,
    }));

    jest.doMock("dns", () => ({
      __esModule: true,
      default: { setServers, getServers },
      setServers,
      getServers,
    }));
    jest.doMock("mongodb", () => ({ MongoClient }));
    jest.doMock("../config/database", () => ({
      dbConfig: {
        connections: {
          mongo_generic_passthrough: {
            driver: "mongo",
            uri: "mongodb+srv://user:pass@example.mongodb.net/?appName=Cluster0",
            database: "Cluster0",
          },
        },
      },
    }));

    const { connectDB } = require("../core/connection/DatabaseConnection") as {
      connectDB: (name: string) => Promise<unknown>;
    };

    await expect(connectDB("mongo_generic_passthrough")).rejects.toBe(genericError);
    expect(setServers).not.toHaveBeenCalled();
    expect(mongoClose).toHaveBeenCalled();
  });
});

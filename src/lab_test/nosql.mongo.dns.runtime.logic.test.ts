describe("NoSQL mongo runtime DNS hardening", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
  });

  test("connectDB applies custom DNS servers for mongodb+srv connections", async () => {
    const setServers = jest.fn();
    const getServers = jest.fn(() => ["127.0.0.1"]);
    const mongoConnect = jest.fn().mockResolvedValue(undefined);
    const mongoClose = jest.fn().mockResolvedValue(undefined);
    const mongoDb = { kind: "mongoDb" };
    const MongoClient = jest.fn(() => ({
      connect: mongoConnect,
      db: jest.fn(() => mongoDb),
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
          mongo: {
            driver: "mongo",
            uri: "mongodb+srv://user:pass@example.mongodb.net/?appName=Cluster0",
            database: "Cluster0",
            dnsServers: ["8.8.8.8", "1.1.1.1"],
          },
        },
      },
    }));

    const { connectDB, closeMongoClient } = require("../core/connection/DatabaseConnection") as {
      connectDB: (name: string) => Promise<unknown>;
      closeMongoClient: (connection: unknown) => Promise<boolean>;
    };

    const connection = await connectDB("mongo");

    expect(setServers).toHaveBeenCalledWith(["8.8.8.8", "1.1.1.1"]);
    expect(MongoClient).toHaveBeenCalledWith(
      "mongodb+srv://user:pass@example.mongodb.net/?appName=Cluster0"
    );
    expect(mongoConnect).toHaveBeenCalled();
    await expect(closeMongoClient(connection)).resolves.toBe(true);
    expect(mongoClose).toHaveBeenCalled();
  });

  test("connectDB skips DNS override for non-SRV uris and already-matching DNS servers", async () => {
    const setServers = jest.fn();
    const getServers = jest.fn(() => ["8.8.8.8", "1.1.1.1"]);
    const mongoConnect = jest.fn().mockResolvedValue(undefined);
    const MongoClient = jest.fn(() => ({
      connect: mongoConnect,
      db: jest.fn(() => ({ kind: "mongoDb" })),
      close: jest.fn().mockResolvedValue(undefined),
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
          mongo_plain: {
            driver: "mongo",
            uri: "mongodb://user:pass@host1:27017/?authSource=admin",
            database: "Cluster0",
            dnsServers: ["9.9.9.9"],
          },
          mongo_same: {
            driver: "mongo",
            uri: "mongodb+srv://user:pass@example.mongodb.net/?appName=Cluster0",
            database: "Cluster0",
            dnsServers: ["8.8.8.8", "1.1.1.1"],
          },
        },
      },
    }));

    const { connectDB } = require("../core/connection/DatabaseConnection") as {
      connectDB: (name: string) => Promise<unknown>;
    };

    await connectDB("mongo_plain");
    await connectDB("mongo_same");

    expect(setServers).not.toHaveBeenCalled();
    expect(mongoConnect).toHaveBeenCalledTimes(2);
  });

  test("connectDB normalizes Atlas auth failures into actionable guidance", async () => {
    const setServers = jest.fn();
    const getServers = jest.fn(() => ["8.8.8.8", "1.1.1.1"]);
    const authError = Object.assign(new Error("bad auth : authentication failed"), {
      code: 8000,
      codeName: "AtlasError",
    });
    const mongoClose = jest.fn().mockResolvedValue(undefined);
    const MongoClient = jest.fn(() => ({
      connect: jest.fn().mockRejectedValue(authError),
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
          mongo: {
            driver: "mongo",
            uri: "mongodb+srv://user:pass@example.mongodb.net/?appName=Cluster0",
            database: "Cluster0",
            dnsServers: ["8.8.8.8", "1.1.1.1"],
          },
        },
      },
    }));

    const { connectDB } = require("../core/connection/DatabaseConnection") as {
      connectDB: (name: string) => Promise<unknown>;
    };

    await expect(connectDB("mongo")).rejects.toThrow(
      'MongoDB authentication failed for "mongo".'
    );
    expect(mongoClose).toHaveBeenCalled();
  });

  test("connectDB normalizes SRV lookup failures into DNS guidance", async () => {
    const setServers = jest.fn();
    const getServers = jest.fn(() => ["127.0.0.1"]);
    const dnsError = Object.assign(
      new Error("querySrv ECONNREFUSED _mongodb._tcp.cluster0.example.mongodb.net"),
      {
        code: "ECONNREFUSED",
      }
    );
    const mongoClose = jest.fn().mockResolvedValue(undefined);
    const MongoClient = jest.fn(() => ({
      connect: jest.fn().mockRejectedValue(dnsError),
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
          mongo: {
            driver: "mongo",
            uri: "mongodb+srv://user:pass@example.mongodb.net/?appName=Cluster0",
            database: "Cluster0",
            dnsServers: ["8.8.8.8", "1.1.1.1"],
          },
        },
      },
    }));

    const { connectDB } = require("../core/connection/DatabaseConnection") as {
      connectDB: (name: string) => Promise<unknown>;
    };

    await expect(connectDB("mongo")).rejects.toThrow(
      'MongoDB SRV lookup failed for "mongo".'
    );
    expect(setServers).toHaveBeenCalledWith(["8.8.8.8", "1.1.1.1"]);
    expect(mongoClose).toHaveBeenCalled();
  });
});

export {};

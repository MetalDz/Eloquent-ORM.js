import fs from "fs";
import os from "os";
import path from "path";
import { loadModule } from "../cli/utils/typescript/tsRuntime";
import type { DriverAdapter } from "../core/connection/DriverAdapter";

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

jest.mock("../core/connection/ConnectionFactory", () => ({
  getAdapter: jest.fn(),
  getConnection: jest.fn(),
  closeAllConnections: jest.fn(async () => undefined),
}));

function makeSqlAdapter(): DriverAdapter & {
  query: jest.Mock;
  queryOne: jest.Mock;
  execute: jest.Mock;
  insert: jest.Mock;
} {
  const query = jest.fn();
  const queryOne = jest.fn();
  const execute = jest.fn();
  const insert = jest.fn();

  return {
    name: "mysql",
    kind: "sql",
    query,
    queryOne,
    execute,
    insert,
    placeholder: () => "?",
    placeholders: (count: number) => Array.from({ length: count }, () => "?").join(", "),
    inClause: (field: string, values: unknown[], startIndex = 1) => ({
      sql: `${field} IN (${Array.from({ length: values.length }, () => "?").join(", ")})`,
      params: values,
      nextIndex: startIndex + values.length,
    }),
    wrapId: (id: string) => `\`${id}\``,
  };
}

function removeDir(root: string): void {
  if (fs.existsSync(root)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function clearModule(filePath: string): void {
  try {
    delete require.cache[require.resolve(path.resolve(filePath))];
  } catch {
    // ignore cache misses during cleanup
  }
}

function setupScenarioContext(options: { useMongo: boolean }) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-scenario-persistence-"));
  const modelsDir = path.join(root, "models");
  const factoriesDir = path.join(root, "factories");
  const seedsDir = path.join(root, "seeds");
  const migrationsDir = path.join(root, "migrations");
  fs.mkdirSync(modelsDir, { recursive: true });
  fs.mkdirSync(factoriesDir, { recursive: true });
  fs.mkdirSync(seedsDir, { recursive: true });
  fs.mkdirSync(migrationsDir, { recursive: true });

  const coreImportPath = path
    .relative(modelsDir, path.resolve(process.cwd(), "src/core/model/BaseModel"))
    .replace(/\\/g, "/");
  const schemaImportPath = path
    .relative(modelsDir, path.resolve(process.cwd(), "src/core/schema/SchemaBlueprint"))
    .replace(/\\/g, "/");

  const resolveConnectionNamesFromFlags = jest.fn(() =>
    options.useMongo ? ["mongo" as never] : []
  );
  const resolveConnectionName = jest.fn(() => (options.useMongo ? "mongo" : "mysql"));
  const makeFactory = jest.fn(async () => undefined);
  const makeMigration = jest.fn(async () => undefined);
  const makeController = jest.fn(async () => undefined);
  const makeService = jest.fn(async () => undefined);
  const migrateFresh = jest.fn(async () => undefined);
  const dbSeed = jest.fn(async () => undefined);

  jest.doMock("../cli/utils/PathMap", () => ({
    PathMap: {
      root,
      ensureDirs: () => undefined,
      models: () => modelsDir,
      factories: () => factoriesDir,
      seeds: () => seedsDir,
      migrations: () => migrationsDir,
      appMigrations: () => migrationsDir,
      testMigrations: () => migrationsDir,
    },
  }));
  jest.doMock("../cli/utils/ImportResolver", () => ({
    ImportResolver: {
      coreImportPath: () => coreImportPath,
      schemaImportPath: () => schemaImportPath,
    },
  }));
  jest.doMock("../cli/utils/resolveConnectionFlags", () => ({
    resolveConnectionNamesFromFlags,
  }));
  jest.doMock("../core/connection/resolveConnectionName", () => ({
    resolveConnectionName,
  }));
  jest.doMock("../cli/commands/makeFactory", () => ({
    makeFactory,
  }));
  jest.doMock("../cli/commands/makeMigration", () => ({
    makeMigration,
  }));
  jest.doMock("../cli/commands/makeController", () => ({
    makeController,
  }));
  jest.doMock("../cli/commands/makeService", () => ({
    makeService,
  }));
  jest.doMock("../cli/commands/migrateFresh", () => ({
    migrateFresh,
  }));
  jest.doMock("../cli/commands/dbSeed", () => ({
    dbSeed,
  }));

  return {
    root,
    modelsDir,
    resolveConnectionNamesFromFlags,
    resolveConnectionName,
  };
}

describe("Scenario-generated model instance persistence", () => {
  const originalDbConnection = process.env.DB_CONNECTION;
  const originalDisableHooks = process.env.ELOQUENT_DISABLE_MODEL_HOOKS;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    jest.spyOn(console, "log").mockImplementation(() => undefined);
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    process.env.DB_CONNECTION = "mysql";
    process.env.ELOQUENT_DISABLE_MODEL_HOOKS = "true";
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(() => {
    if (originalDbConnection === undefined) {
      delete process.env.DB_CONNECTION;
    } else {
      process.env.DB_CONNECTION = originalDbConnection;
    }

    if (originalDisableHooks === undefined) {
      delete process.env.ELOQUENT_DISABLE_MODEL_HOOKS;
    } else {
      process.env.ELOQUENT_DISABLE_MODEL_HOOKS = originalDisableHooks;
    }
  });

  test("SQL make:scenario models inherit fill(), save(), and patch()", async () => {
    const adapter = makeSqlAdapter();
    adapter.insert.mockResolvedValue({
      id: 51,
      row: {
        id: 51,
        name: "Scenario SQL Alpha",
      },
    });

    const ctx = setupScenarioContext({ useMongo: false });
    try {
      const connectionFactory = await import("../core/connection/ConnectionFactory");
      const currentGetAdapter = connectionFactory.getAdapter as jest.MockedFunction<
        typeof connectionFactory.getAdapter
      >;
      currentGetAdapter.mockResolvedValue(adapter as unknown as DriverAdapter);

      const { makeScenario } = await import("../cli/commands/makeScenario");
      await makeScenario("blog", { force: true });

      const userFile = path.join(ctx.modelsDir, "User.ts");
      const content = fs.readFileSync(userFile, "utf8");
      expect(content).toContain("INSTANCE PERSISTENCE EXAMPLES");
      expect(content).toContain('await model.patch({ name: "Example 2" });');

      clearModule(userFile);
      const generatedModule = loadModule(userFile);
      const UserModel = generatedModule.User as {
        new (): {
          fill(data: Record<string, unknown>): unknown;
          save(): Promise<void>;
          patch(data: Record<string, unknown>): Promise<void>;
          id?: unknown;
          name?: unknown;
        };
        tableName: string;
      };

      const user = new UserModel();
      user.fill({ name: "Scenario SQL Alpha" });
      await user.save();

      expect(adapter.insert).toHaveBeenCalledWith(
        `INSERT INTO \`${UserModel.tableName}\` (\`name\`) VALUES (?)`,
        ["Scenario SQL Alpha"]
      );
      expect(user.id).toBe(51);

      await user.patch({ name: "Scenario SQL Beta" });
      expect(adapter.execute).toHaveBeenCalledWith(
        `UPDATE \`${UserModel.tableName}\` SET \`name\` = ? WHERE \`id\` = ?`,
        ["Scenario SQL Beta", 51]
      );
      expect(user.name).toBe("Scenario SQL Beta");
    } finally {
      clearModule(path.join(ctx.modelsDir, "User.ts"));
      removeDir(ctx.root);
    }
  });

  test("Mongo make:scenario models inherit fill(), save(), and patch()", async () => {
    const collection = {
      insertOne: jest.fn(async () => ({ insertedId: "scenario-mongo-51" })),
      updateOne: jest.fn(async () => ({ matchedCount: 1, modifiedCount: 1 })),
    };
    const mongoDb = {
      collection: jest.fn(() => collection),
    };

    const ctx = setupScenarioContext({ useMongo: true });
    try {
      const connectionFactory = await import("../core/connection/ConnectionFactory");
      const currentGetConnection = connectionFactory.getConnection as jest.MockedFunction<
        typeof connectionFactory.getConnection
      >;
      currentGetConnection.mockResolvedValue(mongoDb as never);

      const { makeScenario } = await import("../cli/commands/makeScenario");
      await makeScenario("blog", { force: true, mongo: true });

      const userFile = path.join(ctx.modelsDir, "User.ts");
      const content = fs.readFileSync(userFile, "utf8");
      expect(content).toContain("extends MongoModel");
      expect(content).toContain("INSTANCE PERSISTENCE EXAMPLES");

      clearModule(userFile);
      const generatedModule = loadModule(userFile);
      const UserModel = generatedModule.User as {
        new (): {
          fill(data: Record<string, unknown>): unknown;
          save(): Promise<void>;
          patch(data: Record<string, unknown>): Promise<void>;
          id?: unknown;
          name?: unknown;
        };
      };

      const user = new UserModel();
      user.fill({ name: "Scenario Mongo Alpha" });
      await user.save();

      expect(collection.insertOne).toHaveBeenCalledWith({ name: "Scenario Mongo Alpha" });
      expect(user.id).toBe("scenario-mongo-51");

      await user.patch({ name: "Scenario Mongo Beta" });
      expect(collection.updateOne).toHaveBeenCalledWith(
        { $or: [{ id: "scenario-mongo-51" }, { _id: "scenario-mongo-51" }] },
        { $set: { name: "Scenario Mongo Beta" } }
      );
      expect(user.name).toBe("Scenario Mongo Beta");
    } finally {
      clearModule(path.join(ctx.modelsDir, "User.ts"));
      removeDir(ctx.root);
    }
  });
});

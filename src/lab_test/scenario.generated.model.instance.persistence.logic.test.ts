import fs from "fs";
import os from "os";
import path from "path";
import { loadModule } from "../cli/utils/typescript/tsRuntime.js";
import type { DriverAdapter } from "../core/connection/DriverAdapter.js";
import {
  clearRuntimeConnectionFactoryHarnessCache,
  loadRuntimeConnectionFactoryModule,
} from "./support/runtimeConnectionFactoryHarness.js";

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

function pinGeneratedSqlConnection(filePath: string, connectionName = "mysql"): void {
  const content = fs.readFileSync(filePath, "utf8");
  const pinned = content.replace(
    /process\.env\.DB_CONNECTION\s*\?\?\s*"[^"]+"/g,
    `"${connectionName}"`
  );
  fs.writeFileSync(filePath, pinned, "utf8");
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
      withRuntimeRelativeImportExtension: (importPath: string) => importPath,
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
    clearRuntimeConnectionFactoryHarnessCache();
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

  test("SQL make:scenario models inherit create/find helpers plus fill(), update(), save(), and patch()", async () => {
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
      const runtimeConnectionFactory = loadRuntimeConnectionFactoryModule();
      runtimeConnectionFactory.getAdapter = jest.fn(
        async () => adapter as unknown as DriverAdapter
      );
      runtimeConnectionFactory.getConnection = jest.fn(
        async () => adapter as unknown as DriverAdapter
      );
      runtimeConnectionFactory.closeAllConnections = jest.fn(async () => undefined);

      const { makeScenario } = await import("../cli/commands/makeScenario.js");
      await makeScenario("blog", { force: true });

      const userFile = path.join(ctx.modelsDir, "User.ts");
      const content = fs.readFileSync(userFile, "utf8");
      expect(content).toContain("INSTANCE PERSISTENCE EXAMPLES");
      expect(content).toContain(
        'created_at: column("timestamp", undefined, { useTz: true }),'
      );
      expect(content).toContain(
        'updated_at: column("timestamp", undefined, { useTz: true }),'
      );
      expect(content).toContain('model.update({ name: "Example 2" });');
      expect(content).toContain('await model.patch({ name: "Example 3" });');

      clearModule(userFile);
      pinGeneratedSqlConnection(userFile, "mysql");
      process.env.DB_CONNECTION = "mysql";
      const generatedModule = loadModule(userFile);
      const UserModel = generatedModule.User as {
        new (): {
          fill(data: Record<string, unknown>): unknown;
          update(data: Record<string, unknown>): unknown;
          save(): Promise<void>;
          patch(data: Record<string, unknown>): Promise<void>;
          id?: unknown;
          name?: unknown;
        };
        create(data: Record<string, unknown>): Promise<Record<string, unknown> | null>;
        createMany(data: Record<string, unknown>[]): Promise<Record<string, unknown>[]>;
        updateMany(ids: Array<number | string>, data: Record<string, unknown>, pk?: string): Promise<void>;
        patchMany(rows: Record<string, unknown>[], pk?: string): Promise<void>;
        deleteMany(ids: Array<number | string>, pk?: string): Promise<void>;
        restoreMany(ids: Array<number | string>, pk?: string): Promise<void>;
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

      user.update({ name: "Scenario SQL Beta" });
      await user.save();
      expect(adapter.execute).toHaveBeenCalledWith(
        `UPDATE \`${UserModel.tableName}\` SET \`name\` = ? WHERE \`id\` = ?`,
        ["Scenario SQL Beta", 51]
      );
      expect(user.name).toBe("Scenario SQL Beta");

      adapter.insert
        .mockResolvedValueOnce({
          id: 52,
          row: { id: 52, name: "Scenario SQL Bulk A" },
        })
        .mockResolvedValueOnce({
          id: 53,
          row: { id: 53, name: "Scenario SQL Bulk B" },
        });
      const createdMany = await UserModel.createMany([
        { name: "Scenario SQL Bulk A" },
        { name: "Scenario SQL Bulk B" },
      ]);
      expect(createdMany).toHaveLength(2);

      await UserModel.updateMany([52, 53], { name: "Scenario SQL Bulk Updated" });
      await UserModel.patchMany([
        { id: 52, name: "Scenario SQL Patch A" },
        { id: 53, name: "Scenario SQL Patch B" },
      ]);
      await UserModel.deleteMany([52, 53]);
      await UserModel.restoreMany([52, 53]);

      const created = await UserModel.create({ name: "Scenario SQL Static" });
      expect(created).toBeInstanceOf(UserModel);
    } finally {
      clearModule(path.join(ctx.modelsDir, "User.ts"));
      removeDir(ctx.root);
    }
  });

  test("Mongo make:scenario models inherit create/find helpers plus fill(), update(), save(), and patch()", async () => {
    const collection = {
      insertOne: jest.fn(async () => ({ insertedId: "scenario-mongo-51" })),
      updateOne: jest.fn(async () => ({ matchedCount: 1, modifiedCount: 1 })),
      deleteOne: jest.fn(async () => ({ deletedCount: 1 })),
    };
    const mongoDb = {
      collection: jest.fn(() => collection),
    };

    const ctx = setupScenarioContext({ useMongo: true });
    try {
      const runtimeConnectionFactory = loadRuntimeConnectionFactoryModule();
      runtimeConnectionFactory.getConnection = jest.fn(async () => mongoDb as never);
      runtimeConnectionFactory.getAdapter = jest.fn(async () => {
        throw new Error("Mongo scenario test should not resolve a SQL adapter.");
      });
      runtimeConnectionFactory.closeAllConnections = jest.fn(async () => undefined);

      const { makeScenario } = await import("../cli/commands/makeScenario.js");
      await makeScenario("blog", { force: true, mongo: true });

      const userFile = path.join(ctx.modelsDir, "User.ts");
      const content = fs.readFileSync(userFile, "utf8");
      expect(content).toContain("extends MongoModel");
      expect(content).toContain("INSTANCE PERSISTENCE EXAMPLES");
      expect(content).toContain(
        'created_at: column("timestamp", undefined, { useTz: true }),'
      );
      expect(content).toContain(
        'updated_at: column("timestamp", undefined, { useTz: true }),'
      );

      clearModule(userFile);
      process.env.DB_CONNECTION = "mongo";
      const generatedModule = loadModule(userFile);
      const UserModel = generatedModule.User as {
        new (): {
          fill(data: Record<string, unknown>): unknown;
          update(data: Record<string, unknown>): unknown;
          save(): Promise<void>;
          patch(data: Record<string, unknown>): Promise<void>;
          id?: unknown;
          name?: unknown;
        };
        create(data: Record<string, unknown>): Promise<Record<string, unknown> | null>;
        createMany(data: Record<string, unknown>[]): Promise<Record<string, unknown>[]>;
        updateMany(ids: Array<number | string>, data: Record<string, unknown>, pk?: string): Promise<void>;
        patchMany(rows: Record<string, unknown>[], pk?: string): Promise<void>;
        deleteMany(ids: Array<number | string>, pk?: string): Promise<void>;
        restoreMany(ids: Array<number | string>, pk?: string): Promise<void>;
      };

      const user = new UserModel();
      user.fill({ name: "Scenario Mongo Alpha" });
      await user.save();

      expect(collection.insertOne).toHaveBeenCalledWith({ name: "Scenario Mongo Alpha" });
      expect(user.id).toBe("scenario-mongo-51");

      user.update({ name: "Scenario Mongo Beta" });
      await user.save();
      expect(collection.updateOne).toHaveBeenCalledWith(
        { $or: [{ id: "scenario-mongo-51" }, { _id: "scenario-mongo-51" }] },
        { $set: { name: "Scenario Mongo Beta" } }
      );
      expect(user.name).toBe("Scenario Mongo Beta");

      collection.insertOne
        .mockImplementationOnce(async () => ({ insertedId: "scenario-mongo-52" }))
        .mockImplementationOnce(async () => ({ insertedId: "scenario-mongo-53" }));
      const createdMany = await UserModel.createMany([
        { name: "Scenario Mongo Bulk A" },
        { name: "Scenario Mongo Bulk B" },
      ]);
      expect(createdMany).toHaveLength(2);

      await UserModel.updateMany(["scenario-mongo-52", "scenario-mongo-53"], {
        name: "Scenario Mongo Bulk Updated",
      });
      await UserModel.patchMany([
        { id: "scenario-mongo-52", name: "Scenario Mongo Patch A" },
        { id: "scenario-mongo-53", name: "Scenario Mongo Patch B" },
      ]);
      await UserModel.deleteMany(["scenario-mongo-52", "scenario-mongo-53"]);
      await UserModel.restoreMany(["scenario-mongo-52", "scenario-mongo-53"]);

      const created = await UserModel.create({ name: "Scenario Mongo Static" });
      expect(created).toBeInstanceOf(UserModel);
    } finally {
      clearModule(path.join(ctx.modelsDir, "User.ts"));
      removeDir(ctx.root);
    }
  });
});

import fs from "fs";
import path from "path";
import { loadModule } from "../cli/utils/typescript/tsRuntime";
import type { DriverAdapter } from "../core/connection/DriverAdapter";
import { getAdapter, getConnection } from "../core/connection/ConnectionFactory";

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

const mockedGetAdapter = getAdapter as jest.MockedFunction<typeof getAdapter>;
const mockedGetConnection = getConnection as jest.MockedFunction<typeof getConnection>;

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

function removeIfExists(filePath: string): void {
  if (!fs.existsSync(filePath)) return;

  try {
    delete require.cache[require.resolve(path.resolve(filePath))];
  } catch {
    // ignore cache misses during cleanup
  }

  fs.rmSync(filePath, { force: true });
}

describe("Generated model instance persistence via make:model", () => {
  const rootDir = process.cwd();
  const appModelsDir = path.resolve(rootDir, "src/app/models");
  const sqlModelName = "CliGeneratedPersistenceSql";
  const mongoModelName = "CliGeneratedPersistenceMongo";
  const sqlModelFile = path.join(appModelsDir, `${sqlModelName}.ts`);
  const mongoModelFile = path.join(appModelsDir, `${mongoModelName}.ts`);
  const originalDbConnection = process.env.DB_CONNECTION;
  const originalDisableHooks = process.env.ELOQUENT_DISABLE_MODEL_HOOKS;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "log").mockImplementation(() => undefined);
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    process.env.DB_CONNECTION = "mysql";
    process.env.ELOQUENT_DISABLE_MODEL_HOOKS = "true";
    removeIfExists(sqlModelFile);
    removeIfExists(mongoModelFile);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    removeIfExists(sqlModelFile);
    removeIfExists(mongoModelFile);
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

  test("generated SQL app models inherit fill(), save(), and patch()", async () => {
    const adapter = makeSqlAdapter();
    adapter.insert.mockResolvedValue({
      id: 41,
      row: {
        id: 41,
        name: "SQL Alpha",
      },
    });
    mockedGetAdapter.mockResolvedValue(adapter as unknown as DriverAdapter);

    const { makeModel } = await import("../cli/commands/makeModel");
    await makeModel(sqlModelName, { force: true });

    const content = fs.readFileSync(sqlModelFile, "utf8");
    expect(content).toContain("INSTANCE PERSISTENCE EXAMPLES");
    expect(content).toContain(`const model = new ${sqlModelName}();`);
    expect(content).toContain('await model.patch({ name: "Example 2" });');

    const generatedModule = loadModule(path.resolve(sqlModelFile));
    const GeneratedSqlModel = generatedModule[sqlModelName] as {
      new (): {
        fill(data: Record<string, unknown>): unknown;
        save(): Promise<void>;
        patch(data: Record<string, unknown>): Promise<void>;
        id?: unknown;
        name?: unknown;
      };
      tableName: string;
    };

    const model = new GeneratedSqlModel();

    expect(typeof model.fill).toBe("function");
    expect(typeof model.save).toBe("function");
    expect(typeof model.patch).toBe("function");

    model.fill({ name: "SQL Alpha" });
    await model.save();

    expect(adapter.insert).toHaveBeenCalledWith(
      `INSERT INTO \`${GeneratedSqlModel.tableName}\` (\`name\`) VALUES (?)`,
      ["SQL Alpha"]
    );
    expect(model.id).toBe(41);

    await model.patch({ name: "SQL Beta" });
    expect(adapter.execute).toHaveBeenCalledWith(
      `UPDATE \`${GeneratedSqlModel.tableName}\` SET \`name\` = ? WHERE \`id\` = ?`,
      ["SQL Beta", 41]
    );
    expect(model.name).toBe("SQL Beta");

    expect(() => model.fill({ role: "admin" })).toThrow(
      `Unknown fill field 'role' on ${sqlModelName}.`
    );
  });

  test("generated Mongo app models inherit fill(), save(), and patch()", async () => {
    const collection = {
      insertOne: jest.fn(async () => ({ insertedId: "mongo-generated-41" })),
      updateOne: jest.fn(async () => ({ matchedCount: 1, modifiedCount: 1 })),
    };
    const mongoDb = {
      collection: jest.fn(() => collection),
    };
    mockedGetConnection.mockResolvedValue(mongoDb as never);

    const { makeModel } = await import("../cli/commands/makeModel");
    await makeModel(mongoModelName, { mongo: true, force: true });

    const content = fs.readFileSync(mongoModelFile, "utf8");
    expect(content).toContain("extends MongoModel");
    expect(content).toContain("INSTANCE PERSISTENCE EXAMPLES");
    expect(content).toContain(`const model = new ${mongoModelName}();`);

    const generatedModule = loadModule(path.resolve(mongoModelFile));
    const GeneratedMongoModel = generatedModule[mongoModelName] as {
      new (): {
        fill(data: Record<string, unknown>): unknown;
        save(): Promise<void>;
        patch(data: Record<string, unknown>): Promise<void>;
        id?: unknown;
        name?: unknown;
      };
      tableName: string;
    };

    const model = new GeneratedMongoModel();

    model.fill({ name: "Mongo Alpha" });
    await model.save();

    expect(collection.insertOne).toHaveBeenCalledWith({ name: "Mongo Alpha" });
    expect(model.id).toBe("mongo-generated-41");

    await model.patch({ name: "Mongo Beta" });
    expect(collection.updateOne).toHaveBeenCalledWith(
      { $or: [{ id: "mongo-generated-41" }, { _id: "mongo-generated-41" }] },
      { $set: { name: "Mongo Beta" } }
    );
    expect(model.name).toBe("Mongo Beta");
  });
});

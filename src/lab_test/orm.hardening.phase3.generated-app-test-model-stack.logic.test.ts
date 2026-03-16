import fs from "fs";
import path from "path";
import { loadModule } from "../cli/utils/typescript/tsRuntime";

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

function removeIfExists(filePath: string): void {
  if (!fs.existsSync(filePath)) return;

  try {
    delete require.cache[require.resolve(path.resolve(filePath))];
  } catch {
    // ignore cache misses during cleanup
  }

  fs.rmSync(filePath, { force: true });
}

describe("ORM hardening phase 3 generated app/test model stack", () => {
  const rootDir = process.cwd();
  const appModelsDir = path.resolve(rootDir, "src/app/models");
  const testModelsDir = path.resolve(rootDir, "src/test/database/models");
  const originalDbConnection = process.env.DB_CONNECTION;
  const originalDisableHooks = process.env.ELOQUENT_DISABLE_MODEL_HOOKS;
  const sqlAppModelName = "CliPhase3AppSql";
  const mongoAppModelName = "CliPhase3AppMongo";
  const sqlTestModelName = "CliPhase3TestSql";
  const mongoTestModelName = "CliPhase3TestMongo";
  const generatedFiles = [
    path.join(appModelsDir, `${sqlAppModelName}.ts`),
    path.join(appModelsDir, `${mongoAppModelName}.ts`),
    path.join(testModelsDir, `${sqlTestModelName}.ts`),
    path.join(testModelsDir, `${mongoTestModelName}.ts`),
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "log").mockImplementation(() => undefined);
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    process.env.DB_CONNECTION = "mysql";
    process.env.ELOQUENT_DISABLE_MODEL_HOOKS = "true";
    for (const filePath of generatedFiles) {
      removeIfExists(filePath);
    }
  });

  afterEach(() => {
    jest.restoreAllMocks();
    for (const filePath of generatedFiles) {
      removeIfExists(filePath);
    }
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

  test("generated app/test SQL and Mongo models keep the default BaseModel stack", async () => {
    const { makeModel } = await import("../cli/commands/makeModel");

    await makeModel(sqlAppModelName, { force: true });
    await makeModel(mongoAppModelName, { mongo: true, force: true });
    await makeModel(sqlTestModelName, { test: true, force: true });
    await makeModel(mongoTestModelName, { test: true, mongo: true, force: true });

    const cases = [
      {
        modelName: sqlAppModelName,
        filePath: path.join(appModelsDir, `${sqlAppModelName}.ts`),
        expectedBaseClass: "SqlModel",
        expectedCoreImport: 'from "../../core/model/BaseModel"',
        expectedSchemaImport: 'from "../../core/schema/SchemaBlueprint"',
      },
      {
        modelName: mongoAppModelName,
        filePath: path.join(appModelsDir, `${mongoAppModelName}.ts`),
        expectedBaseClass: "MongoModel",
        expectedCoreImport: 'from "../../core/model/BaseModel"',
        expectedSchemaImport: 'from "../../core/schema/SchemaBlueprint"',
      },
      {
        modelName: sqlTestModelName,
        filePath: path.join(testModelsDir, `${sqlTestModelName}.ts`),
        expectedBaseClass: "SqlModel",
        expectedCoreImport: 'from "../../../core/model/BaseModel"',
        expectedSchemaImport: 'from "../../../core/schema/SchemaBlueprint"',
      },
      {
        modelName: mongoTestModelName,
        filePath: path.join(testModelsDir, `${mongoTestModelName}.ts`),
        expectedBaseClass: "MongoModel",
        expectedCoreImport: 'from "../../../core/model/BaseModel"',
        expectedSchemaImport: 'from "../../../core/schema/SchemaBlueprint"',
      },
    ] as const;

    for (const item of cases) {
      const content = fs.readFileSync(item.filePath, "utf8");
      expect(content).toContain(`export class ${item.modelName} extends ${item.expectedBaseClass}`);
      expect(content).toContain(item.expectedCoreImport);
      expect(content).toContain(item.expectedSchemaImport);
      expect(content).toContain("INSTANCE PERSISTENCE EXAMPLES");

      const generatedModule = loadModule(path.resolve(item.filePath));
      const GeneratedModel = generatedModule[item.modelName] as {
        new (): {
          fill(data: Record<string, unknown>): unknown;
          save(): Promise<void>;
          patch(data: Record<string, unknown>): Promise<void>;
          toObject(): Record<string, unknown>;
          toJSON(): string;
          with(...relations: string[]): unknown;
        };
        where(field: string, value: unknown): unknown;
        with(...relations: string[]): unknown;
        findBy(field: string, value: unknown): unknown;
        findOneBy(field: string, value: unknown): Promise<unknown>;
        findAllBy(filters: Record<string, unknown>): Promise<unknown[]>;
        existsBy(filters: Record<string, unknown>): Promise<boolean>;
      };

      const model = new GeneratedModel();
      model.fill({ name: `${item.modelName} Example` });

      expect(model.toObject()).toEqual(
        expect.objectContaining({ name: `${item.modelName} Example` })
      );
      expect(JSON.parse(model.toJSON())).toEqual(
        expect.objectContaining({ name: `${item.modelName} Example` })
      );

      expect(typeof model.fill).toBe("function");
      expect(typeof model.save).toBe("function");
      expect(typeof model.patch).toBe("function");
      expect(typeof model.with).toBe("function");

      expect(typeof GeneratedModel.where).toBe("function");
      expect(typeof GeneratedModel.with).toBe("function");
      expect(typeof GeneratedModel.findBy).toBe("function");
      expect(typeof GeneratedModel.findOneBy).toBe("function");
      expect(typeof GeneratedModel.findAllBy).toBe("function");
      expect(typeof GeneratedModel.existsBy).toBe("function");
    }
  });
});

import fs from "fs";
import path from "path";
import {
  BaseModel,
  SqlModel,
  MongoModel,
  BASE_MODEL_COMPOSITION_ORDER,
  MODEL_BOUNDARY_MATRIX,
} from "../core/model/BaseModel";
import {
  BaseModel as PublicBaseModel,
  SqlModel as PublicSqlModel,
  MongoModel as PublicMongoModel,
} from "../index";
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

jest.mock("@faker-js/faker", () => ({
  faker: {},
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

describe("ORM hardening phase 1 runtime boundaries", () => {
  const rootDir = process.cwd();
  const appModelsDir = path.resolve(rootDir, "src/app/models");
  const sqlModelName = "CliBoundaryPhase1Sql";
  const mongoModelName = "CliBoundaryPhase1Mongo";
  const sqlModelFile = path.join(appModelsDir, `${sqlModelName}.ts`);
  const mongoModelFile = path.join(appModelsDir, `${mongoModelName}.ts`);
  const notesPath = path.resolve(
    rootDir,
    "validation tasks/ORM-Hardening-Phase1-Implementation-Notes.md"
  );

  beforeEach(() => {
    removeIfExists(sqlModelFile);
    removeIfExists(mongoModelFile);
    jest.spyOn(console, "log").mockImplementation(() => undefined);
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
    jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    removeIfExists(sqlModelFile);
    removeIfExists(mongoModelFile);
  });

  test("implementation notes freeze the boundary matrix and extraction targets", () => {
    const notes = fs.readFileSync(notesPath, "utf8");

    const requiredSnippets = [
      "# ORM Hardening Phase 1 Implementation Notes",
      "## Boundary Matrix",
      "### CoreModel",
      "### BaseModel",
      "### SqlModel",
      "### MongoModel",
      "### Generated Models",
      "## Extraction Targets",
      "## Phase 1 Runtime Locks",
      "never extend `CoreModel` directly",
    ];

    for (const snippet of requiredSnippets) {
      expect(notes).toContain(snippet);
    }
  });

  test("public package exports resolve to the same model classes and boundary metadata is explicit", () => {
    expect(PublicBaseModel).toBe(BaseModel);
    expect(PublicSqlModel).toBe(SqlModel);
    expect(PublicMongoModel).toBe(MongoModel);

    expect(BASE_MODEL_COMPOSITION_ORDER).toEqual([
      "CoreModel",
      "MorphableMixin",
      "PivotHelperMixin",
      "CastsMixin",
      "SoftDeletesMixin",
      "ScopeMixin",
      "HooksMixin",
      "QueryCacheMixin",
      "EagerLoadingMixin",
      "SerializeMixin",
    ]);

    expect(MODEL_BOUNDARY_MATRIX.CoreModel).toContain("safe-finder construction");
    expect(MODEL_BOUNDARY_MATRIX.BaseModel).toContain("typed relation helpers");
    expect(MODEL_BOUNDARY_MATRIX.GeneratedModels).toContain("extendSqlModelOrMongoModel");
    expect(MODEL_BOUNDARY_MATRIX.GeneratedModels).toContain("neverExtendCoreModelDirectly");
  });

  test("generated SQL and Mongo app models inherit the intended default runtime stack", async () => {
    const { makeModel } = await import("../cli/commands/makeModel");

    await makeModel(sqlModelName, { force: true });
    await makeModel(mongoModelName, { mongo: true, force: true });

    const sqlContent = fs.readFileSync(sqlModelFile, "utf8");
    const mongoContent = fs.readFileSync(mongoModelFile, "utf8");

    expect(sqlContent).toContain(`export class ${sqlModelName} extends SqlModel`);
    expect(mongoContent).toContain(`export class ${mongoModelName} extends MongoModel`);

    const sqlModule = loadModule(path.resolve(sqlModelFile));
    const mongoModule = loadModule(path.resolve(mongoModelFile));

    const GeneratedSqlModel = sqlModule[sqlModelName] as new () => BaseModel;
    const GeneratedMongoModel = mongoModule[mongoModelName] as new () => BaseModel;

    const sqlModel = new GeneratedSqlModel();
    const mongoModel = new GeneratedMongoModel();

    expect(sqlModel).toBeInstanceOf(SqlModel);
    expect(sqlModel).toBeInstanceOf(BaseModel);
    expect(mongoModel).toBeInstanceOf(MongoModel);
    expect(mongoModel).toBeInstanceOf(BaseModel);

    for (const model of [sqlModel, mongoModel]) {
      const runtimeModel = model as any;
      expect(typeof model.fill).toBe("function");
      expect(typeof model.save).toBe("function");
      expect(typeof model.patch).toBe("function");
      expect(typeof model.toObject).toBe("function");
      expect(typeof model.toJSON).toBe("function");
      expect(typeof runtimeModel.with).toBe("function");
    }

    for (const GeneratedModel of [GeneratedSqlModel, GeneratedMongoModel]) {
      const runtimeCtor = GeneratedModel as unknown as typeof BaseModel;
      expect(typeof runtimeCtor.where).toBe("function");
      expect(typeof runtimeCtor.with).toBe("function");
      expect(typeof runtimeCtor.active).toBe("function");
      expect(typeof runtimeCtor.findBy).toBe("function");
      expect(typeof runtimeCtor.existsBy).toBe("function");
    }
  });
});

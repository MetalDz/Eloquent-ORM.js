import fs from "fs";
import os from "os";
import path from "path";
import { makeScenario } from "../cli/commands/makeScenario";
import { PathMap } from "../cli/utils/PathMap";
import { MongoModel, column, type SchemaField } from "../index";

jest.mock("@faker-js/faker", () => ({
  faker: {},
}));

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

jest.mock("../cli/commands/makeFactory", () => ({
  makeFactory: jest.fn(async () => undefined),
}));

jest.mock("../cli/commands/makeMigration", () => ({
  makeMigration: jest.fn(async () => undefined),
}));

jest.mock("../cli/commands/makeController", () => ({
  makeController: jest.fn(async () => undefined),
}));

jest.mock("../cli/commands/makeService", () => ({
  makeService: jest.fn(async () => undefined),
}));

jest.mock("../cli/commands/migrateFresh", () => ({
  migrateFresh: jest.fn(async () => undefined),
}));

jest.mock("../cli/commands/dbSeed", () => ({
  dbSeed: jest.fn(async () => undefined),
}));

jest.mock("../cli/utils/resolveConnectionFlags", () => ({
  resolveConnectionNamesFromFlags: jest.fn(() => ["mongo_test"]),
}));

class PublicMongoSmokeModel extends MongoModel<Record<string, unknown>> {
  static tableName = "mongo_smoke_models";
  static connectionName = "mongo_test";
  static morphAlias = "mongo_smoke_models";

  static schema = {
    id: column("increments", undefined, { primary: true }),
    name: column("string", 255),
  } satisfies Record<string, SchemaField>;

  constructor() {
    super("mongo_smoke_models", "mongo_test");
  }
}

describe("NoSQL phase 18 public MongoModel and scenario seed parity", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.spyOn(console, "log").mockImplementation(() => undefined);
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
    jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("public MongoModel export inherits BaseModel mixins", () => {
    const model = new PublicMongoSmokeModel();

    expect(typeof model.getMorphClass).toBe("function");
    expect(model.getMorphClass()).toBe("mongo_smoke_models");
    expect(typeof model.save).toBe("function");
    expect(typeof model.toJSON).toBe("function");
    expect(typeof (PublicMongoSmokeModel as typeof MongoModel).with).toBe("function");
    expect(typeof (PublicMongoSmokeModel as typeof MongoModel).where).toBe("function");
  });

  test("make:scenario --mongo emits id/_id-safe seed helpers", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-scenario-mongo-seed-"));
    const modelsDir = path.join(root, "models");
    const factoriesDir = path.join(root, "factories");
    const seedsDir = path.join(root, "seeds");
    const migrationsDir = path.join(root, "migrations");
    fs.mkdirSync(modelsDir, { recursive: true });
    fs.mkdirSync(factoriesDir, { recursive: true });
    fs.mkdirSync(seedsDir, { recursive: true });
    fs.mkdirSync(migrationsDir, { recursive: true });

    jest.spyOn(PathMap, "ensureDirs").mockImplementation(() => undefined);
    jest.spyOn(PathMap, "models").mockReturnValue(modelsDir);
    jest.spyOn(PathMap, "factories").mockReturnValue(factoriesDir);
    jest.spyOn(PathMap, "seeds").mockReturnValue(seedsDir);
    jest.spyOn(PathMap, "migrations").mockReturnValue(migrationsDir);

    const importResolver = await import("../cli/utils/ImportResolver");
    jest.spyOn(importResolver.ImportResolver, "coreImportPath").mockReturnValue("eloquentjs");
    jest.spyOn(importResolver.ImportResolver, "schemaImportPath").mockReturnValue("eloquentjs");

    try {
      await makeScenario("blog", { test: true, mongo: true, force: true });

      const seederContent = fs.readFileSync(path.join(seedsDir, "BlogScenarioSeeder.ts"), "utf8");
      expect(seederContent).toContain("id?: number;");
      expect(seederContent).toContain("_id?: number;");
      expect(seederContent).toContain("const idOf = (model: SeedModel): number | undefined => {");
      expect(seederContent).toContain("return (model.id ?? model._id) as number | undefined;");
      expect(seederContent).toContain("if (ctor && typeof ctor.getMorphClass === \"function\") {");
      expect(seederContent).toContain("const post = (await postFactory.create({ user_id: idOf(user) })) as SeedModel;");
      expect(seederContent).toContain("commentable_id: idOf(post),");
      expect(seederContent).toContain("commentable_id: idOf(user),");
      expect(seederContent).toContain("await user.attach(\"post_user_pivot\", \"user_id\", \"post_id\", idOf(user), favorites);");
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

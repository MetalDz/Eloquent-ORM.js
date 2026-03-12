import fs from "fs";
import os from "os";
import path from "path";
import { makeScenario } from "../cli/commands/makeScenario";
import { PathMap } from "../cli/utils/PathMap";

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

describe("NoSQL phase 16 scenario generator type parity", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.spyOn(console, "log").mockImplementation(() => undefined);
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
    jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("make:scenario --mongo generates typed relation(...) schema entries and mongo-compatible seeders", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-scenario-mongo-typing-"));
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

    jest.spyOn(PathMap, "ensureDirs").mockImplementation(() => undefined);
    jest.spyOn(PathMap, "models").mockReturnValue(modelsDir);
    jest.spyOn(PathMap, "factories").mockReturnValue(factoriesDir);
    jest.spyOn(PathMap, "seeds").mockReturnValue(seedsDir);
    jest.spyOn(PathMap, "migrations").mockReturnValue(migrationsDir);

    const importResolver = await import("../cli/utils/ImportResolver");
    jest.spyOn(importResolver.ImportResolver, "coreImportPath").mockReturnValue(coreImportPath);
    jest
      .spyOn(importResolver.ImportResolver, "schemaImportPath")
      .mockReturnValue(
        path
          .relative(modelsDir, path.resolve(process.cwd(), "src/core/schema/SchemaBlueprint"))
          .replace(/\\/g, "/")
      );

    try {
      await makeScenario("blog", { test: true, mongo: true, force: true });

      const userModel = fs.readFileSync(path.join(modelsDir, "User.ts"), "utf8");
      expect(userModel).toContain('import { column, relation, validate, type SchemaField }');
      expect(userModel).toContain('posts: relation("hasMany", "Post", { foreignKey: "user_id" })');
      expect(userModel).toContain('comments: relation("morphMany", "Comment", { morphName: "commentable" })');

      const postModel = fs.readFileSync(path.join(modelsDir, "Post.ts"), "utf8");
      expect(postModel).toContain('author: relation("belongsTo", "User", { foreignKey: "user_id" })');
      expect(postModel).toContain('favoritedBy: relation("belongsToMany", "User", {})');

      const seederContent = fs.readFileSync(path.join(seedsDir, "BlogScenarioSeeder.ts"), "utf8");
      expect(seederContent).toContain('import { UserFactory } from "../factories/UserFactory";');
      expect(seederContent).toContain('import { PostFactory } from "../factories/PostFactory";');
      expect(seederContent).toContain('import { CommentFactory } from "../factories/CommentFactory";');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

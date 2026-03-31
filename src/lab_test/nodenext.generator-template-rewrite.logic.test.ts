import fs from "fs";
import os from "os";
import path from "path";

import { makeFactory } from "../cli/commands/makeFactory.js";
import { makeSeed } from "../cli/commands/makeSeed.js";
import { PathMap } from "../cli/utils/PathMap.js";
import { ModelIntrospector } from "../cli/utils/ModelIntrospector.js";

jest.mock("chalk", () => ({
  __esModule: true,
  default: new Proxy(
    (value: unknown): string => String(value ?? ""),
    {
      get: () => (value: unknown): string => String(value ?? ""),
      apply: (_target, _thisArg, args: unknown[]) => String(args[0] ?? ""),
    },
  ),
}));

describe("NodeNext generator/template rewrite", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
  });

  test("plan tracks the task 5 generator/template rewrite slice", () => {
    const plan = fs.readFileSync(
      path.resolve(
        process.cwd(),
        "validation tasks/NodeNext-Generator-Template-Rewrite-Plan.md",
      ),
      "utf8",
    );

    expect(plan).toContain("# NodeNext Generator Template Rewrite Plan");
    expect(plan).toContain("Status: COMPLETED");
    expect(plan).toContain("src/cli/utils/ImportResolver.ts");
    expect(plan).toContain("src/cli/commands/makeScenario.ts");
    expect(plan).toContain("src/cli/templates/factory.tpl");
    expect(plan).toContain("src/cli/templates/seed.tpl");
    expect(plan).toContain("src/lab_test/nodenext.generator-template-rewrite.logic.test.ts");
  });

  test("makeFactory and makeSeed emit .js local imports for NodeNext target projects", async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-nodenext-generators-"));
    const templatesDir = path.join(tempRoot, "templates");
    const factoriesDir = path.join(tempRoot, "src/test/database/factories");
    const seedsDir = path.join(tempRoot, "src/test/database/seeds");
    fs.mkdirSync(templatesDir, { recursive: true });
    fs.mkdirSync(factoriesDir, { recursive: true });
    fs.mkdirSync(seedsDir, { recursive: true });
    fs.writeFileSync(
      path.join(tempRoot, "package.json"),
      JSON.stringify({ type: "module" }, null, 2),
      "utf8",
    );
    fs.writeFileSync(
      path.join(tempRoot, "tsconfig.json"),
      JSON.stringify({ compilerOptions: { module: "NodeNext", moduleResolution: "NodeNext" } }, null, 2),
      "utf8",
    );

    fs.writeFileSync(
      path.join(templatesDir, "factory.tpl"),
      [
        'import { Factory } from "{{packageImportPath}}";',
        'import { {{ModelName}} } from "{{modelImportPath}}";',
        "{{#each relationImports}}",
        "{{this}}",
        "{{/each}}",
        "export const model = \"{{ModelName}}\";",
      ].join("\n"),
      "utf8",
    );
    fs.writeFileSync(
      path.join(templatesDir, "seed.tpl"),
      [
        'import { {{FactoryName}} } from "{{factoryImportPath}}";',
        'export const seeder = "{{SeederName}}";',
      ].join("\n"),
      "utf8",
    );

    jest.spyOn(console, "log").mockImplementation(() => undefined);
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    jest.spyOn(PathMap, "ensureDirs").mockImplementation(() => undefined);
    jest.spyOn(PathMap, "root", "get").mockReturnValue(tempRoot);
    jest.spyOn(PathMap, "factories").mockReturnValue(factoriesDir);
    jest.spyOn(PathMap, "seeds").mockReturnValue(seedsDir);
    jest.spyOn(PathMap, "template").mockImplementation((name: string) => {
      const fileName = name.endsWith(".tpl") ? name : `${name}.tpl`;
      return path.join(templatesDir, fileName);
    });
    jest.spyOn(ModelIntrospector, "analyze").mockResolvedValue({
      fields: [],
      relations: [{ name: "user", type: "belongsTo", target: "User" }],
      features: {},
    } as never);

    try {
      await makeFactory("Post", { test: true, force: true });
      await makeSeed("Post", { test: true, force: true });

      const factoryContent = fs.readFileSync(
        path.join(factoriesDir, "PostFactory.ts"),
        "utf8",
      );
      const seedContent = fs.readFileSync(
        path.join(seedsDir, "PostSeeder.ts"),
        "utf8",
      );

      expect(factoryContent).toContain('import { Post } from "../models/Post.js";');
      expect(factoryContent).toContain(
        'import { UserFactory } from "../factories/UserFactory.js";',
      );
      expect(seedContent).toContain(
        'import { PostFactory } from "../factories/PostFactory.js";',
      );
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test("makeScenario emits .js factory imports for NodeNext target projects", async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-nodenext-scenario-"));
    const modelsDir = path.join(tempRoot, "src/test/database/models");
    const factoriesDir = path.join(tempRoot, "src/test/database/factories");
    const seedsDir = path.join(tempRoot, "src/test/database/seeds");
    const migrationsDir = path.join(tempRoot, "src/test/database/migrations");
    fs.mkdirSync(modelsDir, { recursive: true });
    fs.mkdirSync(factoriesDir, { recursive: true });
    fs.mkdirSync(seedsDir, { recursive: true });
    fs.mkdirSync(migrationsDir, { recursive: true });
    fs.writeFileSync(
      path.join(tempRoot, "package.json"),
      JSON.stringify({ type: "module" }, null, 2),
      "utf8",
    );
    fs.writeFileSync(
      path.join(tempRoot, "tsconfig.json"),
      JSON.stringify({ compilerOptions: { module: "NodeNext", moduleResolution: "NodeNext" } }, null, 2),
      "utf8",
    );

    jest.spyOn(console, "log").mockImplementation(() => undefined);
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
    jest.spyOn(console, "error").mockImplementation(() => undefined);

    try {
      jest.doMock("../cli/commands/makeFactory", () => ({
        makeFactory: jest.fn(async () => undefined),
      }));
      jest.doMock("../cli/commands/makeController", () => ({
        makeController: jest.fn(async () => undefined),
      }));
      jest.doMock("../cli/commands/makeService", () => ({
        makeService: jest.fn(async () => undefined),
      }));
      jest.doMock("../cli/commands/makeMigration", () => ({
        makeMigration: jest.fn(async () => undefined),
      }));
      jest.doMock("../cli/commands/migrateFresh", () => ({
        migrateFresh: jest.fn(async () => undefined),
      }));
      jest.doMock("../cli/commands/dbSeed", () => ({
        dbSeed: jest.fn(async () => undefined),
      }));
      jest.doMock("../cli/utils/resolveConnectionFlags", () => ({
        resolveConnectionNamesFromFlags: jest.fn(() => []),
      }));
      jest.doMock("../core/connection/resolveConnectionName", () => ({
        resolveConnectionName: jest.fn(() => "sqlite"),
      }));
      jest.doMock("../cli/utils/typescript/tsRuntime", () => ({
        clearLoadedModuleCache: jest.fn(),
      }));
      jest.doMock("../cli/utils/PathMap", () => ({
        PathMap: {
          get root() {
            return tempRoot;
          },
          ensureDirs: () => undefined,
          models: () => modelsDir,
          factories: () => factoriesDir,
          seeds: () => seedsDir,
          appMigrations: () => migrationsDir,
          testMigrations: () => migrationsDir,
          migrations: () => migrationsDir,
        },
      }));

      const { makeScenario } = await import("../cli/commands/makeScenario.js");
      await makeScenario("blog", { test: true, force: true });

      const seederContent = fs.readFileSync(
        path.join(seedsDir, "BlogScenarioSeeder.ts"),
        "utf8",
      );

      expect(seederContent).toContain(
        'import { UserFactory } from "../factories/UserFactory.js";',
      );
      expect(seederContent).toContain(
        'import { PostFactory } from "../factories/PostFactory.js";',
      );
      expect(seederContent).toContain(
        'import { CommentFactory } from "../factories/CommentFactory.js";',
      );
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});

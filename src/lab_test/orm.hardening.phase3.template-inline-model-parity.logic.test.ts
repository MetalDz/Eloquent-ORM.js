import fs from "fs";
import os from "os";
import path from "path";

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

function removeDir(root: string): void {
  if (fs.existsSync(root)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function setupScenarioContext(options: { useMongo: boolean }) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-phase3-template-parity-"));
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
  };
}

describe("ORM hardening phase 3 template-inline model parity", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    jest.spyOn(console, "log").mockImplementation(() => undefined);
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
    jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test.each([
    { label: "sql", useMongo: false, expectedBaseClass: "extends SqlModel" },
    { label: "mongo", useMongo: true, expectedBaseClass: "extends MongoModel" },
  ])(
    "$label scenario-generated models keep the notable make:model surface",
    async ({ useMongo, expectedBaseClass }) => {
      const ctx = setupScenarioContext({ useMongo });
      try {
        const templatePath = path.resolve(process.cwd(), "src/cli/templates/model.tpl");
        const template = fs.readFileSync(templatePath, "utf8");

        const { makeScenario } = await import("../cli/commands/makeScenario");
        await makeScenario("blog", { force: true, mongo: useMongo });

        const userFile = path.join(ctx.modelsDir, "User.ts");
        const content = fs.readFileSync(userFile, "utf8");
        const requiredSnippets = [
          "RELATIONS EXAMPLES",
          "OPTIONAL MIXINS",
          "INSTANCE PERSISTENCE EXAMPLES",
          "static validationHooks = {",
          "static customRules = {",
          "static modelEvents = {",
          "beforeValidate",
          "afterValidate",
          "beforeCreate",
          "afterDelete",
        ];

        for (const snippet of requiredSnippets) {
          expect(template).toContain(snippet);
          expect(content).toContain(snippet);
        }

        expect(content).toContain(expectedBaseClass);
      } finally {
        removeDir(ctx.root);
      }
    }
  );
});

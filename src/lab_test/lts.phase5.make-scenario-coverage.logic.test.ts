import fs from "fs";
import os from "os";
import path from "path";

const passthroughChalk = {
  __esModule: true,
  default: {
    cyanBright: (value: string) => value,
    gray: (value: string) => value,
    yellow: (value: string) => value,
    green: (value: string) => value,
    greenBright: (value: string) => value,
  },
};

type HarnessOptions = {
  isTest?: boolean;
  useMongo?: boolean;
  connectionNames?: string[];
  resolvedConnectionName?: string;
};

type ScenarioHarness = {
  root: string;
  modelsDir: string;
  factoriesDir: string;
  seedsDir: string;
  migrationsRoot: string;
  controllersDir: string;
  servicesDir: string;
  makeFactory: jest.Mock;
  makeController: jest.Mock;
  makeService: jest.Mock;
  makeMigration: jest.Mock;
  migrateFresh: jest.Mock;
  dbSeed: jest.Mock;
  clearLoadedModuleCache: jest.Mock;
  resolveConnectionNamesFromFlags: jest.Mock;
  resolveConnectionName: jest.Mock;
};

function removeDir(root: string): void {
  if (fs.existsSync(root)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function setupMakeScenarioHarness(options: HarnessOptions = {}): ScenarioHarness {
  jest.resetModules();

  const isTest = options.isTest === true;
  const useMongo = options.useMongo === true;
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-lts5-make-scenario-"));
  const modelsDir = path.join(root, isTest ? "test-models" : "app-models");
  const factoriesDir = path.join(root, isTest ? "test-factories" : "app-factories");
  const seedsDir = path.join(root, isTest ? "test-seeds" : "app-seeds");
  const migrationsRoot = path.join(root, isTest ? "test-migrations" : "app-migrations");
  const controllersDir = path.resolve(
    root,
    isTest ? "src/test/controllers" : "src/app/controllers",
  );
  const servicesDir = path.resolve(root, isTest ? "src/test/services" : "src/app/services");
  fs.mkdirSync(modelsDir, { recursive: true });
  fs.mkdirSync(factoriesDir, { recursive: true });
  fs.mkdirSync(seedsDir, { recursive: true });
  fs.mkdirSync(migrationsRoot, { recursive: true });

  const makeFactory = jest.fn(async () => undefined);
  const makeController = jest.fn(async () => undefined);
  const makeService = jest.fn(async () => undefined);
  const makeMigration = jest.fn(async () => undefined);
  const migrateFresh = jest.fn(async () => undefined);
  const dbSeed = jest.fn(async () => undefined);
  const clearLoadedModuleCache = jest.fn();
  const resolveConnectionNamesFromFlags = jest.fn(
    () => options.connectionNames ?? (useMongo ? ["mongo"] : []),
  );
  const resolveConnectionName = jest.fn(
    () => options.resolvedConnectionName ?? (useMongo ? "mongo" : "sqlite"),
  );

  const coreImportPath = path
    .relative(modelsDir, path.resolve(process.cwd(), "src/core/model/BaseModel"))
    .replace(/\\/g, "/");
  const schemaImportPath = path
    .relative(modelsDir, path.resolve(process.cwd(), "src/core/schema/SchemaBlueprint"))
    .replace(/\\/g, "/");

  jest.doMock("chalk", () => passthroughChalk);
  jest.doMock("../cli/utils/PathMap", () => ({
    PathMap: {
      root,
      ensureDirs: () => undefined,
      models: () => modelsDir,
      factories: () => factoriesDir,
      seeds: () => seedsDir,
      appMigrations: (name?: string) =>
        name ? path.join(migrationsRoot, name) : migrationsRoot,
      testMigrations: (name?: string) =>
        name ? path.join(migrationsRoot, name) : migrationsRoot,
      migrations: (_isTest?: boolean, name?: string) =>
        name ? path.join(migrationsRoot, name) : migrationsRoot,
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
  jest.doMock("../cli/commands/makeController", () => ({
    makeController,
  }));
  jest.doMock("../cli/commands/makeService", () => ({
    makeService,
  }));
  jest.doMock("../cli/commands/makeMigration", () => ({
    makeMigration,
  }));
  jest.doMock("../cli/commands/migrateFresh", () => ({
    migrateFresh,
  }));
  jest.doMock("../cli/commands/dbSeed", () => ({
    dbSeed,
  }));
  jest.doMock("../cli/utils/typescript/tsRuntime", () => ({
    clearLoadedModuleCache,
  }));

  return {
    root,
    modelsDir,
    factoriesDir,
    seedsDir,
    migrationsRoot,
    controllersDir,
    servicesDir,
    makeFactory,
    makeController,
    makeService,
    makeMigration,
    migrateFresh,
    dbSeed,
    clearLoadedModuleCache,
    resolveConnectionNamesFromFlags,
    resolveConnectionName,
  };
}

describe("LTS phase 5 makeScenario coverage", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    jest.resetModules();
    process.exitCode = 0;
  });

  test("plan tracks the dedicated makeScenario coverage slice", () => {
    const planPath = path.resolve(
      process.cwd(),
      "validation tasks/LTS-Phase5-MakeScenario-Coverage-Plan.md",
    );
    const content = fs.readFileSync(planPath, "utf8");

    expect(content).toContain("# LTS Phase 5 MakeScenario Coverage Plan");
    expect(content).toContain("Status: COMPLETED");
    expect(content).toContain("src/cli/commands/makeScenario.ts");
    expect(content).toContain("src/lab_test/lts.phase5.make-scenario-coverage.logic.test.ts");
  });

  test("covers invalid manifest fallback, random preset selection, skipped existing models, and SQL fallback routing", async () => {
    const ctx = setupMakeScenarioHarness({
      isTest: false,
      useMongo: false,
      connectionNames: [],
      resolvedConnectionName: "sqlite_cov",
    });
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
    const randomSpy = jest.spyOn(Math, "random").mockReturnValue(0.99);
    const existingUserPath = path.join(ctx.modelsDir, "User.ts");
    fs.writeFileSync(existingUserPath, "// keep me\n", "utf8");

    const manifestPath = path.join(ctx.root, "src/app/.eloquent-scenario.json");
    fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
    fs.writeFileSync(manifestPath, "{invalid json", "utf8");

    try {
      const { makeScenario } = await import("../cli/commands/makeScenario");
      await makeScenario("unknown", {});

      expect(logSpy).toHaveBeenCalledWith("\nScenario preset: media");
      expect(logSpy).toHaveBeenCalledWith(`Model exists (skipped): ${existingUserPath}`);
      expect(fs.readFileSync(existingUserPath, "utf8")).toBe("// keep me\n");
      expect(fs.existsSync(ctx.controllersDir)).toBe(true);
      expect(fs.existsSync(ctx.servicesDir)).toBe(true);
      expect(ctx.makeMigration).toHaveBeenCalledWith(
        "all",
        expect.objectContaining({
          test: false,
          exit: false,
          connectionName: "sqlite_cov",
        }),
      );
      expect(ctx.makeFactory).toHaveBeenCalledTimes(4);
      expect(ctx.makeFactory).toHaveBeenCalledWith("User", {
        test: false,
        force: true,
        mongo: false,
      });

      const seederContent = fs.readFileSync(
        path.join(ctx.seedsDir, "MediaScenarioSeeder.ts"),
        "utf8",
      );
      expect(seederContent).toContain('import { PhotoFactory } from "../factories/PhotoFactory";');
      expect(seederContent).toContain('import { VideoFactory } from "../factories/VideoFactory";');
      expect(seederContent).toContain(
        'if (ctor && typeof ctor.getMorphClass === "function") {',
      );
      expect(seederContent).toContain("const tmp = pool[i];");

      const photoModel = fs.readFileSync(path.join(ctx.modelsDir, "Photo.ts"), "utf8");
      expect(photoModel).toContain('process.env.DB_CONNECTION ?? "sqlite_cov"');
      expect(logSpy).toHaveBeenCalledWith("\nScenario generation complete.\n");
    } finally {
      randomSpy.mockRestore();
      removeDir(ctx.root);
    }
  });

  test("covers empty-name preset fallback and the default options parameter", async () => {
    const ctx = setupMakeScenarioHarness({
      isTest: false,
      useMongo: false,
      connectionNames: [],
      resolvedConnectionName: "sqlite_default",
    });
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
    const randomSpy = jest.spyOn(Math, "random").mockReturnValue(0);

    try {
      const { makeScenario } = await import("../cli/commands/makeScenario");
      await makeScenario("");

      expect(logSpy).toHaveBeenCalledWith("\nScenario preset: blog");
      expect(ctx.resolveConnectionNamesFromFlags).toHaveBeenCalledWith(false, {
        mongo: false,
      });
      expect(ctx.makeMigration).toHaveBeenCalledWith(
        "all",
        expect.objectContaining({
          test: false,
          exit: false,
          connectionName: "sqlite_default",
        }),
      );
    } finally {
      randomSpy.mockRestore();
      removeDir(ctx.root);
    }
  });

  test("covers mongo connection guard when no mongo target is configured", async () => {
    const ctx = setupMakeScenarioHarness({
      isTest: true,
      useMongo: true,
      connectionNames: [],
      resolvedConnectionName: "mongo_test",
    });

    try {
      const { makeScenario } = await import("../cli/commands/makeScenario");
      await expect(
        makeScenario("blog", { test: true, mongo: true, force: true }),
      ).rejects.toThrow(
        "No mongo test connection configured. Set DB_TEST_CONNECTION=mongo_test or configure mongo_test in dbConfig.",
      );
    } finally {
      removeDir(ctx.root);
    }
  });

  test("covers app preset-changed rejection when force is not provided", async () => {
    const ctx = setupMakeScenarioHarness({
      isTest: false,
      useMongo: false,
      connectionNames: [],
      resolvedConnectionName: "sqlite_app",
    });

    const manifestPath = path.join(ctx.root, "src/app/.eloquent-scenario.json");
    fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
    fs.writeFileSync(
      manifestPath,
      JSON.stringify({
        presetId: "blog",
        generatedAt: new Date().toISOString(),
        models: ["User", "Post", "Comment"],
        seedName: "BlogScenarioSeeder",
      }),
      "utf8",
    );

    try {
      const { makeScenario } = await import("../cli/commands/makeScenario");
      await expect(makeScenario("media", {})).rejects.toThrow(
        'Existing app scenario "blog" is active. Re-run with --force to replace it.',
      );
    } finally {
      removeDir(ctx.root);
    }
  });

  test("covers preset-changed rejection when force is not provided", async () => {
    const ctx = setupMakeScenarioHarness({
      isTest: true,
      useMongo: true,
      connectionNames: ["mongo_test"],
      resolvedConnectionName: "mongo_test",
    });

    const manifestPath = path.join(ctx.root, "src/test/.eloquent-scenario.json");
    fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
    fs.writeFileSync(
      manifestPath,
      JSON.stringify({
        presetId: "blog",
        generatedAt: new Date().toISOString(),
        models: ["User", "Post", "Comment"],
        seedName: "BlogScenarioSeeder",
      }),
      "utf8",
    );

    try {
      const { makeScenario } = await import("../cli/commands/makeScenario");
      await expect(
        makeScenario("media", {
          test: true,
          mongo: true,
        }),
      ).rejects.toThrow(
        'Existing test scenario "blog" is active. Re-run with --force to replace it.',
      );
    } finally {
      removeDir(ctx.root);
    }
  });

  test("covers force cleanup, preset-changed warning, stale migration pruning, and mongo controller/service generation", async () => {
    const ctx = setupMakeScenarioHarness({
      isTest: true,
      useMongo: true,
      connectionNames: ["mongo_test"],
      resolvedConnectionName: "mongo_test",
    });
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);

    fs.mkdirSync(ctx.controllersDir, { recursive: true });
    fs.mkdirSync(ctx.servicesDir, { recursive: true });
    fs.writeFileSync(path.join(ctx.modelsDir, "User.ts"), "stale model\n", "utf8");
    fs.writeFileSync(path.join(ctx.factoriesDir, "UserFactory.ts"), "stale factory\n", "utf8");
    fs.writeFileSync(
      path.join(ctx.factoriesDir, "PostUserPivotFactory.ts"),
      "stale pivot factory\n",
      "utf8",
    );
    fs.writeFileSync(
      path.join(ctx.controllersDir, "UserController.ts"),
      "stale controller\n",
      "utf8",
    );
    fs.writeFileSync(path.join(ctx.servicesDir, "UserService.ts"), "stale service\n", "utf8");
    fs.writeFileSync(
      path.join(ctx.seedsDir, "BlogScenarioSeeder.ts"),
      "stale seeder\n",
      "utf8",
    );

    const manifestPath = path.join(ctx.root, "src/test/.eloquent-scenario.json");
    fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
    fs.writeFileSync(
      manifestPath,
      JSON.stringify({
        presetId: "blog",
        generatedAt: new Date().toISOString(),
        models: ["User", "Post", "Comment"],
        seedName: "BlogScenarioSeeder",
      }),
      "utf8",
    );

    const migrationDir = path.join(ctx.migrationsRoot, "mongo_test");
    fs.mkdirSync(migrationDir, { recursive: true });
    fs.writeFileSync(
      path.join(migrationDir, "20260315000000001_create_users_table.ts"),
      "export async function up() {}\n",
      "utf8",
    );
    fs.writeFileSync(path.join(migrationDir, "keep.txt"), "keep\n", "utf8");
    fs.writeFileSync(path.join(ctx.migrationsRoot, "note.txt"), "note\n", "utf8");
    const disappearingDir = path.join(ctx.migrationsRoot, "gone-after-scan");
    fs.mkdirSync(disappearingDir, { recursive: true });

    try {
      const originalExistsSync = fs.existsSync;
      const existsSpy = jest
        .spyOn(fs, "existsSync")
        .mockImplementation((target: fs.PathLike): boolean => {
          if (path.resolve(String(target)) === path.resolve(disappearingDir)) {
            return false;
          }
          return originalExistsSync(target);
        });
      const { makeScenario } = await import("../cli/commands/makeScenario");
      await makeScenario("media", {
        test: true,
        mongo: true,
        force: true,
        controllers: true,
        services: true,
      });

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining("Force cleanup removed"),
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          "Scenario preset changed. Run `eloquent migrate:fresh --test --mongo --force` before `migrate:run` to reset old scenario tables and history.",
        ),
      );
      expect(ctx.makeController).toHaveBeenCalledTimes(4);
      expect(ctx.makeService).toHaveBeenCalledTimes(4);
      expect(ctx.makeFactory).toHaveBeenCalledWith("Photo", {
        test: true,
        force: true,
        mongo: true,
      });
      expect(ctx.makeMigration).toHaveBeenCalledWith(
        "all",
        expect.objectContaining({
          test: true,
          exit: false,
          connectionName: "mongo_test",
        }),
      );
      expect(fs.existsSync(path.join(ctx.migrationsRoot, "mongo_test", "keep.txt"))).toBe(true);
      expect(
        fs.existsSync(
          path.join(ctx.migrationsRoot, "mongo_test", "20260315000000001_create_users_table.ts"),
        ),
      ).toBe(false);
      expect(ctx.clearLoadedModuleCache).toHaveBeenCalledWith(
        path.join(ctx.modelsDir, "User.ts"),
      );
      expect(ctx.clearLoadedModuleCache).toHaveBeenCalledWith(
        path.join(ctx.factoriesDir, "UserFactory.ts"),
      );
      expect(ctx.clearLoadedModuleCache).toHaveBeenCalledWith(
        path.join(ctx.seedsDir, "BlogScenarioSeeder.ts"),
      );

      const userModel = fs.readFileSync(path.join(ctx.modelsDir, "User.ts"), "utf8");
      expect(userModel).toContain("extends MongoModel");
      expect(userModel).toContain('static connectionName = "mongo_test"');
      expect(logSpy).toHaveBeenCalledWith("\nScenario generation complete.\n");
      existsSpy.mockRestore();
    } finally {
      removeDir(ctx.root);
    }
  });

  test("covers preset-changed app warning when the migrations root does not exist", async () => {
    const ctx = setupMakeScenarioHarness({
      isTest: false,
      useMongo: false,
      connectionNames: [],
      resolvedConnectionName: "sqlite_warn",
    });
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);

    const manifestPath = path.join(ctx.root, "src/app/.eloquent-scenario.json");
    fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
    fs.writeFileSync(
      manifestPath,
      JSON.stringify({
        presetId: "blog",
        generatedAt: new Date().toISOString(),
        models: ["User", "Post", "Comment"],
        seedName: "BlogScenarioSeeder",
      }),
      "utf8",
    );
    removeDir(ctx.migrationsRoot);

    try {
      const { makeScenario } = await import("../cli/commands/makeScenario");
      await makeScenario("media", { force: true });

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          "Scenario preset changed. Run `eloquent migrate:fresh --force` before `migrate:run` to reset old scenario tables and history.",
        ),
      );
      expect(ctx.makeMigration).toHaveBeenCalledWith(
        "all",
        expect.objectContaining({
          test: false,
          exit: false,
          connectionName: "sqlite_warn",
        }),
      );
    } finally {
      removeDir(ctx.root);
    }
  });

  test("covers SQL scenario switches pruning stale blog pivot migrations in test mode", async () => {
    const ctx = setupMakeScenarioHarness({
      isTest: true,
      useMongo: false,
      connectionNames: [],
      resolvedConnectionName: "mysql_test",
    });
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);

    const manifestPath = path.join(ctx.root, "src/test/.eloquent-scenario.json");
    fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
    fs.writeFileSync(
      manifestPath,
      JSON.stringify({
        presetId: "blog",
        generatedAt: new Date().toISOString(),
        models: ["User", "Post", "Comment"],
        seedName: "BlogScenarioSeeder",
      }),
      "utf8",
    );

    const migrationDir = path.join(ctx.migrationsRoot, "mysql_test");
    fs.mkdirSync(migrationDir, { recursive: true });
    const stalePostsMigration = path.join(
      migrationDir,
      "20260315000000001_create_posts_table.ts",
    );
    const stalePivotMigration = path.join(
      migrationDir,
      "20260315000000002_create_post_user_pivot_table.ts",
    );
    fs.writeFileSync(stalePostsMigration, "export async function up() {}\n", "utf8");
    fs.writeFileSync(stalePivotMigration, "export async function up() {}\n", "utf8");

    try {
      const { makeScenario } = await import("../cli/commands/makeScenario");
      await makeScenario("media", { test: true, force: true });

      expect(fs.existsSync(stalePostsMigration)).toBe(false);
      expect(fs.existsSync(stalePivotMigration)).toBe(false);
      expect(fs.existsSync(path.join(ctx.modelsDir, "Photo.ts"))).toBe(true);
      expect(fs.existsSync(path.join(ctx.modelsDir, "Video.ts"))).toBe(true);
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          "Scenario preset changed. Run `eloquent migrate:fresh --test --force` before `migrate:run` to reset old scenario tables and history.",
        ),
      );
    } finally {
      removeDir(ctx.root);
    }
  });
});

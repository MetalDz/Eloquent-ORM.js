import fs from "fs";
import os from "os";
import path from "path";

type CommandAction = (...args: unknown[]) => unknown;
type CommandRecord = {
  name: string;
  options: string[];
  description?: string;
  action?: CommandAction;
};

const identityChalkMock = {
  __esModule: true,
  default: new Proxy(
    {},
    {
      get: () => (value: unknown) => String(value),
    },
  ),
};

function createProgramDouble(): {
  program: { command(name: string): unknown };
  commands: CommandRecord[];
} {
  type CommandChain = {
    option(flag: string): CommandChain;
    description(text: string): CommandChain;
    action(handler: CommandAction): CommandChain;
  };

  const commands: CommandRecord[] = [];
  const program = {
    command(name: string): unknown {
      const record: CommandRecord = { name, options: [] };
      commands.push(record);
      const chain: CommandChain = {
        option(flag: string): CommandChain {
          record.options.push(flag);
          return chain;
        },
        description(text: string): CommandChain {
          record.description = text;
          return chain;
        },
        action(handler: CommandAction): CommandChain {
          record.action = handler;
          return chain;
        },
      };
      return chain;
    },
  };

  return { program, commands };
}

function requireCommand(commands: CommandRecord[], name: string): CommandAction {
  const command = commands.find((entry) => entry.name === name);
  if (!command?.action) {
    throw new Error(`Missing registered command: ${name}`);
  }
  return command.action;
}

describe("LTS phase 5 CLI registration / security / utility coverage", () => {
  const originalCwd = process.cwd();
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
    process.env = { ...originalEnv };
    process.chdir(originalCwd);
    jest.spyOn(console, "log").mockImplementation(() => undefined);
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
    jest.spyOn(console, "table").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
    process.env = { ...originalEnv };
    process.chdir(originalCwd);
  });

  test("plan tracks the zero-percent helper slice", () => {
    const content = fs.readFileSync(
      path.resolve(
        process.cwd(),
        "validation tasks/LTS-Phase5-CLI-Registration-Security-Utility-Coverage-Plan.md",
      ),
      "utf8",
    );

    expect(content).toContain("Status: COMPLETED");
    expect(content).toContain("src/cli/utils/CliMigrationCommandRegistration.ts");
    expect(content).toContain("src/core/security/EnvKeySecurity.ts");
    expect(content).toContain(
      "src/lab_test/lts.phase5.cli-registration-security-utility-coverage.logic.test.ts",
    );
  });

  test("makeSeed covers success, quiet-false, force-overwrite, and error paths", async () => {
    const load = jest.fn(() => "seed-template");
    const render = jest.fn(() => "rendered-seed");
    const ensureDirs = jest.fn();
    const seeds = jest.fn(() => path.join(os.tmpdir(), "seed-output"));
    const writeFileSafe = jest.fn(() => true);
    const overwriteFile = jest.fn(() => true);

    jest.doMock("chalk", () => identityChalkMock);
    jest.doMock("../cli/utils/TemplateEngine", () => ({
      TemplateEngine: { load, render },
    }));
    jest.doMock("../cli/utils/PathMap", () => ({
      PathMap: { ensureDirs, seeds },
    }));
    jest.doMock("../cli/utils/fileWriter", () => ({
      overwriteFile,
      writeFileSafe,
    }));

    let makeSeed!: (name: string, options?: {
      count?: number;
      test?: boolean;
      force?: boolean;
      mongo?: boolean;
    }) => Promise<void>;

    jest.isolateModules(() => {
      ({ makeSeed } = require("../cli/commands/makeSeed") as {
        makeSeed: typeof makeSeed;
      });
    });

    await makeSeed("user");
    expect(ensureDirs).toHaveBeenCalled();
    expect(load).toHaveBeenCalledWith("seed");
    expect(render).toHaveBeenCalledWith(
      "seed-template",
      expect.objectContaining({
        SeederName: "UserSeeder",
        FactoryName: "UserFactory",
        ModelName: "User",
        Count: 10,
      }),
    );
    expect(writeFileSafe).toHaveBeenCalledWith(
      path.resolve(path.join(os.tmpdir(), "seed-output"), "UserSeeder.ts"),
      "rendered-seed",
    );
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("OK: Seeder created: UserSeeder"),
    );

    (console.log as jest.Mock).mockClear();
    writeFileSafe.mockReturnValueOnce(false);
    await makeSeed("user");
    expect(console.log).not.toHaveBeenCalled();

    await makeSeed("post", { count: 3, test: true, force: true, mongo: true });
    expect(overwriteFile).toHaveBeenCalledWith(
      path.resolve(path.join(os.tmpdir(), "seed-output"), "PostSeeder.ts"),
      "rendered-seed",
    );
    expect(render).toHaveBeenLastCalledWith(
      "seed-template",
      expect.objectContaining({ Count: 3, SeederName: "PostSeeder" }),
    );

    writeFileSafe.mockImplementationOnce(() => {
      throw new Error("disk-full");
    });
    await makeSeed("comment");
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("ERROR: Failed to create seeder file."),
    );
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("disk-full"));

    writeFileSafe.mockImplementationOnce(() => {
      throw "string-failure";
    });
    await makeSeed("audit");
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("ERROR: Failed to create seeder file."),
    );
  });

  test("dbSeedBootstrapPrecheck delegates with default and explicit options", async () => {
    const assertSeedBootstrapPrecheck = jest.fn().mockResolvedValue(true);
    jest.doMock("../cli/utils/SeedBootstrapPrecheck", () => ({
      assertSeedBootstrapPrecheck,
    }));

    let dbSeedBootstrapPrecheck!: (options?: Record<string, unknown>) => Promise<void>;
    jest.isolateModules(() => {
      ({ dbSeedBootstrapPrecheck } = require("../cli/commands/dbSeedBootstrapPrecheck") as {
        dbSeedBootstrapPrecheck: typeof dbSeedBootstrapPrecheck;
      });
    });

    await dbSeedBootstrapPrecheck();
    await dbSeedBootstrapPrecheck({ test: true, connectionNames: ["mongo_test"] });

    expect(assertSeedBootstrapPrecheck).toHaveBeenNthCalledWith(1, {});
    expect(assertSeedBootstrapPrecheck).toHaveBeenNthCalledWith(2, {
      test: true,
      connectionNames: ["mongo_test"],
    });
  });

  test("CLI make-artifact registrations cover guard and success flows", async () => {
    const makeSeed = jest.fn().mockResolvedValue(undefined);
    const makeFactory = jest.fn().mockResolvedValue(undefined);
    const makeScenario = jest.fn().mockResolvedValue(undefined);
    const ensureCliProductionOverride = jest.fn().mockReturnValue(true);
    const ensureCliProductionTestOnly = jest.fn().mockReturnValue(true);
    const runCliAction = jest.fn(async (action: () => Promise<void>) => action());

    jest.doMock("../cli/commands/makeSeed", () => ({ makeSeed }));
    jest.doMock("../cli/commands/makeFactory", () => ({ makeFactory }));
    jest.doMock("../cli/commands/makeScenario", () => ({ makeScenario }));
    jest.doMock("../cli/utils/CliProductionGuards", () => ({
      ensureCliProductionOverride,
      ensureCliProductionTestOnly,
    }));
    jest.doMock("../cli/utils/CliActionRuntime", () => ({ runCliAction }));

    let registerCliMakeArtifactCommands!: (program: { command(name: string): unknown }) => void;
    jest.isolateModules(() => {
      ({ registerCliMakeArtifactCommands } = require("../cli/utils/CliMakeArtifactCommandRegistration") as {
        registerCliMakeArtifactCommands: typeof registerCliMakeArtifactCommands;
      });
    });

    const { program, commands } = createProgramDouble();
    registerCliMakeArtifactCommands(program);

    expect(commands.map((entry) => entry.name)).toEqual([
      "make:seed <model>",
      "make:factory <name>",
      "make:scenario <name>",
    ]);

    ensureCliProductionTestOnly.mockReturnValueOnce(false);
    await requireCommand(commands, "make:seed <model>")("User", {
      count: "7",
      test: true,
    });
    expect(makeSeed).not.toHaveBeenCalled();

    ensureCliProductionTestOnly.mockReturnValueOnce(true);
    ensureCliProductionOverride.mockReturnValueOnce(false);
    await requireCommand(commands, "make:seed <model>")("User", {
      count: "7",
      test: true,
      force: true,
      yes: true,
    });
    expect(makeSeed).not.toHaveBeenCalled();

    await requireCommand(commands, "make:seed <model>")("User", {
      count: "7",
      test: true,
      mongo: true,
      force: true,
      yes: true,
    });
    expect(makeSeed).toHaveBeenCalledWith("User", {
      count: 7,
      test: true,
      force: true,
      mongo: true,
    });

    ensureCliProductionTestOnly.mockReturnValueOnce(false);
    await requireCommand(commands, "make:factory <name>")("User", { test: true });
    expect(makeFactory).not.toHaveBeenCalled();

    ensureCliProductionTestOnly.mockReturnValueOnce(true);
    ensureCliProductionOverride.mockReturnValueOnce(false);
    await requireCommand(commands, "make:factory <name>")("User", {
      test: true,
      force: true,
      yes: true,
    });
    expect(makeFactory).not.toHaveBeenCalled();

    await requireCommand(commands, "make:factory <name>")("User", {
      model: "Account",
      test: true,
      mongo: true,
      force: true,
      yes: true,
    });
    await requireCommand(commands, "make:factory <name>")("Fallback", {
      test: true,
      force: true,
      yes: true,
    });
    expect(makeFactory).toHaveBeenNthCalledWith(1, "Account", {
      test: true,
      force: true,
      mongo: true,
    });
    expect(makeFactory).toHaveBeenNthCalledWith(2, "Fallback", {
      test: true,
      force: true,
      mongo: false,
    });

    ensureCliProductionTestOnly.mockReturnValueOnce(false);
    await requireCommand(commands, "make:scenario <name>")("blog", { test: true });
    expect(makeScenario).not.toHaveBeenCalled();

    ensureCliProductionTestOnly.mockReturnValueOnce(true);
    ensureCliProductionOverride.mockReturnValueOnce(false);
    await requireCommand(commands, "make:scenario <name>")("blog", {
      test: true,
      force: true,
      yes: true,
    });
    expect(makeScenario).not.toHaveBeenCalled();

    await requireCommand(commands, "make:scenario <name>")("blog", {
      test: true,
      mongo: true,
      preset: "media",
      controllers: true,
      services: true,
      run: true,
      force: true,
      yes: true,
    });
    expect(runCliAction).toHaveBeenCalledTimes(3);
    expect(makeScenario).toHaveBeenCalledWith("blog", {
      test: true,
      mongo: true,
      preset: "media",
      controllers: true,
      services: true,
      run: true,
      force: true,
    });
  });

  test("CLI scaffold registrations cover guard and success flows", async () => {
    const makeModel = jest.fn().mockResolvedValue(undefined);
    const makeController = jest.fn().mockResolvedValue(undefined);
    const makeService = jest.fn().mockResolvedValue(undefined);
    const makeRegistry = jest.fn().mockResolvedValue(undefined);
    const ensureCliProductionOverride = jest.fn().mockReturnValue(true);

    jest.doMock("../cli/commands/makeModel", () => ({ makeModel }));
    jest.doMock("../cli/commands/makeController", () => ({ makeController }));
    jest.doMock("../cli/commands/makeService", () => ({ makeService }));
    jest.doMock("../cli/commands/makeRegistry", () => ({ makeRegistry }));
    jest.doMock("../cli/utils/CliProductionGuards", () => ({
      ensureCliProductionOverride,
    }));

    let registerCliScaffoldCommands!: (program: { command(name: string): unknown }) => void;
    jest.isolateModules(() => {
      ({ registerCliScaffoldCommands } = require("../cli/utils/CliScaffoldCommandRegistration") as {
        registerCliScaffoldCommands: typeof registerCliScaffoldCommands;
      });
    });

    const { program, commands } = createProgramDouble();
    registerCliScaffoldCommands(program);

    expect(commands.map((entry) => entry.name)).toEqual([
      "make:model <name>",
      "make:registry",
      "make:controller <name>",
      "make:service <name>",
    ]);

    ensureCliProductionOverride.mockReturnValueOnce(false);
    await requireCommand(commands, "make:model <name>")("User", {
      force: true,
      yes: true,
    });
    expect(makeModel).not.toHaveBeenCalled();

    await requireCommand(commands, "make:model <name>")("User", {
      test: 1,
      mongo: "yes",
      force: true,
      yes: true,
      custom: "field",
    });
    expect(makeModel).toHaveBeenCalledWith(
      "User",
      expect.objectContaining({
        test: true,
        mongo: true,
        custom: "field",
      }),
    );

    ensureCliProductionOverride.mockReturnValueOnce(false);
    await requireCommand(commands, "make:registry")({ force: true, yes: true });
    expect(makeRegistry).not.toHaveBeenCalled();

    await requireCommand(commands, "make:registry")({ test: true, force: true, yes: true });
    expect(makeRegistry).toHaveBeenCalledWith({ test: true, force: true });

    ensureCliProductionOverride.mockReturnValueOnce(false);
    await requireCommand(commands, "make:controller <name>")("User", {
      force: true,
      yes: true,
    });
    expect(makeController).not.toHaveBeenCalled();

    await requireCommand(commands, "make:controller <name>")("User", {
      test: true,
      soft: true,
      force: true,
      yes: true,
    });
    expect(makeController).toHaveBeenCalledWith("User", {
      test: true,
      soft: true,
      force: true,
    });

    ensureCliProductionOverride.mockReturnValueOnce(false);
    await requireCommand(commands, "make:service <name>")("User", {
      force: true,
      yes: true,
    });
    expect(makeService).not.toHaveBeenCalled();

    await requireCommand(commands, "make:service <name>")("User", {
      test: true,
      force: true,
      yes: true,
    });
    expect(makeService).toHaveBeenCalledWith("User", {
      test: true,
      force: true,
    });
  });

  test("CLI migration registrations cover override, targeting, and action flows", async () => {
    const makeMigration = jest.fn().mockResolvedValue(undefined);
    const migrateRun = jest.fn().mockResolvedValue(undefined);
    const migrateRollback = jest.fn().mockResolvedValue(undefined);
    const migrateStatus = jest.fn().mockResolvedValue(undefined);
    const migrateFresh = jest.fn().mockResolvedValue(undefined);
    const migrateReset = jest.fn().mockResolvedValue(undefined);
    const resolveCliConnectionNames = jest.fn().mockReturnValue([]);
    const runCliAction = jest.fn(async (action: () => Promise<void>) => action());
    const ensureCliProductionOverride = jest.fn().mockReturnValue(true);

    jest.doMock("chalk", () => identityChalkMock);
    jest.doMock("../cli/commands/makeMigration", () => ({ makeMigration }));
    jest.doMock("../cli/commands/migrateRun", () => ({ migrateRun }));
    jest.doMock("../cli/commands/migrateRollback", () => ({ migrateRollback }));
    jest.doMock("../cli/commands/migrateStatus", () => ({ migrateStatus }));
    jest.doMock("../cli/commands/migrateFresh", () => ({ migrateFresh }));
    jest.doMock("../cli/commands/migrateReset", () => ({ migrateReset }));
    jest.doMock("../cli/utils/CliCommandTargets", () => ({ resolveCliConnectionNames }));
    jest.doMock("../cli/utils/CliActionRuntime", () => ({ runCliAction }));
    jest.doMock("../cli/utils/CliProductionGuards", () => ({
      ensureCliProductionOverride,
    }));

    let registerCliMigrationCommands!: (program: { command(name: string): unknown }) => void;
    jest.isolateModules(() => {
      ({ registerCliMigrationCommands } = require("../cli/utils/CliMigrationCommandRegistration") as {
        registerCliMigrationCommands: typeof registerCliMigrationCommands;
      });
    });

    const { program, commands } = createProgramDouble();
    registerCliMigrationCommands(program);

    expect(commands.map((entry) => entry.name)).toEqual([
      "make:migration [model]",
      "migrate:run [model]",
      "migrate:rollback",
      "migrate:status",
      "migrate:fresh",
      "migrate:reset",
    ]);

    ensureCliProductionOverride.mockReturnValueOnce(false);
    await requireCommand(commands, "make:migration [model]")(undefined, {
      force: true,
      yes: true,
    });
    expect(makeMigration).not.toHaveBeenCalled();

    await requireCommand(commands, "make:migration [model]")(undefined, {
      all: false,
      test: true,
    });
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("ERROR: Please provide a model name or use --all"),
    );

    await requireCommand(commands, "make:migration [model]")("User", {
      test: true,
      pivotSeparate: true,
    });
    expect(makeMigration).toHaveBeenCalledWith("User", {
      test: true,
      pivotSeparate: true,
      exit: false,
    });

    resolveCliConnectionNames.mockReturnValueOnce(["mysql", "pg"]);
    await requireCommand(commands, "make:migration [model]")(undefined, {
      all: true,
      test: true,
      pivotSeparate: true,
    });
    expect(makeMigration).toHaveBeenNthCalledWith(2, "all", {
      test: true,
      pivotSeparate: true,
      connectionName: "mysql",
      exit: false,
    });
    expect(makeMigration).toHaveBeenNthCalledWith(3, "all", {
      test: true,
      pivotSeparate: true,
      connectionName: "pg",
      exit: false,
    });

    await requireCommand(commands, "migrate:run [model]")("Post", {
      test: true,
      allMigrations: false,
    });
    expect(migrateRun).toHaveBeenCalledWith(true, "Post", false, true, {
      connectionNames: [],
    });

    await requireCommand(commands, "migrate:run [model]")(undefined, {
      test: true,
      allMigrations: true,
      pivotSeparate: true,
    });
    expect(makeMigration).toHaveBeenNthCalledWith(4, "all", {
      test: true,
      exit: false,
      pivotSeparate: true,
    });

    resolveCliConnectionNames.mockReturnValueOnce(["sqlite"]);
    await requireCommand(commands, "migrate:run [model]")(undefined, {
      test: true,
      allMigrations: true,
      pivotSeparate: false,
    });
    expect(makeMigration).toHaveBeenNthCalledWith(5, "all", {
      test: true,
      exit: false,
      pivotSeparate: false,
      connectionName: "sqlite",
    });

    await requireCommand(commands, "migrate:rollback")({
      test: true,
      step: "3",
      allMigrations: true,
    });
    expect(migrateRollback).toHaveBeenCalledWith({
      test: true,
      step: 3,
      allMigrations: true,
      connectionNames: [],
    });

    await requireCommand(commands, "migrate:rollback")({
      test: false,
      allMigrations: false,
    });
    expect(migrateRollback).toHaveBeenLastCalledWith({
      test: false,
      step: 1,
      allMigrations: false,
      connectionNames: [],
    });

    await requireCommand(commands, "migrate:status")({
      test: true,
      allMigrations: true,
    });
    expect(migrateStatus).toHaveBeenCalledWith({
      test: true,
      allMigrations: true,
      connectionNames: [],
    });

    ensureCliProductionOverride.mockReturnValueOnce(false);
    await requireCommand(commands, "migrate:fresh")({
      force: true,
      yes: true,
    });
    expect(migrateFresh).not.toHaveBeenCalled();

    await requireCommand(commands, "migrate:fresh")({
      test: true,
      force: true,
      yes: true,
      allMigrations: true,
    });
    expect(migrateFresh).toHaveBeenCalledWith({
      test: true,
      force: true,
      allMigrations: true,
      connectionNames: [],
    });

    ensureCliProductionOverride.mockReturnValueOnce(false);
    await requireCommand(commands, "migrate:reset")({
      force: true,
      yes: true,
    });
    expect(migrateReset).not.toHaveBeenCalled();

    resolveCliConnectionNames.mockReturnValueOnce(["mongo_test"]);
    await requireCommand(commands, "migrate:reset")({
      test: true,
      allMigrations: true,
      force: true,
      yes: true,
    });
    expect(migrateReset).toHaveBeenCalledWith({
      test: true,
      connectionNames: ["mongo_test"],
      allMigrations: true,
    });
    expect(runCliAction).toHaveBeenCalledTimes(5);
  });

  test("CLI seed/scenario registrations cover precheck, guard, and demo flows", async () => {
    const assertSeedBootstrapPrecheck = jest.fn().mockResolvedValue(true);
    const dbSeed = jest.fn().mockResolvedValue(undefined);
    const dbSeedFresh = jest.fn().mockResolvedValue(undefined);
    const demoScenario = jest.fn().mockResolvedValue(undefined);
    const dbSeedBootstrapPrecheck = jest.fn().mockResolvedValue(undefined);
    const ensureCliProductionOverride = jest.fn().mockReturnValue(true);
    const ensureCliProductionTestOnly = jest.fn().mockReturnValue(true);
    const resolveCliConnectionNames = jest.fn().mockReturnValue([]);
    const resolveCliPrimaryConnectionName = jest.fn().mockReturnValue("sqlite_test");
    const runCliAction = jest.fn(async (action: () => Promise<void>) => action());

    jest.doMock("../cli/utils/SeedBootstrapPrecheck", () => ({
      assertSeedBootstrapPrecheck,
    }));
    jest.doMock("../cli/commands/dbSeed", () => ({ dbSeed }));
    jest.doMock("../cli/commands/dbSeedFresh", () => ({ dbSeedFresh }));
    jest.doMock("../cli/commands/demoScenario", () => ({ demoScenario }));
    jest.doMock("../cli/commands/dbSeedBootstrapPrecheck", () => ({
      dbSeedBootstrapPrecheck,
    }));
    jest.doMock("../cli/utils/CliProductionGuards", () => ({
      ensureCliProductionOverride,
      ensureCliProductionTestOnly,
    }));
    jest.doMock("../cli/utils/CliCommandTargets", () => ({
      resolveCliConnectionNames,
      resolveCliPrimaryConnectionName,
    }));
    jest.doMock("../cli/utils/CliActionRuntime", () => ({ runCliAction }));

    let registerCliSeedScenarioCommands!: (program: { command(name: string): unknown }) => void;
    jest.isolateModules(() => {
      ({ registerCliSeedScenarioCommands } = require("../cli/utils/CliSeedScenarioCommandRegistration") as {
        registerCliSeedScenarioCommands: typeof registerCliSeedScenarioCommands;
      });
    });

    const { program, commands } = createProgramDouble();
    registerCliSeedScenarioCommands(program);

    expect(commands.map((entry) => entry.name)).toEqual([
      "db:seed",
      "db:seed:precheck",
      "db:seed:fresh",
      "demo:scenario",
    ]);

    ensureCliProductionTestOnly.mockReturnValueOnce(false);
    await requireCommand(commands, "db:seed")({ test: true });
    expect(dbSeed).not.toHaveBeenCalled();

    resolveCliConnectionNames.mockReturnValueOnce(["mysql_test", "pg_test"]);
    assertSeedBootstrapPrecheck.mockResolvedValueOnce(false);
    await expect(
      requireCommand(commands, "db:seed")({
        test: true,
        allConnections: true,
      }),
    ).rejects.toThrow(
      "All-connections seed precheck failed. Run migrate:run (with optional --test) first, then retry db:seed.",
    );

    resolveCliConnectionNames.mockReturnValueOnce(["sqlite_test"]);
    assertSeedBootstrapPrecheck.mockResolvedValueOnce(true);
    await requireCommand(commands, "db:seed")({
      test: true,
      allConnections: true,
      class: "BlogSeeder",
      silent: true,
      noHooks: true,
    });
    expect(dbSeed).toHaveBeenCalledWith({
      test: true,
      class: "BlogSeeder",
      silent: true,
      noHooks: true,
      connectionNames: ["sqlite_test"],
    });

    await requireCommand(commands, "db:seed")({
      test: true,
      class: "OneSeeder",
      silent: false,
      noHooks: false,
    });
    expect(dbSeed).toHaveBeenLastCalledWith({
      test: true,
      class: "OneSeeder",
      silent: false,
      noHooks: false,
      connectionNames: [],
    });

    resolveCliConnectionNames.mockReturnValueOnce(["mongo_test"]);
    await requireCommand(commands, "db:seed:precheck")({
      test: true,
      mongo: true,
    });
    expect(dbSeedBootstrapPrecheck).toHaveBeenCalledWith({
      test: true,
      connectionNames: ["mongo_test"],
    });

    ensureCliProductionTestOnly.mockReturnValueOnce(false);
    await requireCommand(commands, "db:seed:fresh")({ test: true });
    expect(dbSeedFresh).not.toHaveBeenCalled();

    ensureCliProductionTestOnly.mockReturnValueOnce(true);
    ensureCliProductionOverride.mockReturnValueOnce(false);
    await requireCommand(commands, "db:seed:fresh")({
      test: true,
      force: true,
      yes: true,
    });
    expect(dbSeedFresh).not.toHaveBeenCalled();

    resolveCliConnectionNames.mockReturnValueOnce(["mysql_test"]);
    await requireCommand(commands, "db:seed:fresh")({
      test: true,
      class: "BlogSeeder",
      force: true,
      yes: true,
      silent: true,
      noHooks: true,
    });
    expect(dbSeedFresh).toHaveBeenCalledWith({
      test: true,
      class: "BlogSeeder",
      force: true,
      silent: true,
      noHooks: true,
      connectionNames: ["mysql_test"],
    });

    await requireCommand(commands, "demo:scenario")({
      user: "7",
      random: true,
      test: true,
      mysql: true,
    });
    await requireCommand(commands, "demo:scenario")({
      user: "oops",
      random: false,
      test: false,
    });
    await requireCommand(commands, "demo:scenario")({
      random: false,
      test: true,
    });
    expect(demoScenario).toHaveBeenNthCalledWith(1, {
      user: 7,
      random: true,
      test: true,
      connectionName: "sqlite_test",
    });
    expect(demoScenario).toHaveBeenNthCalledWith(2, {
      user: undefined,
      random: false,
      test: false,
      connectionName: "sqlite_test",
    });
    expect(demoScenario).toHaveBeenNthCalledWith(3, {
      user: undefined,
      random: false,
      test: true,
      connectionName: "sqlite_test",
    });
  });

  test("CLI support registrations cover cache, factory status, and list output", async () => {
    const cacheClear = jest.fn();
    const cacheStats = jest.fn();
    const factoryStatus = jest.fn().mockResolvedValue(undefined);
    const CLI_COMMAND_CATALOG = [{ Command: "list", Description: "help" }];

    jest.doMock("chalk", () => identityChalkMock);
    jest.doMock("../cli/commands/cacheClear", () => ({ cacheClear }));
    jest.doMock("../cli/commands/cacheStats", () => ({ cacheStats }));
    jest.doMock("../cli/commands/factoryStatus", () => ({ factoryStatus }));
    jest.doMock("../cli/utils/CliCommandCatalog", () => ({ CLI_COMMAND_CATALOG }));

    let registerCliSupportCommands!: (program: { command(name: string): unknown }) => void;
    jest.isolateModules(() => {
      ({ registerCliSupportCommands } = require("../cli/utils/CliSupportCommandRegistration") as {
        registerCliSupportCommands: typeof registerCliSupportCommands;
      });
    });

    const { program, commands } = createProgramDouble();
    registerCliSupportCommands(program);

    expect(commands.map((entry) => entry.name)).toEqual([
      "cache:clear",
      "cache:stats",
      "factory:status",
      "list",
    ]);

    await requireCommand(commands, "cache:clear")();
    await requireCommand(commands, "cache:stats")();
    await requireCommand(commands, "factory:status")({
      details: true,
      graph: true,
      mongo: true,
    });
    await requireCommand(commands, "list")();

    expect(cacheClear).toHaveBeenCalled();
    expect(cacheStats).toHaveBeenCalled();
    expect(factoryStatus).toHaveBeenCalledWith({ details: true, graph: true, mongo: true });
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Available Commands"));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("--test"));
    expect(console.table).toHaveBeenCalledWith(CLI_COMMAND_CATALOG);
  });

  test("CliPresentation renders the figlet banner and subtitle", () => {
    const textSync = jest.fn(() => "ASCII-BANNER");
    jest.doMock("chalk", () => identityChalkMock);
    jest.doMock("figlet", () => ({
      __esModule: true,
      default: { textSync },
    }));
    jest.doMock("../cli/utils/CliVersion", () => ({
      resolveCliVersion: () => "9.9.9",
    }));

    let printCliBanner!: (writeLine?: (...args: unknown[]) => void) => void;
    jest.isolateModules(() => {
      ({ printCliBanner } = require("../cli/utils/CliPresentation") as {
        printCliBanner: typeof printCliBanner;
      });
    });

    const writeLine = jest.fn();
    printCliBanner(writeLine);
    printCliBanner();

    expect(textSync).toHaveBeenCalledWith("Eloquent ORM JS", {
      horizontalLayout: "fitted",
    });
    expect(writeLine).toHaveBeenNthCalledWith(1, "ASCII-BANNER");
    expect(writeLine).toHaveBeenNthCalledWith(
      2,
      "  Developer CLI for Eloquent ORM JS (v9.9.9)\n",
    );
    expect(console.log).toHaveBeenCalledWith("ASCII-BANNER");
  });

  test("RuntimeDetector covers heavy, skipped, combined, and debug-default branches", () => {
    let RuntimeDetector!: { needsTypeScriptRuntime(argv?: string[]): boolean };
    jest.isolateModules(() => {
      ({ RuntimeDetector } = require("../cli/utils/typescript/RuntimeDetector") as {
        RuntimeDetector: typeof RuntimeDetector;
      });
    });

    process.argv = ["node", "cli", "list"];
    expect(RuntimeDetector.needsTypeScriptRuntime()).toBe(false);
    expect(RuntimeDetector.needsTypeScriptRuntime(["node", "cli", "make:model"])).toBe(true);
    expect(RuntimeDetector.needsTypeScriptRuntime(["node", "cli", "cache:clear"])).toBe(false);
    expect(
      RuntimeDetector.needsTypeScriptRuntime(["node", "cli", "make:model", "--help"]),
    ).toBe(false);

    process.env.DEBUG = "true";
    expect(RuntimeDetector.needsTypeScriptRuntime(["node", "cli", "make:model"])).toBe(true);
    expect(RuntimeDetector.needsTypeScriptRuntime(["node", "cli", "cache:clear"])).toBe(false);
    expect(RuntimeDetector.needsTypeScriptRuntime(["node", "cli", "custom"])).toBe(false);
    expect((console.log as jest.Mock).mock.calls.flat().join(" ")).toContain("RuntimeDetector");
  });

  test("BaseCommand boots runtime and emits helper messages", () => {
    const ensureRuntime = jest.fn();
    jest.doMock("chalk", () => identityChalkMock);
    jest.doMock("../cli/utils/typescript/TypeScriptCompiler", () => ({
      TypeScriptCompiler: { ensureRuntime },
    }));

    let BaseCommand!: abstract new () => unknown;
    jest.isolateModules(() => {
      ({ BaseCommand } = require("../cli/utils/typescript/BaseCommand") as {
        BaseCommand: typeof BaseCommand;
      });
    });

    class ProbeCommand extends (BaseCommand as abstract new () => {
      success(message: string): void;
      info(message: string): void;
      warn(message: string): void;
      error(message: string, err?: unknown): void;
      compiler: unknown;
    }) {
      run(): unknown {
        return this.compiler;
      }
      exposeSuccess(message: string): void {
        this.success(message);
      }
      exposeInfo(message: string): void {
        this.info(message);
      }
      exposeWarn(message: string): void {
        this.warn(message);
      }
      exposeError(message: string, err?: unknown): void {
        this.error(message, err);
      }
    }

    const probe = new ProbeCommand();
    expect(ensureRuntime).toHaveBeenCalled();
    expect(probe.run()).toBeDefined();

    probe.exposeSuccess("done");
    probe.exposeInfo("info");
    probe.exposeWarn("warn");
    probe.exposeError("fail", new Error("boom"));
    probe.exposeError("plain");

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("done"));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("info"));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("warn"));
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("fail"));
    expect(console.error).toHaveBeenCalledWith(expect.any(Error));
  });

  test("security helpers cover init, audit, prompt, factory selection, and barrel exports", async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "security-coverage-"));

    jest.doMock("chalk", () => identityChalkMock);
    const createInterface = jest.fn();
    jest.doMock("readline", () => ({
      __esModule: true,
      default: { createInterface },
      createInterface,
    }));

    let AbstractSecurity!: abstract new () => {
      init(): Promise<void>;
      confirmPrivilege(action: string): Promise<boolean>;
      logAudit(action: string, status: "success" | "failure"): Promise<void>;
    };
    let EnvKeySecurity!: new () => {
      init(): Promise<void>;
      confirmPrivilege(action: string): Promise<boolean>;
    };
    let NoSecurity!: new () => {
      confirmPrivilege(action?: string): Promise<boolean>;
      logAudit(action?: string, status?: "success" | "failure"): Promise<void>;
    };
    let SecurityFactory!: { create(): unknown };

    jest.isolateModules(() => {
      ({ AbstractSecurity } = require("../core/security/AbstractSecurity") as {
        AbstractSecurity: typeof AbstractSecurity;
      });
      ({ EnvKeySecurity } = require("../core/security/EnvKeySecurity") as {
        EnvKeySecurity: typeof EnvKeySecurity;
      });
      ({ NoSecurity } = require("../core/security/NoSecurity") as {
        NoSecurity: typeof NoSecurity;
      });
      ({ SecurityFactory } = require("../core/security/SecurityFactory") as {
        SecurityFactory: typeof SecurityFactory;
      });
    });

    class ProbeSecurity extends (AbstractSecurity as abstract new () => {
      init(): Promise<void>;
      confirmPrivilege(action: string): Promise<boolean>;
      logAudit(action: string, status: "success" | "failure"): Promise<void>;
      initialized: boolean;
      logDir: string;
      logFile: string;
    }) {}

    const probe = new ProbeSecurity();
    probe.logDir = path.join(tempRoot, "logs");
    probe.logFile = path.join(probe.logDir, "migrations.log");

    await probe.init();
    expect(probe.initialized).toBe(true);
    expect(fs.existsSync(probe.logDir)).toBe(true);
    await expect(probe.confirmPrivilege("drop")).resolves.toBe(true);
    await probe.logAudit("migrate:run", "success");
    expect(fs.readFileSync(probe.logFile, "utf8")).toContain("migrate:run");

    delete process.env.USER;
    process.env.USERNAME = "windows-user";
    await probe.logAudit("migrate:username", "success");
    expect(fs.readFileSync(probe.logFile, "utf8")).toContain("windows-user");

    delete process.env.USERNAME;
    await probe.logAudit("migrate:unknown", "success");
    expect(fs.readFileSync(probe.logFile, "utf8")).toContain("unknown");

    const appendSpy = jest.spyOn(fs, "appendFileSync").mockImplementationOnce(() => {
      throw new Error("audit-failed");
    });
    await probe.logAudit("migrate:reset", "failure");
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("Failed to write audit log:"),
      expect.any(Error),
    );
    appendSpy.mockRestore();

    delete process.env.ELOQUENT_MIGRATION_KEY;
    const unsecured = new EnvKeySecurity();
    await unsecured.init();
    await expect(unsecured.confirmPrivilege("unsafe")).resolves.toBe(true);

    process.env.ELOQUENT_MIGRATION_KEY = "secret";
    const invalidQuestion = jest.fn((_prompt: string, callback: (answer: string) => void) =>
      callback("wrong"),
    );
    const validQuestion = jest.fn((_prompt: string, callback: (answer: string) => void) =>
      callback("secret"),
    );
    createInterface
      .mockReturnValueOnce({ question: invalidQuestion, close: jest.fn() })
      .mockReturnValueOnce({ question: validQuestion, close: jest.fn() });

    const secured = new EnvKeySecurity();
    await secured.init();
    await expect(secured.confirmPrivilege("drop")).resolves.toBe(false);
    await expect(secured.confirmPrivilege("drop")).resolves.toBe(true);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Invalid migration key."));

    const noSecurity = new NoSecurity();
    await expect(noSecurity.confirmPrivilege()).resolves.toBe(true);
    await expect(noSecurity.logAudit()).resolves.toBeUndefined();

    process.env.ELOQUENT_SECURITY_MODE = "ENVKEY";
    expect(SecurityFactory.create()).toBeInstanceOf(EnvKeySecurity);
    process.env.ELOQUENT_SECURITY_MODE = "none";
    expect(SecurityFactory.create()).toBeInstanceOf(NoSecurity);
    process.env.ELOQUENT_SECURITY_MODE = "custom";
    expect(SecurityFactory.create()).toBeInstanceOf(NoSecurity);
    delete process.env.ELOQUENT_SECURITY_MODE;
    expect(SecurityFactory.create()).toBeInstanceOf(NoSecurity);

    const barrel = require("../core/security") as Record<string, unknown>;
    expect(typeof barrel.AbstractSecurity).toBe("function");
    expect(typeof barrel.EnvKeySecurity).toBe("function");
    expect(typeof barrel.NoSecurity).toBe("function");
    expect(typeof barrel.SecurityFactory).toBe("function");
  });
});

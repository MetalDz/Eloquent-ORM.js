import fs from "fs";
import os from "os";
import path from "path";

const identityChalkMock = {
  __esModule: true,
  default: new Proxy(
    {},
    {
      get: () => (value: unknown) => String(value),
    },
  ),
};

describe("LTS phase 5 CLI entrypoint coverage", () => {
  const originalCwd = process.cwd();
  const originalEnv = { ...process.env };
  const originalArgv = [...process.argv];
  const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
  };

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
    process.env = { ...originalEnv };
    process.argv = [...originalArgv];
    process.chdir(originalCwd);
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
    console.info = originalConsole.info;
    jest.spyOn(console, "log").mockImplementation(() => undefined);
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    jest.spyOn(console, "info").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
    process.env = { ...originalEnv };
    process.argv = [...originalArgv];
    process.chdir(originalCwd);
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
    console.info = originalConsole.info;
  });

  test("plan tracks the CLI entrypoint slice", () => {
    const content = fs.readFileSync(
      path.resolve(
        process.cwd(),
        "validation tasks/LTS-Phase5-Cli-Entrypoint-Coverage-Plan.md",
      ),
      "utf8",
    );

    expect(content).toContain("Status: IN PROGRESS");
    expect(content).toContain("src/cli/eloquent.ts");
    expect(content).toContain("src/lab_test/lts.phase5.cli-entrypoint-coverage.logic.test.ts");
  });

  test("installCliLogging covers text, JSON, filtered, and failure flows", () => {
    jest.doMock("chalk", () => identityChalkMock);

    let installCliLogging!: (
      argv?: string[],
      env?: Record<string, string | undefined>,
      loggerConsole?: typeof console,
    ) => void;

    jest.isolateModules(() => {
      ({ installCliLogging } = require("../cli/eloquent") as {
        installCliLogging: typeof installCliLogging;
      });
    });

    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-cli-log-"));
    process.chdir(tempRoot);

    const textLog = jest.fn();
    const textWarn = jest.fn();
    const textError = jest.fn();
    const textInfo = jest.fn();
    const textConsole = {
      log: textLog,
      warn: textWarn,
      error: textError,
      info: textInfo,
    } as unknown as typeof console;

    installCliLogging(
      ["node", "cli", "migrate:run"],
      { ELOQUENT_DEBUG: "true" },
      textConsole,
    );

    const circular: Record<string, unknown> = {};
    circular.self = circular;
    textConsole.log("plain", circular);
    textConsole.warn("warn");
    textConsole.info("info");
    textConsole.error("error");

    const textLogFile = path.join(tempRoot, "src", "test", "logs", "migrate_run.log");
    const textContent = fs.readFileSync(textLogFile, "utf8");
    expect(textContent).toContain("[INFO] plain");
    expect(textContent).toContain("[WARN] warn");
    expect(textContent).toContain("[ERROR] error");
    expect(textLog).toHaveBeenCalled();
    expect(textWarn).toHaveBeenCalledWith("warn");
    expect(textInfo).toHaveBeenCalledWith("info");
    expect(textError).toHaveBeenCalledWith("error");

    const jsonLog = jest.fn();
    const jsonWarn = jest.fn();
    const jsonError = jest.fn();
    const jsonInfo = jest.fn();
    const jsonConsole = {
      log: jsonLog,
      warn: jsonWarn,
      error: jsonError,
      info: jsonInfo,
    } as unknown as typeof console;

    installCliLogging(
      ["node", "cli", "factory:status"],
      { ELOQUENT_LOG_FORMAT: "json" },
      jsonConsole,
    );
    jsonConsole.error("json-error");
    const jsonPayload = String(jsonError.mock.calls[0]?.[0]);
    expect(JSON.parse(jsonPayload)).toMatchObject({
      level: "error",
      message: "json-error",
      command: "factory_status",
    });

    const filteredLog = jest.fn();
    const filteredConsole = {
      log: filteredLog,
      warn: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
    } as unknown as typeof console;
    installCliLogging(
      ["node", "cli", "list"],
      { ELOQUENT_LOG_LEVEL: "error" },
      filteredConsole,
    );
    filteredConsole.log("skip-me");
    expect(filteredLog).not.toHaveBeenCalled();

    const mkdirSpy = jest.spyOn(fs, "mkdirSync").mockImplementationOnce(() => {
      throw new Error("mkdir-failed");
    });
    expect(() =>
      installCliLogging(
        ["node", "cli", "cache:clear"],
        { ELOQUENT_DEBUG: "true" },
        {
          log: jest.fn(),
          warn: jest.fn(),
          error: jest.fn(),
          info: jest.fn(),
        } as unknown as typeof console,
      ),
    ).not.toThrow();
    mkdirSpy.mockRestore();
  });

  test("initializeCliTypeScriptRuntime covers success, skip, and failure flows", () => {
    const ensureRuntime = jest.fn();
    const needsTypeScriptRuntime = jest.fn();
    const exitSpy = jest
      .spyOn(process, "exit")
      .mockImplementation(((code?: number) => {
        throw new Error(`exit:${code}`);
      }) as never);

    jest.doMock("chalk", () => identityChalkMock);
    jest.doMock("../cli/utils/typescript/TypeScriptCompiler", () => ({
      TypeScriptCompiler: { ensureRuntime },
    }));
    jest.doMock("../cli/utils/typescript/RuntimeDetector", () => ({
      RuntimeDetector: { needsTypeScriptRuntime },
    }));

    let initializeCliTypeScriptRuntime!: (
      argv?: string[],
      env?: Record<string, string | undefined>,
    ) => void;

    jest.isolateModules(() => {
      ({ initializeCliTypeScriptRuntime } = require("../cli/eloquent") as {
        initializeCliTypeScriptRuntime: typeof initializeCliTypeScriptRuntime;
      });
    });

    needsTypeScriptRuntime.mockReturnValueOnce(true);
    initializeCliTypeScriptRuntime(["node", "cli", "make:model"], {
      DEBUG: "true",
      ELOQUENT_DEBUG: "true",
    });
    expect(ensureRuntime).toHaveBeenCalled();
    expect((console.log as jest.Mock).mock.calls.flat().join(" ")).toContain(
      "TypeScript runtime enabled (ts-node).",
    );
    expect((console.log as jest.Mock).mock.calls.flat().join(" ")).toContain(
      "TypeScript runtime initialized (for TS-based command)",
    );
    expect((console.log as jest.Mock).mock.calls.flat().join(" ")).toContain(
      "[cli] after runtime init",
    );

    (console.log as jest.Mock).mockClear();
    needsTypeScriptRuntime.mockReturnValueOnce(false);
    initializeCliTypeScriptRuntime(["node", "cli", "list"], {
      DEBUG: "true",
    });
    expect((console.log as jest.Mock).mock.calls.flat().join(" ")).toContain(
      "Skipping TypeScript runtime - not needed for this command.",
    );

    needsTypeScriptRuntime.mockReturnValueOnce(true);
    ensureRuntime.mockImplementationOnce(() => {
      throw new Error("runtime-failed");
    });
    expect(() =>
      initializeCliTypeScriptRuntime(["node", "cli", "make:model"], {}),
    ).toThrow("exit:1");
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("ERROR: Failed to initialize TypeScript runtime at CLI startup."),
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  test("autoLoadCliFactories covers skip, success, and failure flows", async () => {
    const loadFactories = jest.fn().mockResolvedValue(undefined);
    const isCliTestArgv = jest.fn(() => true);
    const resolveCliRequestedStorageKind = jest.fn(() => "mongo");
    const shouldAutoLoadFactoriesForCli = jest.fn();

    jest.doMock("chalk", () => identityChalkMock);
    jest.doMock("../cli/utils/factories/FactoryLoader", () => ({
      loadFactories,
    }));
    jest.doMock("../cli/utils/CliBootstrapSupport", () => ({
      applyCliTestConnectionOverride: jest.fn(),
      isCliTestArgv,
      resolveCliRequestedStorageKind,
      shouldAutoLoadFactoriesForCli,
    }));

    let autoLoadCliFactories!: (
      argv?: string[],
      env?: Record<string, string | undefined>,
    ) => Promise<void>;

    jest.isolateModules(() => {
      ({ autoLoadCliFactories } = require("../cli/eloquent") as {
        autoLoadCliFactories: typeof autoLoadCliFactories;
      });
    });

    shouldAutoLoadFactoriesForCli.mockReturnValueOnce(false);
    await autoLoadCliFactories(["node", "cli", "list"], {
      ELOQUENT_DEBUG: "true",
    });
    expect(loadFactories).not.toHaveBeenCalled();
    expect((console.log as jest.Mock).mock.calls.flat().join(" ")).toContain(
      "[cli] factory auto-load check",
    );

    (console.log as jest.Mock).mockClear();
    shouldAutoLoadFactoriesForCli.mockReturnValueOnce(true);
    await autoLoadCliFactories(["node", "cli", "factory:status", "--test"], {
      DEBUG: "true",
      ELOQUENT_DEBUG: "true",
    });
    expect(loadFactories).toHaveBeenCalledWith(true, { storageKind: "mongo" });
    expect((console.log as jest.Mock).mock.calls.flat().join(" ")).toContain(
      "Factories loaded successfully.",
    );

    shouldAutoLoadFactoriesForCli.mockReturnValueOnce(true);
    loadFactories.mockRejectedValueOnce(new Error("factory-boom"));
    await autoLoadCliFactories(["node", "cli", "factory:status"], {});
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("ERROR: Failed to auto-load factories during CLI startup."),
    );
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("factory-boom"));
  });

  test("createCliProgram configures the command surface", () => {
    const printCliBanner = jest.fn();
    const registerCliSupportCommands = jest.fn();
    const registerCliScaffoldCommands = jest.fn();
    const registerCliMakeArtifactCommands = jest.fn();
    const registerCliSeedScenarioCommands = jest.fn();
    const registerCliMigrationCommands = jest.fn();

    const instances: Array<{
      name: jest.Mock;
      description: jest.Mock;
      version: jest.Mock;
      parse: jest.Mock;
      outputHelp: jest.Mock;
    }> = [];

    class FakeCommand {
      name = jest.fn().mockReturnThis();
      description = jest.fn().mockReturnThis();
      version = jest.fn().mockReturnThis();
      parse = jest.fn();
      outputHelp = jest.fn();
      constructor() {
        instances.push(this);
      }
    }

    jest.doMock("commander", () => ({ Command: FakeCommand }));
    jest.doMock("../cli/utils/CliPresentation", () => ({ printCliBanner }));
    jest.doMock("../cli/utils/CliSupportCommandRegistration", () => ({
      registerCliSupportCommands,
    }));
    jest.doMock("../cli/utils/CliScaffoldCommandRegistration", () => ({
      registerCliScaffoldCommands,
    }));
    jest.doMock("../cli/utils/CliMakeArtifactCommandRegistration", () => ({
      registerCliMakeArtifactCommands,
    }));
    jest.doMock("../cli/utils/CliSeedScenarioCommandRegistration", () => ({
      registerCliSeedScenarioCommands,
    }));
    jest.doMock("../cli/utils/CliMigrationCommandRegistration", () => ({
      registerCliMigrationCommands,
    }));

    let createCliProgram!: () => unknown;
    jest.isolateModules(() => {
      ({ createCliProgram } = require("../cli/eloquent") as {
        createCliProgram: typeof createCliProgram;
      });
    });

    const program = createCliProgram();
    const instance = instances[0];
    expect(program).toBe(instance);
    expect(printCliBanner).toHaveBeenCalled();
    expect(instance.name).toHaveBeenCalledWith("eloquent");
    expect(instance.description).toHaveBeenCalledWith(
      "Eloquent ORM JS Command Line Interface (Artisan-like tool)",
    );
    expect(instance.version).toHaveBeenCalledWith("1.0.0");
    expect(registerCliScaffoldCommands).toHaveBeenCalledWith(instance);
    expect(registerCliMakeArtifactCommands).toHaveBeenCalledWith(instance);
    expect(registerCliSeedScenarioCommands).toHaveBeenCalledWith(instance);
    expect(registerCliMigrationCommands).toHaveBeenCalledWith(instance);
    expect(registerCliSupportCommands).toHaveBeenCalledWith(instance);
  });

  test("runCli sets env, applies setup, parses argv, and prints help for empty commands", async () => {
    const loadFactories = jest.fn().mockResolvedValue(undefined);
    const applyCliTestConnectionOverride = jest.fn();
    const isCliTestArgv = jest.fn(() => false);
    const resolveCliRequestedStorageKind = jest.fn(() => undefined);
    const shouldAutoLoadFactoriesForCli = jest.fn(() => false);
    const ensureRuntime = jest.fn();
    const needsTypeScriptRuntime = jest.fn(() => false);
    const printCliBanner = jest.fn();
    const registerCliSupportCommands = jest.fn();
    const registerCliScaffoldCommands = jest.fn();
    const registerCliMakeArtifactCommands = jest.fn();
    const registerCliSeedScenarioCommands = jest.fn();
    const registerCliMigrationCommands = jest.fn();

    const instances: Array<{
      name: jest.Mock;
      description: jest.Mock;
      version: jest.Mock;
      parse: jest.Mock;
      outputHelp: jest.Mock;
    }> = [];

    class FakeCommand {
      name = jest.fn().mockReturnThis();
      description = jest.fn().mockReturnThis();
      version = jest.fn().mockReturnThis();
      parse = jest.fn();
      outputHelp = jest.fn();
      constructor() {
        instances.push(this);
      }
    }

    jest.doMock("chalk", () => identityChalkMock);
    jest.doMock("commander", () => ({ Command: FakeCommand }));
    jest.doMock("../cli/utils/factories/FactoryLoader", () => ({
      loadFactories,
    }));
    jest.doMock("../cli/utils/CliBootstrapSupport", () => ({
      applyCliTestConnectionOverride,
      isCliTestArgv,
      resolveCliRequestedStorageKind,
      shouldAutoLoadFactoriesForCli,
    }));
    jest.doMock("../cli/utils/typescript/TypeScriptCompiler", () => ({
      TypeScriptCompiler: { ensureRuntime },
    }));
    jest.doMock("../cli/utils/typescript/RuntimeDetector", () => ({
      RuntimeDetector: { needsTypeScriptRuntime },
    }));
    jest.doMock("../cli/utils/CliPresentation", () => ({ printCliBanner }));
    jest.doMock("../cli/utils/CliSupportCommandRegistration", () => ({
      registerCliSupportCommands,
    }));
    jest.doMock("../cli/utils/CliScaffoldCommandRegistration", () => ({
      registerCliScaffoldCommands,
    }));
    jest.doMock("../cli/utils/CliMakeArtifactCommandRegistration", () => ({
      registerCliMakeArtifactCommands,
    }));
    jest.doMock("../cli/utils/CliSeedScenarioCommandRegistration", () => ({
      registerCliSeedScenarioCommands,
    }));
    jest.doMock("../cli/utils/CliMigrationCommandRegistration", () => ({
      registerCliMigrationCommands,
    }));

    let runCli!: (argv?: string[], env?: Record<string, string | undefined>) => Promise<void>;
    jest.isolateModules(() => {
      ({ runCli } = require("../cli/eloquent") as {
        runCli: typeof runCli;
      });
    });

    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-run-cli-"));
    process.chdir(tempRoot);
    const env: Record<string, string | undefined> = {
      ELOQUENT_DEBUG: "true",
      DEBUG: "true",
    };
    const initialLog = console.log as jest.Mock;

    await runCli(["node", "cli"], env);
    await new Promise((resolve) => setImmediate(resolve));

    const instance = instances[0];
    expect(env.ELOQUENT_CLI).toBe("true");
    expect(applyCliTestConnectionOverride).toHaveBeenCalledWith(["node", "cli"], env);
    expect(instance.parse).toHaveBeenCalledWith(["node", "cli"]);
    expect(instance.outputHelp).toHaveBeenCalled();
    expect(printCliBanner).toHaveBeenCalled();
    expect(loadFactories).not.toHaveBeenCalled();
    expect(initialLog.mock.calls.flat().join(" ")).toContain("[cli] start");
    expect(initialLog.mock.calls.flat().join(" ")).toContain("[cli] before parse");
  });

  test("runCli starts factory autoload when supported and placeholder logs the fallback text", async () => {
    const loadFactories = jest.fn().mockResolvedValue(undefined);
    const applyCliTestConnectionOverride = jest.fn();
    const isCliTestArgv = jest.fn(() => true);
    const resolveCliRequestedStorageKind = jest.fn(() => "sql");
    const shouldAutoLoadFactoriesForCli = jest.fn(() => true);
    const ensureRuntime = jest.fn();
    const needsTypeScriptRuntime = jest.fn(() => false);

    class FakeCommand {
      name = jest.fn().mockReturnThis();
      description = jest.fn().mockReturnThis();
      version = jest.fn().mockReturnThis();
      parse = jest.fn();
      outputHelp = jest.fn();
    }

    jest.doMock("chalk", () => identityChalkMock);
    jest.doMock("commander", () => ({ Command: FakeCommand }));
    jest.doMock("../cli/utils/factories/FactoryLoader", () => ({
      loadFactories,
    }));
    jest.doMock("../cli/utils/CliBootstrapSupport", () => ({
      applyCliTestConnectionOverride,
      isCliTestArgv,
      resolveCliRequestedStorageKind,
      shouldAutoLoadFactoriesForCli,
    }));
    jest.doMock("../cli/utils/typescript/TypeScriptCompiler", () => ({
      TypeScriptCompiler: { ensureRuntime },
    }));
    jest.doMock("../cli/utils/typescript/RuntimeDetector", () => ({
      RuntimeDetector: { needsTypeScriptRuntime },
    }));

    let runCli!: (argv?: string[], env?: Record<string, string | undefined>) => Promise<void>;
    let placeholder!: () => Promise<void>;
    jest.isolateModules(() => {
      ({ runCli, placeholder } = require("../cli/eloquent") as {
        runCli: typeof runCli;
        placeholder: typeof placeholder;
      });
    });

    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-run-cli-factory-"));
    process.chdir(tempRoot);
    await runCli(["node", "cli", "factory:status", "--test"], {});
    await new Promise((resolve) => setImmediate(resolve));

    expect(loadFactories).toHaveBeenCalledWith(true, { storageKind: "sql" });

    console.log = jest.fn() as unknown as typeof console.log;
    await placeholder();
    expect(console.log).toHaveBeenCalledWith("This command is not yet implemented.");
  });

  test("entrypoint helpers cover default-parameter and negative branches", async () => {
    const loadFactories = jest.fn().mockRejectedValue("string-failure");
    const applyCliTestConnectionOverride = jest.fn();
    const isCliTestArgv = jest.fn(() => false);
    const resolveCliRequestedStorageKind = jest.fn(() => undefined);
    const shouldAutoLoadFactoriesForCli = jest.fn(() => true);
    const ensureRuntime = jest.fn();
    const needsTypeScriptRuntime = jest.fn(() => true);

    class FakeCommand {
      name = jest.fn().mockReturnThis();
      description = jest.fn().mockReturnThis();
      version = jest.fn().mockReturnThis();
      parse = jest.fn();
      outputHelp = jest.fn();
    }

    jest.doMock("chalk", () => identityChalkMock);
    jest.doMock("commander", () => ({ Command: FakeCommand }));
    jest.doMock("../cli/utils/factories/FactoryLoader", () => ({
      loadFactories,
    }));
    jest.doMock("../cli/utils/CliBootstrapSupport", () => ({
      applyCliTestConnectionOverride,
      isCliTestArgv,
      resolveCliRequestedStorageKind,
      shouldAutoLoadFactoriesForCli,
    }));
    jest.doMock("../cli/utils/typescript/TypeScriptCompiler", () => ({
      TypeScriptCompiler: { ensureRuntime },
    }));
    jest.doMock("../cli/utils/typescript/RuntimeDetector", () => ({
      RuntimeDetector: { needsTypeScriptRuntime },
    }));

    let installCliLogging!: (
      argv?: string[],
      env?: Record<string, string | undefined>,
      loggerConsole?: typeof console,
    ) => void;
    let initializeCliTypeScriptRuntime!: (
      argv?: string[],
      env?: Record<string, string | undefined>,
    ) => void;
    let autoLoadCliFactories!: (
      argv?: string[],
      env?: Record<string, string | undefined>,
    ) => Promise<void>;
    let runCli!: (argv?: string[], env?: Record<string, string | undefined>) => Promise<void>;

    jest.isolateModules(() => {
      ({
        installCliLogging,
        initializeCliTypeScriptRuntime,
        autoLoadCliFactories,
        runCli,
      } = require("../cli/eloquent") as {
        installCliLogging: typeof installCliLogging;
        initializeCliTypeScriptRuntime: typeof initializeCliTypeScriptRuntime;
        autoLoadCliFactories: typeof autoLoadCliFactories;
        runCli: typeof runCli;
      });
    });

    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-defaults-"));
    process.chdir(tempRoot);
    process.argv = ["node", "cli", "list"];
    process.env = { ...process.env, ELOQUENT_RUNTIME_LOG: "false" };

    const defaultLog = jest.fn();
    const defaultWarn = jest.fn();
    const defaultError = jest.fn();
    const defaultInfo = jest.fn();
    const defaultConsole = {
      log: defaultLog,
      warn: defaultWarn,
      error: defaultError,
      info: defaultInfo,
    } as unknown as typeof console;

    installCliLogging(undefined, undefined, defaultConsole);
    defaultConsole.info("default-info");
    expect(defaultInfo).toHaveBeenCalledWith("default-info");

    initializeCliTypeScriptRuntime();
    expect(ensureRuntime).toHaveBeenCalled();
    expect((console.log as jest.Mock).mock.calls.flat().join(" ")).not.toContain(
      "TypeScript runtime enabled (ts-node).",
    );

    await autoLoadCliFactories();
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("ERROR: Failed to auto-load factories during CLI startup."),
    );

    await runCli();
    expect(applyCliTestConnectionOverride).toHaveBeenCalled();
  });
});

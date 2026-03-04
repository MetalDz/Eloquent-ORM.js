import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync, type SpawnSyncReturns } from "child_process";

type CliResult = SpawnSyncReturns<string> & {
  combined: string;
  durationMs: number;
  timeoutMs: number;
};

const rootDir = process.cwd();
const cliPath = path.resolve(rootDir, "dist/cli/eloquent.js");
const hasBuiltCli = fs.existsSync(cliPath);

const appModelsDir = path.resolve(rootDir, "src/app/models");
const appControllersDir = path.resolve(rootDir, "src/app/controllers");
const appServicesDir = path.resolve(rootDir, "src/app/services");
const appFactoriesDir = path.resolve(rootDir, "src/app/database/factories");
const appSeedsDir = path.resolve(rootDir, "src/app/database/seeds");
const testModelsDir = path.resolve(rootDir, "src/test/database/models");
const testFactoriesDir = path.resolve(rootDir, "src/test/database/factories");
const testSeedsDir = path.resolve(rootDir, "src/test/database/seeds");
const testRootDir = path.resolve(rootDir, "src/test");

const appModelName = "CliGeneratorArtifact";
const testModelName = "CliGeneratorTestArtifact";

const appModelFile = path.join(appModelsDir, `${appModelName}.ts`);
const appControllerFile = path.join(appControllersDir, `${appModelName}Controller.ts`);
const appServiceFile = path.join(appServicesDir, `${appModelName}Service.ts`);
const appFactoryFile = path.join(appFactoriesDir, `${appModelName}Factory.ts`);
const appSeedFile = path.join(appSeedsDir, `${appModelName}Seeder.ts`);
const testModelFile = path.join(testModelsDir, `${testModelName}.ts`);
const testFactoryFile = path.join(testFactoriesDir, `${testModelName}Factory.ts`);
const testSeedFile = path.join(testSeedsDir, `${testModelName}Seeder.ts`);

function runCli(
  args: string[],
  timeoutMs = 180000,
  envOverrides?: NodeJS.ProcessEnv
): CliResult {
  const startedAt = Date.now();
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: rootDir,
    env: { ...process.env, ...envOverrides, FORCE_COLOR: "0" },
    encoding: "utf8",
    timeout: timeoutMs,
  });

  return {
    ...result,
    combined: `${result.stdout ?? ""}\n${result.stderr ?? ""}`,
    durationMs: Date.now() - startedAt,
    timeoutMs,
  };
}

function assertCliSuccess(result: CliResult, args:string[]): void {
  if (result.error) {
    throw result.error;
  }

  expect(result.signal).toBeNull();
  expect(result.status).toBe(0);
  expect(result.durationMs).toBeLessThan(result.timeoutMs);
}

function removeIfExists(filePath: string): void {
  if (fs.existsSync(filePath)) {
    fs.rmSync(filePath, { force: true });
  }
}

function removeGeneratorArtifacts(): void {
  [
    appModelFile,
    appControllerFile,
    appServiceFile,
    appFactoryFile,
    appSeedFile,
    testModelFile,
    testFactoryFile,
    testSeedFile,
  ].forEach(removeIfExists);
}

const describeIfBuilt = hasBuiltCli ? describe : describe.skip;

describeIfBuilt("CLI integration: generators", () => {
  let testRootBackupDir: string | null = null;

  beforeAll(() => {
    removeGeneratorArtifacts();
  });

  afterAll(() => {
    removeGeneratorArtifacts();
    removeIfExists(path.resolve(rootDir, "./cli.generators.test.sqlite"));

    if (!testRootBackupDir) return;
    if (!fs.existsSync(testRootBackupDir)) return;

    fs.rmSync(testRootDir, { recursive: true, force: true });
    fs.cpSync(testRootBackupDir, testRootDir, { recursive: true });
    fs.rmSync(path.dirname(testRootBackupDir), { recursive: true, force: true });
  });

  test("make:model app-mode creates the file and respects overwrite behavior", () => {
    const createArgs = ["make:model", appModelName];
    const createResult = runCli(createArgs);

    assertCliSuccess(createResult, createArgs);
    expect(createResult.combined).toContain("Model created");
    expect(fs.existsSync(appModelFile)).toBe(true);

    const secondResult = runCli(createArgs);
    assertCliSuccess(secondResult, createArgs);
    expect(secondResult.combined).toContain("Model already exists");

    const forceArgs = ["make:model", appModelName, "--force"];
    const forceResult = runCli(forceArgs);
    assertCliSuccess(forceResult, forceArgs);
    expect(forceResult.combined).toContain("Model created");
  });

  test("make:controller app-mode writes the soft-delete controller template", () => {
    const args = ["make:controller", appModelName, "--soft"];
    const result = runCli(args);

    assertCliSuccess(result, args);
    expect(result.combined).toContain("Controller created");
    expect(fs.existsSync(appControllerFile)).toBe(true);

    const content = fs.readFileSync(appControllerFile, "utf8");
    expect(content).toContain(`class ${appModelName}Controller`);
    expect(content).toContain("async restore(req: Request, res: Response)");
  });

  test("make:service app-mode writes the service file", () => {
    const args = ["make:service", appModelName];
    const result = runCli(args);

    assertCliSuccess(result, args);
    expect(result.combined).toContain("Service created");
    expect(fs.existsSync(appServiceFile)).toBe(true);

    const content = fs.readFileSync(appServiceFile, "utf8");
    expect(content).toContain(`class ${appModelName}Service`);
    expect(content).toContain(`../models/${appModelName}`);
  });

  test("make:seed writes requested counts in app and test mode", () => {
    const appArgs = ["make:seed", appModelName, "--count", "7"];
    const appResult = runCli(appArgs);

    assertCliSuccess(appResult, appArgs);
    expect(appResult.combined).toContain("Seeder created");
    expect(fs.existsSync(appSeedFile)).toBe(true);
    expect(fs.readFileSync(appSeedFile, "utf8")).toContain("createMany(7");

    const testModelArgs = ["make:model", testModelName, "--test", "--force"];
    const testModelResult = runCli(testModelArgs);
    assertCliSuccess(testModelResult, testModelArgs);

    const testArgs = ["make:seed", testModelName, "--count", "9", "--test"];
    const testResult = runCli(testArgs);

    assertCliSuccess(testResult, testArgs);
    expect(testResult.combined).toContain("Seeder created");
    expect(fs.existsSync(testSeedFile)).toBe(true);
    expect(fs.readFileSync(testSeedFile, "utf8")).toContain("createMany(9");
  });

  test("make:factory honors --model in app and test mode", () => {
    const appArgs = ["make:factory", "IgnoredAlias", "--model", appModelName, "--force"];
    const appResult = runCli(appArgs);

    assertCliSuccess(appResult, appArgs);
    expect(appResult.combined).toContain(`Factory generation complete for model: ${appModelName}`);
    expect(fs.existsSync(appFactoryFile)).toBe(true);
    expect(fs.readFileSync(appFactoryFile, "utf8")).toContain(`model = ${appModelName};`);

    const testArgs = [
      "make:factory",
      "IgnoredAlias",
      "--model",
      testModelName,
      "--test",
      "--force",
    ];
    const testResult = runCli(testArgs);

    assertCliSuccess(testResult, testArgs);
    expect(testResult.combined).toContain(`Factory generation complete for model: ${testModelName}`);
    expect(fs.existsSync(testFactoryFile)).toBe(true);
    expect(fs.readFileSync(testFactoryFile, "utf8")).toContain(`model = ${testModelName};`);
  });

  test("make:scenario --run executes generate + migrate + seed in test mode", () => {
    const backupRoot = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-cli-scenario-run-"));
    testRootBackupDir = path.join(backupRoot, "test");
    fs.cpSync(testRootDir, testRootBackupDir, { recursive: true });

    fs.rmSync(testRootDir, { recursive: true, force: true });
    fs.mkdirSync(testRootDir, { recursive: true });
    removeIfExists(path.resolve(rootDir, "./cli.generators.test.sqlite"));

    const args = [
      "make:scenario",
      "blog",
      "--test",
      "--controllers",
      "--services",
      "--run",
      "--force",
    ];
    const result = runCli(args, 300000, {
      DB_TEST_CONNECTION: "sqlite_test",
      SQLITE_TEST_PATH: "./cli.generators.test.sqlite",
    });

    assertCliSuccess(result, args);
    expect(result.combined).toContain("Scenario generation complete");
    expect(result.combined).toContain("All tables dropped. Re-running migrations...");
    expect(result.combined).toContain('Running migrations in TEST mode on "sqlite_test"');
    expect(result.combined).toContain("Completed: BlogScenarioSeeder");
  });
});

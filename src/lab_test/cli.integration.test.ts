import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync, type SpawnSyncReturns } from "child_process";
import dotenv from "dotenv";

dotenv.config();

type CliResult = SpawnSyncReturns<string> & {
  combined: string;
};

const rootDir = process.cwd();
const cliPath = path.resolve(rootDir, "dist/cli/eloquent.js");
const testRootDir = path.resolve(rootDir, "src/test");
const testMigrationsDir = path.resolve(rootDir, "src/test/database/migrations");
const testSeedsDir = path.resolve(rootDir, "src/test/database/seeds");
const integrationSeederClass = "CliIntegrationSeeder";
const blogScenarioSeederClass = "BlogScenarioSeeder";
const integrationSeederFile = path.resolve(
  testSeedsDir,
  `${integrationSeederClass}.ts`
);
const hasBuiltCli = fs.existsSync(cliPath);
const hasTestDbEnv = Boolean(
  process.env.DB_HOST &&
    process.env.DB_TEST_USER &&
    process.env.DB_TEST_NAME
);

const describeIfTestDbAndBuild =
  hasTestDbEnv && hasBuiltCli ? describe : describe.skip;

function runCli(args: string[], timeoutMs = 120000): CliResult {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: rootDir,
    env: { ...process.env, FORCE_COLOR: "0" },
    encoding: "utf8",
    timeout: timeoutMs,
  });

  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";

  return {
    ...result,
    combined: `${stdout}\n${stderr}`,
  };
}

function assertCliSuccess(result: CliResult, args: string[]): void {
  if (result.error) {
    const err = result.error as NodeJS.ErrnoException;
    if (err.code === "ETIMEDOUT") {
      throw new Error(
        `CLI command timed out: eloquent ${args.join(" ")}\n\n${result.combined}`
      );
    }
    throw new Error(
      `CLI command failed to spawn: eloquent ${args.join(" ")}\n${err.message}\n\n${result.combined}`
    );
  }

  expect(result.signal).toBeNull();
  expect(result.status).toBe(0);
}

describeIfTestDbAndBuild("CLI integration: migrations + seed + scenario", () => {
  let testRootBackupDir: string | null = null;

  beforeAll(() => {
    if (!fs.existsSync(testRootDir)) {
      fs.mkdirSync(testRootDir, { recursive: true });
    }

    const backupRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "eloquent-cli-test-root-")
    );
    testRootBackupDir = path.join(backupRoot, "test");
    fs.cpSync(testRootDir, testRootBackupDir, { recursive: true });

    fs.rmSync(testRootDir, { recursive: true, force: true });
    fs.mkdirSync(testRootDir, { recursive: true });

    fs.mkdirSync(testSeedsDir, { recursive: true });
    fs.writeFileSync(
      integrationSeederFile,
      `export async function ${integrationSeederClass}(): Promise<void> {
  console.log("Running seeder: ${integrationSeederClass}");
}
`,
      "utf8"
    );

    const scenarioArgs = [
      "make:scenario",
      "blog",
      "--test",
      "--controllers",
      "--services",
      "--force",
    ];
    const scenarioResult = runCli(scenarioArgs, 180000);
    assertCliSuccess(scenarioResult, scenarioArgs);
    expect(scenarioResult.combined).toContain("Scenario generation complete");
  });

  afterAll(() => {
    if (!testRootBackupDir) return;
    if (!fs.existsSync(testRootBackupDir)) return;

    fs.rmSync(testRootDir, { recursive: true, force: true });
    fs.cpSync(testRootBackupDir, testRootDir, { recursive: true });
    fs.rmSync(path.dirname(testRootBackupDir), { recursive: true, force: true });
  });

  test("make:migration --all --test exits cleanly", () => {
    const args = ["make:migration", "--all", "--test"];
    const result = runCli(args);

    assertCliSuccess(result, args);
    expect(result.combined).toContain("Migration generation complete");

    const migrationFiles = fs
      .readdirSync(testMigrationsDir)
      .filter((file) => file.endsWith(".ts") || file.endsWith(".js"));
    expect(migrationFiles.length).toBeGreaterThan(0);
  });

  test("migrate:run --test exits cleanly", () => {
    const args = ["migrate:run", "--test"];
    const result = runCli(args);

    assertCliSuccess(result, args);
    expect(result.combined).toContain("Running migrations in TEST mode");
    expect(result.combined).toMatch(
      /No new migrations to run|migration\(s\) applied successfully/i
    );
  });

  test("db:seed --test --class CliIntegrationSeeder exits cleanly", () => {
    const args = ["db:seed", "--test", "--class", integrationSeederClass];
    const result = runCli(args);

    assertCliSuccess(result, args);
    expect(result.combined).toContain(`Running: ${integrationSeederClass}`);
    expect(result.combined).toContain(`Completed: ${integrationSeederClass}`);
  });

  test("demo:scenario --test --random exits cleanly", () => {
    const seedArgs = ["db:seed", "--test", "--class", blogScenarioSeederClass];
    const seedResult = runCli(seedArgs, 180000);

    assertCliSuccess(seedResult, seedArgs);
    expect(seedResult.combined).toContain(`Running: ${blogScenarioSeederClass}`);
    expect(seedResult.combined).toContain(`Completed: ${blogScenarioSeederClass}`);

    const args = ["demo:scenario", "--test", "--random"];
    const result = runCli(args);

    assertCliSuccess(result, args);
    expect(result.combined).toContain("Scenario check: counts");
  });

  test("make:scenario media --test exits cleanly", () => {
    const args = [
      "make:scenario",
      "media",
      "--test",
      "--controllers",
      "--services",
      "--force",
    ];
    const result = runCli(args, 180000);

    assertCliSuccess(result, args);
    expect(result.combined).toContain("Scenario generation complete");
    expect(
      fs.existsSync(
        path.resolve(rootDir, "src/test/database/seeds/BlogScenarioSeeder.ts")
      )
    ).toBe(true);
  });
});

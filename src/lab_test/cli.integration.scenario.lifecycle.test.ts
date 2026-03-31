import fs from "fs";
import os from "os";
import path from "path";
import {
  assertCliSuccess,
  blogScenarioSeederClass,
  describeIfTestDbAndBuild,
  integrationSeederClass,
  integrationSeederFile,
  resetMysqlTestDatabase,
  rootDir,
  runCli,
  testMigrationsDir,
  testRootDir,
  testSeedsDir,
} from "./support/cli.integration.harness.js";

describeIfTestDbAndBuild("CLI integration: migrations + seed + scenario", () => {
  let testRootBackupDir: string | null = null;

  beforeAll(async () => {
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

    await resetMysqlTestDatabase();
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
      .readdirSync(testMigrationsDir())
      .filter((file) => file.endsWith(".ts") || file.endsWith(".js"));
    expect(migrationFiles.some((file) => file.includes("create_comments_table"))).toBe(true);
    expect(migrationFiles.some((file) => file.includes("create_users_table"))).toBe(true);
    expect(migrationFiles.some((file) => file.includes("create_posts_table"))).toBe(true);
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

  test("migrate:rollback --test --step 1 exits cleanly and migrations can be re-applied", () => {
    const rollbackArgs = ["migrate:rollback", "--test", "--step", "1"];
    const rollbackResult = runCli(rollbackArgs, 180000);

    assertCliSuccess(rollbackResult, rollbackArgs);
    expect(rollbackResult.combined).toContain("Rolling back migrations in TEST mode");
    expect(rollbackResult.combined).toMatch(/migration\(s\) rolled back successfully/i);

    const rerunArgs = ["migrate:run", "--test"];
    const rerunResult = runCli(rerunArgs, 180000);

    assertCliSuccess(rerunResult, rerunArgs);
    expect(rerunResult.combined).toContain("Running migrations in TEST mode");
    expect(rerunResult.combined).toMatch(
      /No new migrations to run|migration\(s\) applied successfully/i
    );
  });

  test("make:scenario media --test exits cleanly", () => {
    const blockedArgs = ["make:scenario", "media", "--test"];
    const blockedResult = runCli(blockedArgs, 180000);

    expect(blockedResult.status).toBe(1);
    expect(blockedResult.combined).toContain(
      'Existing test scenario "blog" is active. Re-run with --force to replace it.'
    );

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
    expect(result.combined).toContain("MediaScenarioSeeder");
    expect(result.combined).toContain("Seeder created:");
    expect(result.combined).toContain("Run `eloquent migrate:fresh --test --force` before `migrate:run`");
    expect(fs.existsSync(path.join(rootDir, "src/test/database/models/Post.ts"))).toBe(false);
    expect(fs.existsSync(path.join(rootDir, "src/test/database/factories/PostFactory.ts"))).toBe(
      false
    );
    expect(fs.existsSync(path.join(rootDir, "src/test/database/seeds/BlogScenarioSeeder.ts"))).toBe(
      false
    );
    expect(fs.existsSync(path.join(rootDir, "src/test/database/models/Photo.ts"))).toBe(true);
    expect(fs.existsSync(path.join(rootDir, "src/test/database/models/Video.ts"))).toBe(true);

    const migrationFiles = fs
      .readdirSync(testMigrationsDir())
      .filter((file) => file.endsWith(".ts") || file.endsWith(".js"));
    expect(migrationFiles.some((file) => file.includes("create_photos_table"))).toBe(true);
    expect(migrationFiles.some((file) => file.includes("create_videos_table"))).toBe(true);
    expect(migrationFiles.some((file) => file.includes("create_posts_table"))).toBe(false);
    expect(migrationFiles.some((file) => file.includes("create_post_user_pivot_table"))).toBe(
      false
    );
  });

  test("make:scenario without --test is blocked in production", () => {
    const args = ["make:scenario", "media"];
    const result = runCli(args, 120000, undefined, { APP_ENV: "production" });

    expect(result.status).toBe(1);
    expect(result.combined).toContain("make:scenario is restricted to --test in production.");
  });
});



const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const repoRoot = path.resolve(__dirname, "..");
const npmCmd = "npm";
const nodeCmd = "node";

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd || repoRoot,
    env: options.env || process.env,
    encoding: "utf8",
    shell: process.platform === "win32" ? true : options.shell || false,
  });

  if (result.error) {
    throw result.error;
  }

  return {
    code: result.status ?? 0,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    combined: `${result.stdout || ""}${result.stderr || ""}`.trim(),
  };
}

function assertSuccess(step, result) {
  if (result.code !== 0) {
    throw new Error(`[${step}] failed with exit code ${result.code}\n${result.combined}`);
  }
}

function assertContains(step, text, expected) {
  if (!text.includes(expected)) {
    throw new Error(`[${step}] expected output to contain "${expected}"\n${text}`);
  }
}

function resolveTarballName(packOutput) {
  const line = packOutput
    .split(/\r?\n/)
    .map((value) => value.trim())
    .map((value) => {
      const match = value.match(/([A-Za-z0-9._-]+\.tgz)$/);
      return match ? match[1] : "";
    })
    .filter(Boolean)
    .pop();

  if (!line) {
    throw new Error(`Could not determine tarball name from npm pack output:\n${packOutput}`);
  }

  return line;
}

function runCli(sampleDir, args, env) {
  const binPath =
    process.platform === "win32"
      ? path.join(sampleDir, "node_modules", ".bin", "eloquent.cmd")
      : path.join(sampleDir, "node_modules", ".bin", "eloquent");

  if (process.platform === "win32") {
    return run(binPath, args, { cwd: sampleDir, env, shell: true });
  }

  return run(binPath, args, { cwd: sampleDir, env });
}

let tarballPath = "";
let sampleDir = "";

try {
  const packed = run(npmCmd, ["pack"], { cwd: repoRoot });
  assertSuccess("npm pack", packed);

  const tarballName = resolveTarballName(`${packed.stdout}\n${packed.stderr}`);
  tarballPath = path.join(repoRoot, tarballName);
  sampleDir = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-pack-smoke-"));
  const localTarballPath = path.join(sampleDir, tarballName);
  fs.copyFileSync(tarballPath, localTarballPath);

  assertSuccess("npm init", run(npmCmd, ["init", "-y"], { cwd: sampleDir }));
  assertSuccess("npm install tarball", run(npmCmd, ["install", `./${tarballName}`], { cwd: sampleDir }));

  const env = {
    ...process.env,
    DB_TEST_CONNECTION: "sqlite_test",
    SQLITE_TEST_PATH: path.join(sampleDir, "data.test.sqlite"),
  };

  const importCheckPath = path.join(sampleDir, "smoke-import-check.cjs");
  fs.writeFileSync(
    importCheckPath,
    'const pkg = require("eloquentjs");\nconsole.log(Object.keys(pkg).sort().join(","));\n',
    "utf8"
  );
  const imports = run(nodeCmd, [importCheckPath], { cwd: sampleDir, env });
  assertSuccess("package import", imports);
  assertContains("package import", imports.combined, "SqlModel");
  assertContains("package import", imports.combined, "Factory");

  const listResult = runCli(sampleDir, ["list"], env);
  assertSuccess("eloquent list", listResult);
  assertContains("eloquent list", listResult.combined, "Available Commands");

  const scenarioResult = runCli(sampleDir, ["make:scenario", "blog", "--test", "--force"], env);
  assertSuccess("make:scenario", scenarioResult);
  assertContains("make:scenario", scenarioResult.combined, "Scenario generation complete");

  const makeMigrationResult = runCli(sampleDir, ["make:migration", "--all", "--test"], env);
  assertSuccess("make:migration", makeMigrationResult);
  assertContains("make:migration", makeMigrationResult.combined, "Migration generation complete");

  const migrateRunResult = runCli(sampleDir, ["migrate:run", "--test"], env);
  assertSuccess("migrate:run", migrateRunResult);
  if (
    !migrateRunResult.combined.includes("migration(s) applied successfully") &&
    !migrateRunResult.combined.includes("No new migrations to run")
  ) {
    throw new Error(`[migrate:run] unexpected output\n${migrateRunResult.combined}`);
  }

  const seedResult = runCli(sampleDir, ["db:seed", "--test", "--class", "BlogScenarioSeeder"], env);
  assertSuccess("db:seed", seedResult);
  assertContains("db:seed", seedResult.combined, "Completed: BlogScenarioSeeder");

  const demoResult = runCli(sampleDir, ["demo:scenario", "--test", "--random"], env);
  assertSuccess("demo:scenario", demoResult);
  assertContains("demo:scenario", demoResult.combined, "favorite posts: 2");

  console.log("Tarball smoke passed.");
} catch (error) {
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(String(error));
  }

  if (sampleDir) {
    console.error(`Smoke app kept at: ${sampleDir}`);
  }

  process.exit(1);
} finally {
  if (sampleDir && fs.existsSync(sampleDir)) {
    fs.rmSync(sampleDir, { recursive: true, force: true });
  }

  if (tarballPath && fs.existsSync(tarballPath)) {
    fs.rmSync(tarballPath, { force: true });
  }
}

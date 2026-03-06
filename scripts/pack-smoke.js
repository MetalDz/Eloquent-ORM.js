const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const repoRoot = path.resolve(__dirname, "..");
const nodeCmd = process.execPath;
const npmCliPath =
  process.env.npm_execpath ||
  path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js");
const expectedPublicExports = [
  "BaseModel",
  "CacheManager",
  "CoreModel",
  "Factory",
  "MongoModel",
  "MorphRegistry",
  "PivotHelperMixin",
  "SchemaBuilder",
  "SchemaValidator",
  "SqlModel",
  "column",
  "isModelRegistered",
  "isModelRegistryStrictMode",
  "mixin",
  "registerModels",
  "relation",
  "setModelRegistryStrictMode",
  "setupCache",
  "validate",
  "validateSchema",
].sort();

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd || repoRoot,
    env: options.env || process.env,
    encoding: "utf8",
    shell: options.shell || false,
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

function runNpm(args, options = {}) {
  return run(nodeCmd, [npmCliPath, ...args], options);
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

function assertOneOf(step, text, options) {
  if (!options.some((value) => text.includes(value))) {
    throw new Error(`[${step}] expected one of ${options.join(" | ")}\n${text}`);
  }
}

function assertFileExists(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Expected file to exist: ${filePath}`);
  }
}

function assertFileContains(filePath, expected) {
  assertFileExists(filePath);
  const content = fs.readFileSync(filePath, "utf8");
  if (!content.includes(expected)) {
    throw new Error(`Expected file ${filePath} to contain:\n${expected}\n\nActual:\n${content}`);
  }
}

function sanitizePathSegment(segment) {
  return String(segment).replace(/[^A-Za-z0-9_-]/g, "_");
}

function testMigrationsDir(sample) {
  return path.join(
    sample.dir,
    "src",
    "test",
    "database",
    "migrations",
    sanitizePathSegment(sample.env.DB_TEST_CONNECTION || "sqlite_test")
  );
}

function findFiles(dir, predicate) {
  if (!fs.existsSync(dir)) {
    return [];
  }

  return fs.readdirSync(dir).filter(predicate);
}

function assertNonEmptyMigration(dir, needle) {
  const matches = findFiles(dir, (file) => file.includes(needle) && file.endsWith(".ts"));
  if (matches.length === 0) {
    throw new Error(`Expected migration matching "${needle}" in ${dir}`);
  }

  for (const file of matches) {
    const filePath = path.join(dir, file);
    const content = fs.readFileSync(filePath, "utf8");
    if (content.includes("await db.query(`") && !content.includes("// (no SQL changes detected)")) {
      return filePath;
    }
  }

  throw new Error(`Expected non-empty migration matching "${needle}" in ${dir}`);
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

function listTarballEntries(tarballName) {
  const listed = run("tar", ["-tf", tarballName], { cwd: repoRoot });
  assertSuccess("tarball listing", listed);
  return listed.combined
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter(Boolean);
}

function assertTarballSurface(entries) {
  const requiredEntries = [
    "package/package.json",
    "package/README.md",
    "package/CHANGELOG.md",
    "package/dist/index.js",
    "package/dist/cli/eloquent.js",
    "package/src/cli/templates/model.tpl",
  ];

  for (const entry of requiredEntries) {
    if (!entries.includes(entry)) {
      throw new Error(`Tarball is missing required entry: ${entry}`);
    }
  }

  const forbiddenPrefixes = [
    "package/.env",
    "package/src/app/",
    "package/src/test/",
    "package/src/lab_test/",
  ];

  for (const entry of entries) {
    if (entry === ".env" || forbiddenPrefixes.some((prefix) => entry.startsWith(prefix))) {
      throw new Error(`Tarball contains forbidden entry: ${entry}`);
    }
  }
}

function runCli(sampleDir, args, env) {
  const binPath = path.join(
    sampleDir,
    "node_modules",
    ".bin",
    process.platform === "win32" ? "eloquent.cmd" : "eloquent"
  );
  const cliEntry = path.join(sampleDir, "node_modules", "eloquentjs", "dist", "cli", "eloquent.js");

  assertFileExists(binPath);
  assertFileExists(cliEntry);

  return run(nodeCmd, [cliEntry, ...args], { cwd: sampleDir, env });
}

function runNodeScript(sampleDir, fileName, content, env, step) {
  const scriptPath = path.join(sampleDir, fileName);
  fs.writeFileSync(scriptPath, content, "utf8");
  const result = run(nodeCmd, [scriptPath], { cwd: sampleDir, env });
  assertSuccess(step, result);
  return result;
}

function createSampleApp(tarballName, label) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `eloquent-pack-smoke-${label}-`));
  const localTarballPath = path.join(dir, tarballName);
  fs.copyFileSync(path.join(repoRoot, tarballName), localTarballPath);

  assertSuccess("npm init", runNpm(["init", "-y"], { cwd: dir }));
  assertSuccess("npm install tarball", runNpm(["install", `./${tarballName}`], { cwd: dir }));

  return {
    dir,
    env: {
      ...process.env,
      DB_TEST_CONNECTION: "sqlite_test",
      SQLITE_TEST_PATH: path.join(dir, "data.test.sqlite"),
    },
  };
}

function verifyPublicExports(sample) {
  const imports = runNodeScript(
    sample.dir,
    "smoke-import-check.cjs",
    'const pkg = require("eloquentjs");\nconsole.log(Object.keys(pkg).sort().join(","));\n',
    sample.env,
    "package import"
  );

  const exportLine = imports.combined
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter(Boolean)
    .pop() || "";
  const actualExports = exportLine
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .sort();

  if (JSON.stringify(actualExports) !== JSON.stringify(expectedPublicExports)) {
    throw new Error(
      `[package import] export surface mismatch\nExpected: ${expectedPublicExports.join(",")}\nActual: ${actualExports.join(",")}`
    );
  }
}

function runGeneralCliSmoke(sample) {
  const migrationsDir = testMigrationsDir(sample);

  const listResult = runCli(sample.dir, ["list"], sample.env);
  assertSuccess("eloquent list", listResult);
  assertContains("eloquent list", listResult.combined, "Available Commands");

  const cacheStatsResult = runCli(sample.dir, ["cache:stats"], sample.env);
  assertSuccess("cache:stats", cacheStatsResult);
  assertContains("cache:stats", cacheStatsResult.combined, "cache:stats");

  const cacheClearResult = runCli(sample.dir, ["cache:clear"], sample.env);
  assertSuccess("cache:clear", cacheClearResult);
  assertContains("cache:clear", cacheClearResult.combined, "cache:clear");

  const modelResult = runCli(
    sample.dir,
    ["make:model", "DemoAuto", "--test", "--with-migration", "--attrs-from-schema", "--force"],
    sample.env
  );
  assertSuccess("make:model", modelResult);
  assertContains("make:model", modelResult.combined, "Model created");

  const demoAutoModelPath = path.join(sample.dir, "src", "test", "database", "models", "DemoAuto.ts");
  assertFileContains(demoAutoModelPath, 'import { SqlModel, ModelInstance } from "eloquentjs";');
  assertFileContains(demoAutoModelPath, 'import { column, validate } from "eloquentjs";');
  assertNonEmptyMigration(migrationsDir, "_demoautos_table");

  const plainModelResult = runCli(
    sample.dir,
    ["make:model", "Demo", "--test", "--attrs-from-schema", "--force"],
    sample.env
  );
  assertSuccess("make:model Demo", plainModelResult);
  const demoModelPath = path.join(sample.dir, "src", "test", "database", "models", "Demo.ts");
  assertFileContains(demoModelPath, 'import { SqlModel, ModelInstance } from "eloquentjs";');
  assertFileContains(demoModelPath, 'import { column, validate } from "eloquentjs";');

  const directMigrationResult = runCli(sample.dir, ["make:migration", "Demo", "--test"], sample.env);
  assertSuccess("make:migration Demo", directMigrationResult);
  assertContains("make:migration Demo", directMigrationResult.combined, "Migration");
  assertNonEmptyMigration(migrationsDir, "_demos_table");

  const controllerResult = runCli(
    sample.dir,
    ["make:controller", "Demo", "--test", "--soft"],
    sample.env
  );
  assertSuccess("make:controller", controllerResult);
  assertFileExists(path.join(sample.dir, "src", "test", "controllers", "DemoController.ts"));

  const serviceResult = runCli(sample.dir, ["make:service", "Demo", "--test"], sample.env);
  assertSuccess("make:service", serviceResult);
  assertFileExists(path.join(sample.dir, "src", "test", "services", "DemoService.ts"));

  const factoryResult = runCli(sample.dir, ["make:factory", "Demo", "--test", "--force"], sample.env);
  assertSuccess("make:factory", factoryResult);
  assertFileContains(
    path.join(sample.dir, "src", "test", "database", "factories", "DemoFactory.ts"),
    'import { Factory } from "eloquentjs";'
  );

  const seedResult = runCli(sample.dir, ["make:seed", "Demo", "--test", "--count", "2"], sample.env);
  assertSuccess("make:seed", seedResult);
  assertFileExists(path.join(sample.dir, "src", "test", "database", "seeds", "DemoSeeder.ts"));

  const factoryStatusResult = runCli(
    sample.dir,
    ["factory:status", "--test", "--details", "--graph"],
    sample.env
  );
  assertSuccess("factory:status", factoryStatusResult);
  assertContains("factory:status", factoryStatusResult.combined, "DemoFactory");

  const statusBeforeRunResult = runCli(sample.dir, ["migrate:status", "--test"], sample.env);
  assertSuccess("migrate:status", statusBeforeRunResult);
  assertOneOf("migrate:status", statusBeforeRunResult.combined, ["Pending", "No migrations table found"]);

  const runTestResult = runCli(sample.dir, ["migrate:run:test", "Demo"], sample.env);
  assertSuccess("migrate:run:test", runTestResult);
  assertOneOf("migrate:run:test", runTestResult.combined, [
    "migration(s) applied successfully",
    "No new migrations to run",
  ]);

  const rollbackResult = runCli(sample.dir, ["migrate:rollback", "--test", "--step", "1"], sample.env);
  assertSuccess("migrate:rollback", rollbackResult);
  assertContains("migrate:rollback", rollbackResult.combined, "rolled back successfully");

  const rerunResult = runCli(sample.dir, ["migrate:run", "--test", "Demo"], sample.env);
  assertSuccess("migrate:run", rerunResult);
  assertOneOf("migrate:run", rerunResult.combined, [
    "migration(s) applied successfully",
    "No new migrations to run",
  ]);

  const freshResult = runCli(sample.dir, ["migrate:fresh", "--test", "--force"], sample.env);
  assertSuccess("migrate:fresh", freshResult);
  assertOneOf("migrate:fresh", freshResult.combined, [
    "migration(s) applied successfully",
    "No new migrations to run",
  ]);

  const resetResult = runCli(sample.dir, ["migrate:reset", "--test"], sample.env);
  assertSuccess("migrate:reset", resetResult);
  assertOneOf("migrate:reset", resetResult.combined, [
    "rolled back successfully",
    "No migrations found to roll back",
  ]);
}

function runBlogScenarioSmoke(sample) {
  const scenarioResult = runCli(
    sample.dir,
    ["make:scenario", "blog", "--test", "--controllers", "--services", "--force"],
    sample.env
  );
  assertSuccess("make:scenario blog", scenarioResult);
  assertContains("make:scenario blog", scenarioResult.combined, "Scenario generation complete");

  assertFileContains(
    path.join(sample.dir, "src", "test", "database", "models", "User.ts"),
    'import { SqlModel, ModelInstance } from "eloquentjs";'
  );
  assertFileContains(
    path.join(sample.dir, "src", "test", "database", "factories", "UserFactory.ts"),
    'import { Factory } from "eloquentjs";'
  );
  assertFileExists(
    path.join(sample.dir, "src", "test", "database", "factories", "UserPostPivotFactory.ts")
  );
  assertFileExists(path.join(sample.dir, "src", "test", "controllers", "UserController.ts"));
  assertFileExists(path.join(sample.dir, "src", "test", "services", "UserService.ts"));
  assertNonEmptyMigration(
    testMigrationsDir(sample),
    "_users_table"
  );

  const makeMigrationResult = runCli(sample.dir, ["make:migration", "--all", "--test"], sample.env);
  assertSuccess("make:migration --all", makeMigrationResult);
  assertContains("make:migration --all", makeMigrationResult.combined, "Migration generation complete");

  const migrationFiles = fs.readdirSync(testMigrationsDir(sample));
  if (!migrationFiles.some((file) => file.includes("post_user_pivot"))) {
    throw new Error("Expected blog scenario migrations to include post_user_pivot.");
  }

  const statusResult = runCli(sample.dir, ["migrate:status", "--test"], sample.env);
  assertSuccess("blog migrate:status", statusResult);

  const runResult = runCli(sample.dir, ["migrate:run", "--test"], sample.env);
  assertSuccess("blog migrate:run", runResult);
  assertOneOf("blog migrate:run", runResult.combined, [
    "migration(s) applied successfully",
    "No new migrations to run",
  ]);

  const factoryStatusResult = runCli(
    sample.dir,
    ["factory:status", "--test", "--details", "--graph"],
    sample.env
  );
  assertSuccess("blog factory:status", factoryStatusResult);
  assertContains("blog factory:status", factoryStatusResult.combined, "UserFactory");
  assertContains("blog factory:status", factoryStatusResult.combined, "PostFactory");
  assertContains("blog factory:status", factoryStatusResult.combined, "CommentFactory");
  assertContains("blog factory:status", factoryStatusResult.combined, "UserPostPivotFactory");

  const seedResult = runCli(
    sample.dir,
    ["db:seed", "--test", "--class", "BlogScenarioSeeder"],
    sample.env
  );
  assertSuccess("blog db:seed", seedResult);
  assertContains("blog db:seed", seedResult.combined, "Completed: BlogScenarioSeeder");

  const demoResult = runCli(sample.dir, ["demo:scenario", "--test", "--random"], sample.env);
  assertSuccess("blog demo:scenario", demoResult);
  assertContains("blog demo:scenario", demoResult.combined, "users: 5");
  assertContains("blog demo:scenario", demoResult.combined, "posts: 15");
  assertContains("blog demo:scenario", demoResult.combined, "comments: 35");
  assertContains("blog demo:scenario", demoResult.combined, "post_user_pivot: 10");
  assertContains("blog demo:scenario", demoResult.combined, "posts for user: 3");
  assertContains("blog demo:scenario", demoResult.combined, "comments on user: 1");
  assertContains("blog demo:scenario", demoResult.combined, "comments on posts: 5");
  assertContains("blog demo:scenario", demoResult.combined, "favorite posts: 2");

  const demoByUserResult = runCli(sample.dir, ["demo:scenario", "--test", "--user", "1"], sample.env);
  assertSuccess("blog demo:scenario --user", demoByUserResult);
  assertContains("blog demo:scenario --user", demoByUserResult.combined, "Scenario check: relations");

  const rollbackResult = runCli(sample.dir, ["migrate:rollback", "--test", "--step", "1"], sample.env);
  assertSuccess("blog migrate:rollback", rollbackResult);

  const rerunAllResult = runCli(
    sample.dir,
    ["migrate:run:test", "--all-migrations"],
    sample.env
  );
  assertSuccess("blog migrate:run:test --all-migrations", rerunAllResult);

  const seedFreshResult = runCli(
    sample.dir,
    ["db:seed:fresh", "--test", "--class", "BlogScenarioSeeder", "--force"],
    sample.env
  );
  assertSuccess("blog db:seed:fresh", seedFreshResult);
  assertContains("blog db:seed:fresh", seedFreshResult.combined, "Database fully refreshed and seeded");

  const demoAfterFreshResult = runCli(sample.dir, ["demo:scenario", "--test", "--random"], sample.env);
  assertSuccess("blog demo after fresh", demoAfterFreshResult);
  assertContains("blog demo after fresh", demoAfterFreshResult.combined, "favorite posts: 2");
}

function runMediaScenarioSmoke(sample) {
  const scenarioResult = runCli(
    sample.dir,
    ["make:scenario", "media", "--test", "--controllers", "--services", "--force"],
    sample.env
  );
  assertSuccess("make:scenario media", scenarioResult);
  assertContains("make:scenario media", scenarioResult.combined, "Scenario generation complete");

  assertFileContains(
    path.join(sample.dir, "src", "test", "database", "models", "Photo.ts"),
    'import { SqlModel, ModelInstance } from "eloquentjs";'
  );
  assertFileContains(
    path.join(sample.dir, "src", "test", "database", "factories", "PhotoFactory.ts"),
    'import { Factory } from "eloquentjs";'
  );
  assertFileExists(
    path.join(sample.dir, "src", "test", "database", "factories", "UserPhotoPivotFactory.ts")
  );
  assertFileExists(path.join(sample.dir, "src", "test", "controllers", "PhotoController.ts"));
  assertFileExists(path.join(sample.dir, "src", "test", "services", "PhotoService.ts"));
  assertNonEmptyMigration(
    testMigrationsDir(sample),
    "_users_table"
  );

  const makeMigrationResult = runCli(sample.dir, ["make:migration", "--all", "--test"], sample.env);
  assertSuccess("media make:migration --all", makeMigrationResult);

  const migrationFiles = fs.readdirSync(testMigrationsDir(sample));
  if (!migrationFiles.some((file) => file.includes("photo_user_pivot"))) {
    throw new Error("Expected media scenario migrations to include photo_user_pivot.");
  }

  const runResult = runCli(sample.dir, ["migrate:run", "--test"], sample.env);
  assertSuccess("media migrate:run", runResult);

  const seedResult = runCli(
    sample.dir,
    ["db:seed", "--test", "--class", "MediaScenarioSeeder"],
    sample.env
  );
  assertSuccess("media db:seed", seedResult);
  assertContains("media db:seed", seedResult.combined, "Completed: MediaScenarioSeeder");

  const factoryStatusResult = runCli(
    sample.dir,
    ["factory:status", "--test", "--details", "--graph"],
    sample.env
  );
  assertSuccess("media factory:status", factoryStatusResult);
  assertContains("media factory:status", factoryStatusResult.combined, "PhotoFactory");
  assertContains("media factory:status", factoryStatusResult.combined, "VideoFactory");
  assertContains("media factory:status", factoryStatusResult.combined, "UserPhotoPivotFactory");

  const mediaCheck = runNodeScript(
    sample.dir,
    "media-check.cjs",
    [
      'const Database = require("better-sqlite3");',
      "",
      "(() => {",
      "  const db = new Database(process.env.SQLITE_TEST_PATH);",
      "",
      "  const scalar = (sql, params = []) => {",
      "    const row = db.prepare(sql).get(...params);",
      "    return Number(row.count || 0);",
      "  };",
      "",
      '  const users = scalar("SELECT COUNT(*) AS count FROM users");',
      '  const photos = scalar("SELECT COUNT(*) AS count FROM photos");',
      '  const videos = scalar("SELECT COUNT(*) AS count FROM videos");',
      '  const comments = scalar("SELECT COUNT(*) AS count FROM comments");',
      '  const pivot = scalar("SELECT COUNT(*) AS count FROM photo_user_pivot");',
      "",
      "  if (users !== 4 || photos !== 8 || videos !== 8 || comments !== 16 || pivot !== 8) {",
      '    throw new Error(`Unexpected media counts: users=${users}, photos=${photos}, videos=${videos}, comments=${comments}, pivot=${pivot}`);',
      "  }",
      "",
      '  const user = db.prepare("SELECT id FROM users ORDER BY id LIMIT 1").get();',
      "  if (!user || typeof user.id !== 'number') throw new Error('No media user found');",
      "",
      '  const userPhotos = scalar("SELECT COUNT(*) AS count FROM photos WHERE user_id = ?", [user.id]);',
      '  const userVideos = scalar("SELECT COUNT(*) AS count FROM videos WHERE user_id = ?", [user.id]);',
      '  const userPhotoComments = scalar("SELECT COUNT(*) AS count FROM comments WHERE commentable_type = ? AND commentable_id IN (SELECT id FROM photos WHERE user_id = ?)", ["photos", user.id]);',
      '  const userVideoComments = scalar("SELECT COUNT(*) AS count FROM comments WHERE commentable_type = ? AND commentable_id IN (SELECT id FROM videos WHERE user_id = ?)", ["videos", user.id]);',
      '  const userLikes = scalar("SELECT COUNT(*) AS count FROM photo_user_pivot WHERE user_id = ?", [user.id]);',
      "",
      "  if (userPhotos !== 2 || userVideos !== 2 || userPhotoComments !== 2 || userVideoComments !== 2 || userLikes !== 2) {",
      '    throw new Error(`Unexpected media relation counts: photos=${userPhotos}, videos=${userVideos}, photoComments=${userPhotoComments}, videoComments=${userVideoComments}, likes=${userLikes}`);',
      "  }",
      "",
      '  console.log(`media-check: users=${users}, photos=${photos}, videos=${videos}, comments=${comments}, pivot=${pivot}, userPhotos=${userPhotos}, userVideos=${userVideos}, userLikes=${userLikes}`);',
      "  db.close();",
      "})();",
      "",
    ].join("\n"),
    sample.env,
    "media-check"
  );
  assertContains("media-check", mediaCheck.combined, "media-check:");
}

function runScenarioAutoSmoke(sample) {
  const scenarioResult = runCli(
    sample.dir,
    ["make:scenario", "blog", "--test", "--controllers", "--services", "--run", "--force"],
    sample.env
  );
  assertSuccess("make:scenario blog --run", scenarioResult);
  assertContains("make:scenario blog --run", scenarioResult.combined, "Scenario generation complete");
  assertContains("make:scenario blog --run", scenarioResult.combined, "Running database seeders");

  const demoResult = runCli(sample.dir, ["demo:scenario", "--test", "--random"], sample.env);
  assertSuccess("blog auto demo:scenario", demoResult);
  assertContains("blog auto demo:scenario", demoResult.combined, "users: 5");
  assertContains("blog auto demo:scenario", demoResult.combined, "posts: 15");
  assertContains("blog auto demo:scenario", demoResult.combined, "comments: 35");
  assertContains("blog auto demo:scenario", demoResult.combined, "post_user_pivot: 10");
  assertContains("blog auto demo:scenario", demoResult.combined, "favorite posts: 2");
}

let tarballPath = "";
let tarballName = "";
const sampleDirs = [];

try {
  const packed = runNpm(["pack"], { cwd: repoRoot });
  assertSuccess("npm pack", packed);

  tarballName = resolveTarballName(`${packed.stdout}\n${packed.stderr}`);
  tarballPath = path.join(repoRoot, tarballName);

  const tarballEntries = listTarballEntries(tarballName);
  assertTarballSurface(tarballEntries);

  const generalSample = createSampleApp(tarballName, "commands");
  sampleDirs.push(generalSample.dir);
  verifyPublicExports(generalSample);
  runGeneralCliSmoke(generalSample);

  const blogSample = createSampleApp(tarballName, "blog");
  sampleDirs.push(blogSample.dir);
  runBlogScenarioSmoke(blogSample);

  const mediaSample = createSampleApp(tarballName, "media");
  sampleDirs.push(mediaSample.dir);
  runMediaScenarioSmoke(mediaSample);

  const autoScenarioSample = createSampleApp(tarballName, "scenario-run");
  sampleDirs.push(autoScenarioSample.dir);
  runScenarioAutoSmoke(autoScenarioSample);

  console.log("Tarball smoke passed.");
} catch (error) {
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(String(error));
  }

  for (const dir of sampleDirs) {
    if (dir) {
      console.error(`Smoke app kept at: ${dir}`);
    }
  }

  process.exit(1);
} finally {
  for (const dir of sampleDirs) {
    if (dir && fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }

  if (tarballPath && fs.existsSync(tarballPath)) {
    fs.rmSync(tarballPath, { force: true });
  }
}

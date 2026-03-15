const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });

const repoRoot = path.resolve(__dirname, "..");
const nodeCmd = process.execPath;
const npmCacheDir = path.join(repoRoot, ".npm-pack-smoke-cache");
const npmCliPath =
  process.env.npm_execpath ||
  path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js");
const expectedPublicExports = [
  "BaseModel",
  "CacheManager",
  "CoreModel",
  "Factory",
  "Model",
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
  fs.mkdirSync(npmCacheDir, { recursive: true });
  const command = process.platform === "win32" ? "cmd.exe" : nodeCmd;
  const commandArgs =
    process.platform === "win32"
      ? ["/d", "/s", "/c", "npm.cmd", ...args]
      : [npmCliPath, ...args];
  return run(command, commandArgs, {
    ...options,
    env: {
      ...process.env,
      npm_config_cache: npmCacheDir,
      NPM_CONFIG_CACHE: npmCacheDir,
      ...(options.env || {}),
    },
  });
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

function assertNotContains(step, text, unexpected) {
  if (text.includes(unexpected)) {
    throw new Error(`[${step}] expected output to exclude "${unexpected}"\n${text}`);
  }
}

function assertOneOf(step, text, options) {
  if (!options.some((value) => text.includes(value))) {
    throw new Error(`[${step}] expected one of ${options.join(" | ")}\n${text}`);
  }
}

function factoryStatusVisibleSection(text) {
  return text.split(/\r?\nLoaded \d+ factories\./, 1)[0] || text;
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
    if (
      (content.includes("db.ensureCollection(") ||
        content.includes("db.createIndex(") ||
        content.includes("db.dropCollection(")) &&
      !content.includes("// (no Mongo changes detected)")
    ) {
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

function listTarballEntries(tarballFilePath) {
  const listed = run("tar", ["-tf", tarballFilePath], { cwd: repoRoot });
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

function runGeneratedModelRuntimeCheck(sample, options) {
  const step = options.step;
  const fileName = options.fileName;
  const modelName = options.modelName;
  const expectedName = options.expectedName;
  const filePathSegments = JSON.stringify(options.filePathSegments);

  const result = runNodeScript(
    sample.dir,
    fileName,
    [
      'const path = require("path");',
      'const runtimePath = path.join(process.cwd(), "node_modules", "eloquentjs", "dist", "cli", "utils", "typescript", "tsRuntime.js");',
      'const { loadModule } = require(runtimePath);',
      `const filePath = path.join(process.cwd(), ...${filePathSegments});`,
      `const expectedName = ${JSON.stringify(expectedName)};`,
      `const modelName = ${JSON.stringify(modelName)};`,
      "const mod = loadModule(filePath);",
      "const Model = mod[modelName];",
      "if (!Model) throw new Error(`Missing generated model export: ${modelName}`);",
      "const instance = new Model();",
      'instance.fill({ name: expectedName });',
      "const objectValue = instance.toObject();",
      "const jsonValue = JSON.parse(instance.toJSON());",
      'const instanceMethods = ["fill", "save", "patch", "toObject", "toJSON", "with"];',
      'const staticMethods = ["where", "with", "findBy", "findOneBy", "findAllBy", "existsBy"];',
      "for (const method of instanceMethods) {",
      "  if (typeof instance[method] !== 'function') {",
      "    throw new Error(`Missing instance method ${method} on ${modelName}`);",
      "  }",
      "}",
      "for (const method of staticMethods) {",
      "  if (typeof Model[method] !== 'function') {",
      "    throw new Error(`Missing static method ${method} on ${modelName}`);",
      "  }",
      "}",
      "if (objectValue.name !== expectedName || jsonValue.name !== expectedName) {",
      "  throw new Error(`Generated model serialization mismatch for ${modelName}`);",
      "}",
      'console.log(`generated-model-runtime:${modelName}:${objectValue.name}`);',
      "",
    ].join("\n"),
    {
      ...sample.env,
      ...(options.envOverrides || {}),
    },
    step
  );

  assertContains(step, result.combined, `generated-model-runtime:${modelName}:${expectedName}`);
}

function stageTarballSnapshot(sourceTarballPath) {
  const stagingDir = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-pack-smoke-tarball-"));
  const stagedTarballPath = path.join(stagingDir, path.basename(sourceTarballPath));
  fs.copyFileSync(sourceTarballPath, stagedTarballPath);
  return stagedTarballPath;
}

function createSampleApp(stagedTarballPath, label) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `eloquent-pack-smoke-${label}-`));
  const tarballName = path.basename(stagedTarballPath);
  const localTarballPath = path.join(dir, tarballName);
  fs.copyFileSync(stagedTarballPath, localTarballPath);
  const uniqueMongoTestDb = `eloquent_pack_smoke_${sanitizePathSegment(label)}_${Date.now()}_${Math.floor(
    Math.random() * 10000
  )}`;

  assertSuccess("npm init", runNpm(["init", "-y"], { cwd: dir }));
  assertSuccess("npm install tarball", runNpm(["install", `./${tarballName}`], { cwd: dir }));

  return {
    dir,
    env: {
      ...process.env,
      DB_TEST_CONNECTION: "sqlite_test",
      SQLITE_TEST_PATH: path.join(dir, "data.test.sqlite"),
      MONGO_TEST_DB: uniqueMongoTestDb,
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
  runGeneratedModelRuntimeCheck(sample, {
    step: "generated SQL model runtime",
    fileName: "generated-sql-model-runtime.cjs",
    modelName: "DemoAuto",
    expectedName: "Smoke SQL Model",
    filePathSegments: ["src", "test", "database", "models", "DemoAuto.ts"],
    envOverrides: {
      DB_CONNECTION: "mysql",
    },
  });

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

  const runTestResult = runCli(sample.dir, ["migrate:run", "--test", "Demo"], sample.env);
  assertSuccess("migrate:run --test", runTestResult);
  assertOneOf("migrate:run --test", runTestResult.combined, [
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
  runGeneratedModelRuntimeCheck(sample, {
    step: "generated scenario SQL model runtime",
    fileName: "generated-scenario-sql-model-runtime.cjs",
    modelName: "User",
    expectedName: "Scenario SQL Model",
    filePathSegments: ["src", "test", "database", "models", "User.ts"],
    envOverrides: {
      DB_CONNECTION: "mysql",
    },
  });

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
    ["migrate:run", "--test", "--all-migrations"],
    sample.env
  );
  assertSuccess("blog migrate:run --test --all-migrations", rerunAllResult);

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

function runNoSqlRuntimeSmoke(sample) {
  const mongoMigrationsDir = path.join(
    sample.dir,
    "src",
    "test",
    "database",
    "migrations",
    "mongo_test"
  );
  fs.mkdirSync(mongoMigrationsDir, { recursive: true });

  const modelMongo = runCli(
    sample.dir,
    ["make:model", "GeoLocation", "--test", "--mongo", "--with-migration", "--force"],
    sample.env
  );
  assertSuccess("nosql make:model --mongo", modelMongo);
  assertFileContains(
    path.join(sample.dir, "src", "test", "database", "models", "GeoLocation.ts"),
    'import { MongoModel, ModelInstance } from "eloquentjs";'
  );
  assertFileContains(
    path.join(sample.dir, "src", "test", "database", "models", "GeoLocation.ts"),
    'static connectionName = "mongo_test"'
  );
  const geoMigrationPath = assertNonEmptyMigration(mongoMigrationsDir, "_geolocations_table");
  assertFileContains(geoMigrationPath, "db.ensureCollection");
  runGeneratedModelRuntimeCheck(sample, {
    step: "generated Mongo model runtime",
    fileName: "generated-mongo-model-runtime.cjs",
    modelName: "GeoLocation",
    expectedName: "Smoke Mongo Model",
    filePathSegments: ["src", "test", "database", "models", "GeoLocation.ts"],
  });

  const factoryMongo = runCli(
    sample.dir,
    ["make:factory", "GeoLocation", "--test", "--force"],
    sample.env
  );
  assertSuccess("nosql make:factory --mongo model", factoryMongo);
  assertFileContains(
    path.join(sample.dir, "src", "test", "database", "factories", "GeoLocationFactory.ts"),
    'import { Factory } from "eloquentjs";'
  );

  const seedMongo = runCli(
    sample.dir,
    ["make:seed", "GeoLocation", "--test", "--count", "2"],
    sample.env
  );
  assertSuccess("nosql make:seed --mongo model", seedMongo);
  assertFileExists(
    path.join(sample.dir, "src", "test", "database", "seeds", "GeoLocationSeeder.ts")
  );

  const makeMigrationMongo = runCli(
    sample.dir,
    ["make:migration", "--all", "--test", "--mongo"],
    sample.env
  );
  assertSuccess("nosql make:migration --mongo", makeMigrationMongo);
  assertOneOf("nosql make:migration --mongo", makeMigrationMongo.combined, [
    "Migration generation complete",
    "Migration (CREATE) saved",
    "Migration unchanged",
  ]);

  const liveMongoRuntimeEnabled = process.env.ELOQUENT_PACK_SMOKE_ENABLE_MONGO_RUNTIME === "1";
  if (!liveMongoRuntimeEnabled) {
    const statusHelp = runCli(sample.dir, ["migrate:status", "--help"], sample.env);
    assertSuccess("nosql migrate:status --help", statusHelp);
    assertContains("nosql migrate:status --help", statusHelp.combined, "--mongo");
    console.log(
      "NoSQL runtime smoke skipped: set ELOQUENT_PACK_SMOKE_ENABLE_MONGO_RUNTIME=1 to enable live mongo migrate:* checks."
    );
    return;
  }

  const statusMongo = runCli(sample.dir, ["migrate:status", "--test", "--mongo"], sample.env);
  assertSuccess("nosql migrate:status --mongo", statusMongo);
  assertContains("nosql migrate:status --mongo", statusMongo.combined, "Migration Status");

  const runMongo = runCli(sample.dir, ["migrate:run", "--test", "--mongo"], sample.env);
  assertSuccess("nosql migrate:run --mongo", runMongo);
  assertOneOf("nosql migrate:run --mongo", runMongo.combined, [
    "migration(s) applied successfully",
    "No new migrations to run",
  ]);

  const rollbackMongo = runCli(
    sample.dir,
    ["migrate:rollback", "--test", "--mongo"],
    sample.env
  );
  assertSuccess("nosql migrate:rollback --mongo", rollbackMongo);
  assertOneOf("nosql migrate:rollback --mongo", rollbackMongo.combined, [
    "rolled back successfully",
    "No migrations found to roll back",
  ]);

  const freshMongo = runCli(
    sample.dir,
    ["migrate:fresh", "--test", "--mongo", "--force"],
    sample.env
  );
  assertSuccess("nosql migrate:fresh --mongo", freshMongo);
  assertOneOf("nosql migrate:fresh --mongo", freshMongo.combined, [
    "migration(s) applied successfully",
    "No new migrations to run",
  ]);

  const seedMongoRuntime = runCli(
    sample.dir,
    ["db:seed", "--test", "--mongo", "--class", "GeoLocationSeeder"],
    sample.env
  );
  assertSuccess("nosql db:seed --mongo", seedMongoRuntime);
  assertContains("nosql db:seed --mongo", seedMongoRuntime.combined, "Completed: GeoLocationSeeder");

  const factoryStatusMongo = runCli(
    sample.dir,
    ["factory:status", "--test", "--mongo", "--details"],
    sample.env
  );
  assertSuccess("nosql factory:status --mongo", factoryStatusMongo);
  const factoryStatusMongoVisible = factoryStatusVisibleSection(factoryStatusMongo.combined);
  assertContains(
    "nosql factory:status --mongo",
    factoryStatusMongoVisible,
    "GeoLocationFactory"
  );
  assertNotContains(
    "nosql factory:status --mongo",
    factoryStatusMongoVisible,
    "'UserFactory'"
  );
  assertContains(
    "nosql factory:status --mongo",
    factoryStatusMongo.combined,
    "Skipping incompatible factory for mongo: UserFactory"
  );
  assertNotContains(
    "nosql factory:status --mongo",
    factoryStatusMongoVisible,
    "UserFactory"
  );

  const demoMongo = runCli(
    sample.dir,
    ["demo:scenario", "--test", "--mongo", "--random"],
    sample.env
  );
  assertSuccess("nosql demo:scenario --mongo", demoMongo);
  assertContains(
    "nosql demo:scenario --mongo",
    demoMongo.combined,
    "No users found to demonstrate relations."
  );
  assertNotContains(
    "nosql demo:scenario --mongo",
    demoMongo.combined,
    "Mongo driver does not support SQL adapter APIs."
  );

  const mongoSeedCheck = runNodeScript(
    sample.dir,
    "mongo-seed-check.cjs",
    [
      'const { MongoClient } = require("mongodb");',
      "",
      "(async () => {",
      '  const uri = process.env.MONGO_TEST_URI || process.env.MONGO_URI;',
      '  const databaseName = process.env.MONGO_TEST_DB || process.env.MONGO_DB || "eloquentjs_db";',
      "  if (!uri) {",
      '    throw new Error("Missing MONGO_TEST_URI/MONGO_URI for mongo seed smoke.");',
      "  }",
      "",
      "  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });",
      "  try {",
      "    await client.connect();",
      "    const db = client.db(databaseName);",
      '    const count = await db.collection("geolocations").countDocuments();',
      "    if (count !== 2) {",
      '      throw new Error(`Unexpected geolocations count: ${count}`);',
      "    }",
      '    console.log(`geo-count:${count}`);',
      "  } finally {",
      "    await client.close();",
      "  }",
      "})().catch((error) => {",
      "  console.error(error instanceof Error ? error.message : String(error));",
      "  process.exit(1);",
      "});",
      "",
    ].join("\n"),
    sample.env,
    "mongo-seed-check"
  );
  assertContains("mongo-seed-check", mongoSeedCheck.combined, "geo-count:2");

  const scenarioMongo = runCli(
    sample.dir,
    ["make:scenario", "blog", "--test", "--mongo", "--controllers", "--services", "--run", "--force"],
    sample.env
  );
  assertSuccess("nosql make:scenario --mongo --run", scenarioMongo);
  assertContains(
    "nosql make:scenario --mongo --run",
    scenarioMongo.combined,
    "Scenario generation complete"
  );
  assertContains(
    "nosql make:scenario --mongo --run",
    scenarioMongo.combined,
    "Completed: BlogScenarioSeeder"
  );

  const demoMongoScenario = runCli(
    sample.dir,
    ["demo:scenario", "--test", "--mongo", "--random"],
    sample.env
  );
  assertSuccess("nosql demo:scenario blog --mongo", demoMongoScenario);
  assertContains("nosql demo:scenario blog --mongo", demoMongoScenario.combined, "users: 5");
  assertContains("nosql demo:scenario blog --mongo", demoMongoScenario.combined, "posts: 15");
  assertContains(
    "nosql demo:scenario blog --mongo",
    demoMongoScenario.combined,
    "comments: 35"
  );
  assertContains(
    "nosql demo:scenario blog --mongo",
    demoMongoScenario.combined,
    "post_user_pivot: 10"
  );
  assertContains(
    "nosql demo:scenario blog --mongo",
    demoMongoScenario.combined,
    "favorite posts: 2"
  );

  const resetMongo = runCli(sample.dir, ["migrate:reset", "--test", "--mongo"], sample.env);
  assertSuccess("nosql migrate:reset --mongo", resetMongo);
  assertOneOf("nosql migrate:reset --mongo", resetMongo.combined, [
    "rolled back successfully",
    "No migrations found to roll back",
  ]);
}

let tarballPath = "";
let tarballName = "";
let stagedTarballPath = "";
const sampleDirs = [];

try {
  const packed = runNpm(["pack"], { cwd: repoRoot });
  assertSuccess("npm pack", packed);

  tarballName = resolveTarballName(`${packed.stdout}\n${packed.stderr}`);
  tarballPath = path.join(repoRoot, tarballName);
  stagedTarballPath = stageTarballSnapshot(tarballPath);

  const tarballEntries = listTarballEntries(stagedTarballPath);
  assertTarballSurface(tarballEntries);

  const generalSample = createSampleApp(stagedTarballPath, "commands");
  sampleDirs.push(generalSample.dir);
  verifyPublicExports(generalSample);
  runGeneralCliSmoke(generalSample);

  const blogSample = createSampleApp(stagedTarballPath, "blog");
  sampleDirs.push(blogSample.dir);
  runBlogScenarioSmoke(blogSample);
  runNoSqlRuntimeSmoke(blogSample);

  const mediaSample = createSampleApp(stagedTarballPath, "media");
  sampleDirs.push(mediaSample.dir);
  runMediaScenarioSmoke(mediaSample);

  const autoScenarioSample = createSampleApp(stagedTarballPath, "scenario-run");
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

  if (stagedTarballPath) {
    const stagedTarballDir = path.dirname(stagedTarballPath);
    if (fs.existsSync(stagedTarballDir)) {
      fs.rmSync(stagedTarballDir, { recursive: true, force: true });
    }
  }

  if (fs.existsSync(npmCacheDir)) {
    fs.rmSync(npmCacheDir, { recursive: true, force: true });
  }
}

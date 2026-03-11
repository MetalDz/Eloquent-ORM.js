import fs from "fs";
import path from "path";
import { MongoClient } from "mongodb";
import {
  assertCliSuccess,
  canSpawnCli,
  cliPath,
  type CliResult,
  hasBuiltCli,
  rootDir,
} from "./support/cli.integration.harness";
import { spawnSync } from "child_process";

const hasMongoRuntimeEnv = Boolean(process.env.MONGO_TEST_URI || process.env.MONGO_URI);
const describeIfBuiltMongo = hasBuiltCli && canSpawnCli && hasMongoRuntimeEnv ? describe : describe.skip;

const modelName = "GeoLocationCliMongo";
const tableName = "geolocationclimongos";
const factoryName = `${modelName}Factory`;
const seederName = `${modelName}Seeder`;
const modelPath = path.resolve(rootDir, "src/test/database/models", `${modelName}.ts`);
const factoryPath = path.resolve(rootDir, "src/test/database/factories", `${factoryName}.ts`);
const seederPath = path.resolve(rootDir, "src/test/database/seeds", `${seederName}.ts`);

function runBuiltCli(
  args: string[],
  envOverrides?: NodeJS.ProcessEnv,
  timeoutMs = 240000
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

async function dropMongoDatabase(dbName: string): Promise<void> {
  const uri = process.env.MONGO_TEST_URI || process.env.MONGO_URI;
  if (!uri) {
    throw new Error("Missing MONGO_TEST_URI/MONGO_URI for live mongo CLI integration test.");
  }

  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
  await client.connect();
  try {
    await client.db(dbName).dropDatabase();
  } finally {
    await client.close();
  }
}

function cleanupGeneratedArtifacts(): void {
  for (const filePath of [modelPath, factoryPath, seederPath]) {
    fs.rmSync(filePath, { force: true });
  }

  const migrationsDir = path.resolve(rootDir, "src/test/database/migrations/mongo_test");
  if (!fs.existsSync(migrationsDir)) {
    return;
  }

  for (const fileName of fs.readdirSync(migrationsDir)) {
    if (fileName.includes(`_${tableName}_table`)) {
      fs.rmSync(path.join(migrationsDir, fileName), { force: true });
    }
  }
}

describeIfBuiltMongo("CLI integration: mongo targeting", () => {
  const mongoDbName = `eloquent_cli_mongo_${Date.now()}_${process.pid}`;
  const mongoEnv: NodeJS.ProcessEnv = {
    DB_TEST_CONNECTION: "mongo_test",
    MONGO_TEST_DB: mongoDbName,
    ELOQUENT_RUNTIME_LOG: "false",
  };

  beforeAll(async () => {
    cleanupGeneratedArtifacts();
    await dropMongoDatabase(mongoDbName);
  });

  afterAll(async () => {
    cleanupGeneratedArtifacts();
    await dropMongoDatabase(mongoDbName);
  });

  test("factory:status --test --mongo only exposes mongo factories in a mixed fixture set", () => {
    const makeModelArgs = ["make:model", modelName, "--test", "--mongo", "--with-migration", "--force"];
    const makeModelResult = runBuiltCli(makeModelArgs, mongoEnv);
    assertCliSuccess(makeModelResult, makeModelArgs);

    const makeFactoryArgs = ["make:factory", modelName, "--test", "--force"];
    const makeFactoryResult = runBuiltCli(makeFactoryArgs, mongoEnv);
    assertCliSuccess(makeFactoryResult, makeFactoryArgs);

    const statusArgs = ["factory:status", "--test", "--mongo", "--details"];
    const statusResult = runBuiltCli(statusArgs, mongoEnv);
    assertCliSuccess(statusResult, statusArgs);

    expect(statusResult.combined).toContain(factoryName);
    expect(statusResult.combined).not.toContain("UserFactory");
    expect(statusResult.combined).toContain("1 factories registered");
  });

  test("demo:scenario --test --mongo runs against live mongo after fresh + seed without SQL fallback", async () => {
    const makeSeedArgs = ["make:seed", modelName, "--test", "--count", "2", "--force"];
    const makeSeedResult = runBuiltCli(makeSeedArgs, mongoEnv);
    assertCliSuccess(makeSeedResult, makeSeedArgs);

    const freshArgs = ["migrate:fresh", "--test", "--mongo", "--force"];
    const freshResult = runBuiltCli(freshArgs, mongoEnv, 300000);
    assertCliSuccess(freshResult, freshArgs);

    const seedArgs = ["db:seed", "--test", "--mongo", "--class", seederName];
    const seedResult = runBuiltCli(seedArgs, mongoEnv, 300000);
    assertCliSuccess(seedResult, seedArgs);
    expect(seedResult.combined).toContain(`Completed: ${seederName}`);

    const client = new MongoClient(process.env.MONGO_TEST_URI || process.env.MONGO_URI || "", {
      serverSelectionTimeoutMS: 10000,
    });
    await client.connect();
    try {
      const count = await client.db(mongoDbName).collection(tableName).countDocuments();
      expect(count).toBe(2);
    } finally {
      await client.close();
    }

    const demoArgs = ["demo:scenario", "--test", "--mongo", "--random"];
    const demoResult = runBuiltCli(demoArgs, mongoEnv, 300000);
    assertCliSuccess(demoResult, demoArgs);
    expect(demoResult.combined).toContain("users: 0");
    expect(demoResult.combined).toContain("posts: 0");
    expect(demoResult.combined).toContain("comments: 0");
    expect(demoResult.combined).toContain("post_user_pivot: 0");
    expect(demoResult.combined).toContain("No users found to demonstrate relations.");
    expect(demoResult.combined).not.toContain(
      "Mongo driver does not support SQL adapter APIs."
    );
  });
});

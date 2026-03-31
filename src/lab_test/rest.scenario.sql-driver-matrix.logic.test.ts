import fs from "fs";
import os from "os";
import path from "path";
import type { AddressInfo, Server } from "net";
import express from "express";
import {
  assertCliSuccess,
  blogScenarioSeederClass,
  canSpawnCli,
  hasBuiltCli,
  hasPgTestEnv,
  hasTestDbEnv,
  resetMysqlTestDatabase,
  resetSqliteDatabase,
  runCli,
  testRootDir,
} from "./support/cli.integration.harness.js";
import {
  resetTestPg,
  testMysqlEnv,
  testPgEnv,
  testSqliteEnv,
} from "./support/cli.integration.connection.shared.js";
import {
  clearLoadedModuleCache,
  loadModule,
} from "../cli/utils/typescript/tsRuntime.js";

jest.setTimeout(420000);

const describeIfRunnable = hasBuiltCli && canSpawnCli ? describe : describe.skip;
const rootDir = process.cwd();
const userModelPath = path.resolve(rootDir, "src/test/database/models/User.ts");
const postModelPath = path.resolve(rootDir, "src/test/database/models/Post.ts");
const commentModelPath = path.resolve(rootDir, "src/test/database/models/Comment.ts");
const userControllerPath = path.resolve(rootDir, "src/test/controllers/UserController.ts");
const postControllerPath = path.resolve(rootDir, "src/test/controllers/PostController.ts");
const userServicePath = path.resolve(rootDir, "src/test/services/UserService.ts");
const postServicePath = path.resolve(rootDir, "src/test/services/PostService.ts");
const connectionFactoryPath = path.resolve(
  rootDir,
  "src/core/connection/ConnectionFactory.ts"
);
const databaseConnectionPath = path.resolve(
  rootDir,
  "src/core/connection/DatabaseConnection.ts"
);
const modelRegistryPath = path.resolve(
  rootDir,
  "src/core/orm/mixins/utils/ModelRegistry.ts"
);
const modelRegistrationPath = path.resolve(
  rootDir,
  "src/core/orm/mixins/utils/modelRegistration.ts"
);
const databaseConfigPath = path.resolve(rootDir, "src/config/database.ts");
const dbRoleEnvPath = path.resolve(rootDir, "src/config/dbRoleEnv.ts");
const sqliteRuntimePath = path.resolve(rootDir, "data.test.sqlite");
const baseModelPath = path.resolve(rootDir, "src/core/model/BaseModel.ts");
const coreModelPath = path.resolve(rootDir, "src/core/model/CoreModel.ts");
const hooksMixinPath = path.resolve(rootDir, "src/core/orm/mixins/HooksMixin.ts");

type DriverCase = {
  label: string;
  testConnection: "pg_test" | "mysql_test" | "sqlite_test";
  cliEnv: NodeJS.ProcessEnv;
  runtimeEnv: NodeJS.ProcessEnv;
  available: boolean;
  reset: () => Promise<void> | void;
};

const driverCases: DriverCase[] = [
  {
    label: "PostgreSQL",
    testConnection: "pg_test",
    cliEnv: testPgEnv(),
    runtimeEnv: {
      DB_CONNECTION: "pg_test",
      DB_TEST_CONNECTION: "pg_test",
    },
    available: hasPgTestEnv,
    reset: async () => {
      await resetTestPg();
    },
  },
  {
    label: "MySQL",
    testConnection: "mysql_test",
    cliEnv: testMysqlEnv(),
    runtimeEnv: {
      DB_CONNECTION: "mysql_test",
      DB_TEST_CONNECTION: "mysql_test",
    },
    available: hasTestDbEnv,
    reset: async () => {
      await resetMysqlTestDatabase();
    },
  },
  {
    label: "SQLite",
    testConnection: "sqlite_test",
    cliEnv: {
      ...testSqliteEnv(),
      SQLITE_TEST_PATH: sqliteRuntimePath,
    },
    runtimeEnv: {
      DB_CONNECTION: "sqlite_test",
      DB_TEST_CONNECTION: "sqlite_test",
      SQLITE_TEST_PATH: sqliteRuntimePath,
    },
    available: true,
    reset: async () => {
      resetSqliteDatabase(sqliteRuntimePath);
    },
  },
];

async function closeServer(server: Server | null): Promise<void> {
  if (!server) return;
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

async function startServer(app: express.Express): Promise<{ server: Server; baseUrl: string }> {
  const server = await new Promise<Server>((resolve) => {
    const instance = app.listen(0, "127.0.0.1", () => resolve(instance));
  });
  const address = server.address() as AddressInfo | null;
  if (!address) {
    throw new Error("Failed to resolve test server address.");
  }
  return {
    server,
    baseUrl: `http://127.0.0.1:${address.port}`,
  };
}

async function requestJson(
  baseUrl: string,
  method: string,
  routePath: string,
  body?: Record<string, unknown>
): Promise<{ status: number; json: unknown }> {
  const response = await fetch(`${baseUrl}${routePath}`, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  return {
    status: response.status,
    json: (await response.json()) as unknown,
  };
}

function expectStatus(
  response: { status: number; json: unknown },
  expectedStatus: number,
  context: string
): void {
  if (response.status !== expectedStatus) {
    throw new Error(
      `${context} expected ${expectedStatus} but received ${response.status}: ${JSON.stringify(
        response.json
      )}`
    );
  }
}

function clearGeneratedRestModuleCache(): void {
  for (const filePath of [
    userModelPath,
    postModelPath,
    commentModelPath,
    userControllerPath,
    postControllerPath,
    userServicePath,
    postServicePath,
    connectionFactoryPath,
    databaseConnectionPath,
    modelRegistryPath,
    modelRegistrationPath,
    databaseConfigPath,
    dbRoleEnvPath,
    baseModelPath,
    coreModelPath,
    hooksMixinPath,
  ]) {
    clearLoadedModuleCache(filePath);
  }
}

function loadRuntimeOrmUtilities() {
  const connectionFactoryModule = loadModule(connectionFactoryPath) as {
    closeAllConnections: () => Promise<void>;
  };
  const modelRegistryModule = loadModule(modelRegistryPath) as {
    ModelRegistry: {
      clear(): void;
    };
  };
  const modelRegistrationModule = loadModule(modelRegistrationPath) as {
    registerModels(
      modelCtors: Array<new (...args: never[]) => unknown>,
      options?: { strict?: boolean }
    ): void;
  };

  return {
    closeAllConnections: connectionFactoryModule.closeAllConnections,
    ModelRegistry: modelRegistryModule.ModelRegistry,
    registerModels: modelRegistrationModule.registerModels,
  };
}

function loadScenarioRuntime() {
  clearGeneratedRestModuleCache();
  const { ModelRegistry, registerModels } = loadRuntimeOrmUtilities();
  ModelRegistry.clear();

  const userModule = loadModule(userModelPath) as { User: new (...args: never[]) => unknown };
  const postModule = loadModule(postModelPath) as { Post: new (...args: never[]) => unknown };
  const commentModule = loadModule(commentModelPath) as { Comment: new (...args: never[]) => unknown };
  const userControllerModule = loadModule(userControllerPath) as {
    UserController: new () => {
      index(req: unknown, res: unknown): Promise<void>;
      show(req: unknown, res: unknown): Promise<void>;
      store(req: unknown, res: unknown): Promise<void>;
      update(req: unknown, res: unknown): Promise<void>;
      destroy(req: unknown, res: unknown): Promise<void>;
    };
  };
  const postControllerModule = loadModule(postControllerPath) as {
    PostController: new () => {
      index(req: unknown, res: unknown): Promise<void>;
      show(req: unknown, res: unknown): Promise<void>;
      store(req: unknown, res: unknown): Promise<void>;
      update(req: unknown, res: unknown): Promise<void>;
      destroy(req: unknown, res: unknown): Promise<void>;
    };
  };

  const { User } = userModule;
  const { Post } = postModule;
  const { Comment } = commentModule;
  const { UserController } = userControllerModule;
  const { PostController } = postControllerModule;

  registerModels([User, Post, Comment] as Array<new (...args: never[]) => unknown>, {
    strict: false,
  });

  return {
    UserController,
    PostController,
  };
}

function buildRestApp() {
  const { UserController, PostController } = loadScenarioRuntime();
  const userController = new UserController();
  const postController = new PostController();
  const app = express();

  app.use(express.json());

  app.get("/users", userController.index.bind(userController));
  app.get("/users/:id", userController.show.bind(userController));
  app.post("/users", userController.store.bind(userController));
  app.put("/users/:id", userController.update.bind(userController));
  app.delete("/users/:id", userController.destroy.bind(userController));

  app.get("/posts", postController.index.bind(postController));
  app.get("/posts/:id", postController.show.bind(postController));
  app.post("/posts", postController.store.bind(postController));
  app.put("/posts/:id", postController.update.bind(postController));
  app.delete("/posts/:id", postController.destroy.bind(postController));

  return app;
}

function prepareScenarioArtifacts(driver: DriverCase): void {
  const sharedEnv = {
    ...driver.cliEnv,
    DB_CONNECTION: driver.testConnection,
  };

  const scenarioArgs = [
    "make:scenario",
    "blog",
    "--test",
    "--controllers",
    "--services",
    "--force",
  ];
  const scenarioResult = runCli(scenarioArgs, 180000, undefined, sharedEnv);
  assertCliSuccess(scenarioResult, scenarioArgs);

  const migrationArgs = ["make:migration", "--all", "--test"];
  const migrationResult = runCli(migrationArgs, 180000, undefined, sharedEnv);
  assertCliSuccess(migrationResult, migrationArgs);

  expect(fs.existsSync(userControllerPath)).toBe(true);
  expect(fs.existsSync(postControllerPath)).toBe(true);
}

async function prepareDriverRuntime(driver: DriverCase): Promise<void> {
  await driver.reset();

  const migrateArgs = ["migrate:run", "--test"];
  const migrateResult = runCli(migrateArgs, 240000, undefined, driver.cliEnv);
  assertCliSuccess(migrateResult, migrateArgs);

  const seedArgs = ["db:seed", "--test", "--class", blogScenarioSeederClass];
  const seedResult = runCli(seedArgs, 240000, undefined, driver.cliEnv);
  assertCliSuccess(seedResult, seedArgs);
}

async function exerciseDriverRestMatrix(driver: DriverCase): Promise<void> {
  const previousEnv = {
    DB_CONNECTION: process.env.DB_CONNECTION,
    DB_TEST_CONNECTION: process.env.DB_TEST_CONNECTION,
    SQLITE_TEST_PATH: process.env.SQLITE_TEST_PATH,
  };
  let server: Server | null = null;

  process.env.DB_CONNECTION = driver.runtimeEnv.DB_CONNECTION;
  process.env.DB_TEST_CONNECTION = driver.runtimeEnv.DB_TEST_CONNECTION;
  if (driver.runtimeEnv.SQLITE_TEST_PATH) {
    process.env.SQLITE_TEST_PATH = driver.runtimeEnv.SQLITE_TEST_PATH;
  }

  try {
    if (driver.testConnection === "sqlite_test") {
      const databaseModule = loadModule(databaseConfigPath) as {
        dbConfig: {
          connections: {
            sqlite_test?: { sqlitePath?: string };
          };
        };
      };
      if (databaseModule.dbConfig.connections.sqlite_test) {
        databaseModule.dbConfig.connections.sqlite_test.sqlitePath = sqliteRuntimePath;
      }
    }

    const app = buildRestApp();
    const started = await startServer(app);
    server = started.server;

    const usersIndex = await requestJson(started.baseUrl, "GET", "/users");
    expectStatus(usersIndex, 200, `${driver.label} GET /users`);
    expect(Array.isArray(usersIndex.json)).toBe(true);
    expect((usersIndex.json as unknown[]).length).toBeGreaterThan(0);

    const createdUserResponse = await requestJson(started.baseUrl, "POST", "/users", {
      name: `${driver.label} Rest User`,
    });
    expectStatus(createdUserResponse, 201, `${driver.label} POST /users`);
    const usersAfterCreate = await requestJson(started.baseUrl, "GET", "/users");
    expectStatus(usersAfterCreate, 200, `${driver.label} GET /users after create`);
    const createdUserCandidate = (
      usersAfterCreate.json as Array<{ id?: number | string; name?: string }>
    ).find((item) => item.name === `${driver.label} Rest User`);
    expect(createdUserCandidate).toBeDefined();
    expect(createdUserCandidate?.id).toBeDefined();
    const createdUser = createdUserCandidate as { id: number | string; name?: string };

    const createdUserId = String(createdUser?.id);

    const showUser = await requestJson(started.baseUrl, "GET", `/users/${createdUserId}`);
    expectStatus(showUser, 200, `${driver.label} GET /users/:id`);
    expect((showUser.json as { id?: number | string }).id).toEqual(createdUser.id);

    const updateUser = await requestJson(started.baseUrl, "PUT", `/users/${createdUserId}`, {
      name: `${driver.label} Rest User Updated`,
    });
    expectStatus(updateUser, 200, `${driver.label} PUT /users/:id`);
    expect(updateUser.json).toEqual({ message: "User updated successfully" });

    const showUpdatedUser = await requestJson(started.baseUrl, "GET", `/users/${createdUserId}`);
    expectStatus(showUpdatedUser, 200, `${driver.label} GET /users/:id after update`);
    expect((showUpdatedUser.json as { name?: string }).name).toBe(
      `${driver.label} Rest User Updated`
    );

    const createdPostResponse = await requestJson(started.baseUrl, "POST", "/posts", {
      name: `${driver.label} Rest Post`,
      user_id: Number(createdUser?.id),
    });
    expectStatus(createdPostResponse, 201, `${driver.label} POST /posts`);
    const postsAfterCreate = await requestJson(started.baseUrl, "GET", "/posts");
    expectStatus(postsAfterCreate, 200, `${driver.label} GET /posts after create`);
    const createdPostCandidate = (
      postsAfterCreate.json as Array<{ id?: number | string; name?: string }>
    ).find((item) => item.name === `${driver.label} Rest Post`);
    expect(createdPostCandidate).toBeDefined();
    expect(createdPostCandidate?.id).toBeDefined();
    const createdPost = createdPostCandidate as { id: number | string; name?: string };

    const createdPostId = String(createdPost?.id);

    const postsIndex = postsAfterCreate;
    expect(Array.isArray(postsIndex.json)).toBe(true);
    expect(
      (postsIndex.json as Array<{ id?: number | string }>).some(
        (item) => String(item.id) === createdPostId
      )
    ).toBe(true);

    const updatePost = await requestJson(started.baseUrl, "PUT", `/posts/${createdPostId}`, {
      name: `${driver.label} Rest Post Updated`,
      user_id: Number(createdUser?.id),
    });
    expectStatus(updatePost, 200, `${driver.label} PUT /posts/:id`);
    expect(updatePost.json).toEqual({ message: "Post updated successfully" });

    const showUpdatedPost = await requestJson(started.baseUrl, "GET", `/posts/${createdPostId}`);
    expectStatus(showUpdatedPost, 200, `${driver.label} GET /posts/:id after update`);
    expect((showUpdatedPost.json as { name?: string }).name).toBe(
      `${driver.label} Rest Post Updated`
    );

    const deletePost = await requestJson(started.baseUrl, "DELETE", `/posts/${createdPostId}`);
    expectStatus(deletePost, 200, `${driver.label} DELETE /posts/:id`);
    expect(deletePost.json).toEqual({ message: "Post deleted successfully" });

    const missingPost = await requestJson(started.baseUrl, "GET", `/posts/${createdPostId}`);
    expectStatus(missingPost, 404, `${driver.label} GET /posts/:id after delete`);
    expect(missingPost.json).toEqual({ message: "Post not found" });
  } finally {
    const { closeAllConnections, ModelRegistry } = loadRuntimeOrmUtilities();
    await closeServer(server);
    await closeAllConnections();
    ModelRegistry.clear();
    if (previousEnv.DB_CONNECTION === undefined) {
      delete process.env.DB_CONNECTION;
    } else {
      process.env.DB_CONNECTION = previousEnv.DB_CONNECTION;
    }
    if (previousEnv.DB_TEST_CONNECTION === undefined) {
      delete process.env.DB_TEST_CONNECTION;
    } else {
      process.env.DB_TEST_CONNECTION = previousEnv.DB_TEST_CONNECTION;
    }
    if (previousEnv.SQLITE_TEST_PATH === undefined) {
      delete process.env.SQLITE_TEST_PATH;
    } else {
      process.env.SQLITE_TEST_PATH = previousEnv.SQLITE_TEST_PATH;
    }
  }
}

describeIfRunnable("Real REST scenario matrix for generated test artifacts", () => {
  let testRootBackupDir: string | null = null;

  beforeAll(() => {
    if (!fs.existsSync(testRootDir)) {
      fs.mkdirSync(testRootDir, { recursive: true });
    }

    const backupRoot = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-rest-scenario-test-root-"));
    testRootBackupDir = path.join(backupRoot, "test");
    fs.cpSync(testRootDir, testRootBackupDir, { recursive: true });

    fs.rmSync(testRootDir, { recursive: true, force: true });
    fs.mkdirSync(testRootDir, { recursive: true });
  });

  afterAll(async () => {
    const { closeAllConnections, ModelRegistry } = loadRuntimeOrmUtilities();
    await closeAllConnections();
    ModelRegistry.clear();

    if (!testRootBackupDir) return;
    if (!fs.existsSync(testRootBackupDir)) return;

    fs.rmSync(testRootDir, { recursive: true, force: true });
    fs.cpSync(testRootBackupDir, testRootDir, { recursive: true });
    fs.rmSync(path.dirname(testRootBackupDir), { recursive: true, force: true });
  });

  for (const driver of driverCases) {
    const runner = driver.available ? test : test.skip;
    runner(
      `${driver.label} real-time REST scenario generates artifacts, migrates, seeds, and serves CRUD routes`,
      async () => {
        prepareScenarioArtifacts(driver);
        await prepareDriverRuntime(driver);
        await exerciseDriverRestMatrix(driver);
      }
    );
  }
});

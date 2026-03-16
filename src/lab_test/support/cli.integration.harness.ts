import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync, type SpawnSyncReturns } from "child_process";
import dotenv from "dotenv";
import mysql from "mysql2/promise";
import { Client as PgClient } from "pg";

dotenv.config();
jest.setTimeout(120000);

export type CliResult = SpawnSyncReturns<string> & {
  combined: string;
  durationMs: number;
  timeoutMs: number;
};

export const rootDir = process.cwd();
export const cliPath = path.resolve(rootDir, "dist/cli/eloquent.js");
const spawnProbe = spawnSync(process.execPath, ["-v"], { encoding: "utf8" });
export const appRootDir = path.resolve(rootDir, "src/app");
export const testRootDir = path.resolve(rootDir, "src/test");
export const testSeedsDir = path.resolve(rootDir, "src/test/database/seeds");
export const integrationSeederClass = "CliIntegrationSeeder";
export const blogScenarioSeederClass = "BlogScenarioSeeder";
export const integrationSeederFile = path.resolve(
  testSeedsDir,
  `${integrationSeederClass}.ts`
);
export const hasBuiltCli = fs.existsSync(cliPath);
export const canSpawnCli = !(spawnProbe as SpawnSyncReturns<string> | undefined)?.error;
export const appModelsDir = path.resolve(rootDir, "src/app/models");
export const appSeedsDir = path.resolve(rootDir, "src/app/database/seeds");
export const appFactoriesDir = path.resolve(rootDir, "src/app/database/factories");
export const hasAppModels = true;
export const hasTestDbEnv = Boolean(
  process.env.DB_HOST &&
    process.env.DB_TEST_USER &&
    process.env.DB_TEST_NAME
);
export const hasAppMysqlEnv = Boolean(
  process.env.DB_HOST &&
    process.env.DB_USER &&
    process.env.DB_NAME
);
export const hasPgTestEnv = Boolean(
  process.env.PG_TEST_HOST || process.env.PG_HOST
);
export const hasPgAppEnv = Boolean(
  process.env.PG_HOST &&
    process.env.PG_USER &&
    (process.env.PG_NAME || process.env.PG_DB_NAME)
);

export const describeIfTestDbAndBuild =
  hasTestDbEnv && hasBuiltCli && canSpawnCli ? describe : describe.skip;

export function sanitizePathSegment(segment: string): string {
  return segment.replace(/[^A-Za-z0-9_-]/g, "_");
}

export function currentTestConnectionName(): string {
  return process.env.DB_TEST_CONNECTION || "mysql_test";
}

export function testMigrationsDir(): string {
  return path.resolve(
    rootDir,
    "src/test/database/migrations",
    sanitizePathSegment(currentTestConnectionName())
  );
}

export function connectionMigrationsDir(
  isTest: boolean,
  connectionName: string
): string {
  return path.resolve(
    rootDir,
    isTest ? "src/test/database/migrations" : "src/app/database/migrations",
    sanitizePathSegment(connectionName)
  );
}

export function runCli(
  args: string[],
  timeoutMs = 120000,
  input?: string,
  envOverrides?: NodeJS.ProcessEnv
): CliResult {
  const startedAt = Date.now();
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: rootDir,
    env: { ...process.env, ...envOverrides, FORCE_COLOR: "0" },
    encoding: "utf8",
    timeout: timeoutMs,
    input,
  });

  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";

  return {
    ...result,
    combined: `${stdout}\n${stderr}`,
    durationMs: Date.now() - startedAt,
    timeoutMs,
  };
}

export function assertCliSuccess(result: CliResult, args: string[]): void {
  if (result.error) {
    const err = result.error as NodeJS.ErrnoException;
    if (err.code === "ETIMEDOUT") {
      throw new Error(
        `CLI command timed out after ${result.timeoutMs}ms: eloquent ${args.join(
          " "
        )}\n\n${result.combined}`
      );
    }
    throw new Error(
      `CLI command failed to spawn after ${result.durationMs}ms: eloquent ${args.join(
        " "
      )}\n${err.message}\n\n${result.combined}`
    );
  }

  if (result.signal !== null || result.status !== 0) {
    throw new Error(
      `CLI command exited non-zero after ${result.durationMs}ms: eloquent ${args.join(
        " "
      )}\n` +
        `status=${String(result.status)} signal=${String(result.signal)}\n\n` +
        `${result.combined}`
    );
  }
  expect(result.durationMs).toBeLessThan(result.timeoutMs);
}

export function assertSafeIdentifier(value: string, label: string): void {
  if (!/^[A-Za-z0-9_]+$/.test(value)) {
    throw new Error(`Unsafe ${label}: ${value}`);
  }
}

export async function resetMysqlTestDatabase(): Promise<void> {
  const host = process.env.DB_TEST_HOST || process.env.DB_HOST || "localhost";
  const user = process.env.DB_TEST_USER || process.env.DB_USER || "root";
  const password = process.env.DB_TEST_PASSWORD || process.env.DB_PASSWORD || "";
  const database = process.env.DB_TEST_NAME || "db_test";
  const port = Number(process.env.DB_TEST_PORT || 3306);

  assertSafeIdentifier(database, "database name");

  const connection = await mysql.createConnection({
    host,
    user,
    password,
    port,
    multipleStatements: false,
  });

  try {
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\``);
    await connection.query(`USE \`${database}\``);
    await connection.query("SET FOREIGN_KEY_CHECKS = 0");
    const [rows] = await connection.query("SHOW TABLES");
    const tableRows = rows as Record<string, string>[];

    for (const row of tableRows) {
      const tableName = Object.values(row)[0];
      assertSafeIdentifier(tableName, "table name");
      await connection.query(`DROP TABLE IF EXISTS \`${tableName}\``);
    }

    await connection.query("SET FOREIGN_KEY_CHECKS = 1");
  } finally {
    await connection.end();
  }
}

export async function resetMysqlDatabase(
  database: string,
  options: {
    host: string;
    user: string;
    password: string;
    port: number;
  }
): Promise<void> {
  assertSafeIdentifier(database, "database name");

  const connection = await mysql.createConnection({
    host: options.host,
    user: options.user,
    password: options.password,
    port: options.port,
    multipleStatements: false,
  });

  try {
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\``);
    await connection.query(`USE \`${database}\``);
    await connection.query("SET FOREIGN_KEY_CHECKS = 0");
    const [rows] = await connection.query("SHOW TABLES");
    const tableRows = rows as Record<string, string>[];

    for (const row of tableRows) {
      const tableName = Object.values(row)[0];
      assertSafeIdentifier(tableName, "table name");
      await connection.query(`DROP TABLE IF EXISTS \`${tableName}\``);
    }

    await connection.query("SET FOREIGN_KEY_CHECKS = 1");
  } finally {
    await connection.end();
  }
}

export async function resetPgDatabase(
  database: string,
  options: {
    host: string;
    user: string;
    password: string;
    port: number;
  }
): Promise<void> {
  assertSafeIdentifier(database, "database name");

  const adminDb =
    database === "postgres" ? "template1" : "postgres";
  const client = new PgClient({
    host: options.host,
    user: options.user,
    password: options.password,
    port: options.port,
    database: adminDb,
  });

  await client.connect();

  try {
    await client.query(`CREATE DATABASE "${database}"`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/already exists/i.test(message)) {
      throw error;
    }
  } finally {
    await client.end();
  }

  const dbClient = new PgClient({
    host: options.host,
    user: options.user,
    password: options.password,
    port: options.port,
    database,
  });

  await dbClient.connect();
  try {
    await dbClient.query("DROP SCHEMA IF EXISTS public CASCADE;");
    await dbClient.query("CREATE SCHEMA public;");
  } finally {
    await dbClient.end();
  }
}

export function resetSqliteDatabase(filePath: string): void {
  const resolved = path.resolve(rootDir, filePath);
  if (fs.existsSync(resolved)) {
    fs.rmSync(resolved, { force: true });
  }
}

export function ensureDir(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true });
}

export function writeFixture(filePath: string, content: string): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, "utf8");
}

export function bootstrapAppFixtures(): void {
  writeFixture(
    path.join(appModelsDir, "User.ts"),
    `import { SqlModel, ModelInstance } from "../../core/model/BaseModel";
import { column, validate } from "../../core/schema/SchemaBlueprint";

type UserAttrs = {
  id?: number | null;
  name?: string | null;
  created_at?: string | Date | null;
  updated_at?: string | Date | null;
};

export class User extends SqlModel<UserAttrs> {
  static tableName = "users";
  static connectionName = process.env.DB_CONNECTION ?? "mysql";
  static morphAlias = "users";

  static schema = {
    id: column("increments", undefined, { primary: true }),
    name: validate(column("string", 255), { required: true, min: 3 }),
    created_at: column("timestamp"),
    updated_at: column("timestamp"),
    posts: {
      kind: "relation",
      relation: "hasMany",
      model: "Post",
      options: { foreignKey: "user_id" },
    },
    favorites: {
      kind: "relation",
      relation: "belongsToMany",
      model: "Post",
      options: {},
    },
    comments: {
      kind: "relation",
      relation: "morphMany",
      model: "Comment",
      options: { morphName: "commentable" },
    },
  };

  constructor() {
    super("users", process.env.DB_CONNECTION ?? "mysql");
  }
}

export interface User extends ModelInstance<UserAttrs> {}
`
  );

  writeFixture(
    path.join(appModelsDir, "Post.ts"),
    `import { SqlModel, ModelInstance } from "../../core/model/BaseModel";
import { column, validate } from "../../core/schema/SchemaBlueprint";

type PostAttrs = {
  id?: number | null;
  name?: string | null;
  user_id?: number | null;
  created_at?: string | Date | null;
  updated_at?: string | Date | null;
};

export class Post extends SqlModel<PostAttrs> {
  static tableName = "posts";
  static connectionName = process.env.DB_CONNECTION ?? "mysql";
  static morphAlias = "posts";

  static schema = {
    id: column("increments", undefined, { primary: true }),
    name: validate(column("string", 255), { required: true, min: 3 }),
    user_id: column("int", undefined, { notNull: true }),
    created_at: column("timestamp"),
    updated_at: column("timestamp"),
    author: {
      kind: "relation",
      relation: "belongsTo",
      model: "User",
      options: { foreignKey: "user_id" },
    },
    favoritedBy: {
      kind: "relation",
      relation: "belongsToMany",
      model: "User",
      options: {},
    },
    comments: {
      kind: "relation",
      relation: "morphMany",
      model: "Comment",
      options: { morphName: "commentable" },
    },
  };

  constructor() {
    super("posts", process.env.DB_CONNECTION ?? "mysql");
  }
}

export interface Post extends ModelInstance<PostAttrs> {}
`
  );

  writeFixture(
    path.join(appModelsDir, "Comment.ts"),
    `import { SqlModel, ModelInstance } from "../../core/model/BaseModel";
import { column, validate } from "../../core/schema/SchemaBlueprint";

type CommentAttrs = {
  id?: number | null;
  name?: string | null;
  commentable_id?: number | null;
  commentable_type?: string | null;
  created_at?: string | Date | null;
  updated_at?: string | Date | null;
};

export class Comment extends SqlModel<CommentAttrs> {
  static tableName = "comments";
  static connectionName = process.env.DB_CONNECTION ?? "mysql";
  static morphAlias = "comments";

  static schema = {
    id: column("increments", undefined, { primary: true }),
    name: validate(column("string", 255), { required: true, min: 3 }),
    commentable_id: column("int", undefined, { notNull: true }),
    commentable_type: column("string", 255, { notNull: true }),
    created_at: column("timestamp"),
    updated_at: column("timestamp"),
    commentable: {
      kind: "relation",
      relation: "morphTo",
      model: "Commentable",
      options: { morphName: "commentable" },
    },
  };

  constructor() {
    super("comments", process.env.DB_CONNECTION ?? "mysql");
  }
}

export interface Comment extends ModelInstance<CommentAttrs> {}
`
  );

  writeFixture(
    path.join(appFactoriesDir, "UserFactory.ts"),
    `import { Factory } from "eloquent-orm.js";
import { User } from "../../models/User";

export class UserFactory extends Factory<User> {
  model = User;

  definition(): Partial<User> {
    return {
      name: this.faker.person.fullName(),
    };
  }
}
`
  );

  writeFixture(
    path.join(appFactoriesDir, "PostFactory.ts"),
    `import { Factory } from "eloquent-orm.js";
import { Post } from "../../models/Post";

export class PostFactory extends Factory<Post> {
  model = Post;

  definition(): Partial<Post> {
    return {
      name: this.faker.person.fullName(),
    };
  }
}
`
  );

  writeFixture(
    path.join(appFactoriesDir, "CommentFactory.ts"),
    `import { Factory } from "eloquent-orm.js";
import { Comment } from "../../models/Comment";

export class CommentFactory extends Factory<Comment> {
  model = Comment;

  definition(): Partial<Comment> {
    return {
      name: this.faker.person.fullName(),
    };
  }
}
`
  );

  writeFixture(
    path.join(appSeedsDir, "UserSeeder.ts"),
    `import { UserFactory } from "../factories/UserFactory";

export async function UserSeeder(): Promise<void> {
  console.log("Running seeder: UserSeeder");

  const factory = new UserFactory();
  await factory.createMany(5);

  console.log("Seeding completed for User");
}
`
  );

  writeFixture(
    path.join(appSeedsDir, "BlogScenarioSeeder.ts"),
    `import { CommentFactory } from "../factories/CommentFactory";
import { PostFactory } from "../factories/PostFactory";
import { UserFactory } from "../factories/UserFactory";

type SeedModel = {
  id: number;
  getMorphClass?: () => string;
  attach?: (
    pivotTable: string,
    foreignKey: string,
    relatedKey: string,
    foreignId: number,
    relatedIds: number[]
  ) => Promise<void>;
};

export function morphTypeOf(model: SeedModel): string {
  if (typeof model.getMorphClass === "function") {
    return model.getMorphClass();
  }

  const ctor = model.constructor as { name?: string } | undefined;
  return String(ctor?.name ?? "Model");
}

export function pickRandomIds(items: SeedModel[], count: number): number[] {
  const pool = items.map((item) => item.id).filter((id) => typeof id === "number");

  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const current = pool[i];
    pool[i] = pool[j];
    pool[j] = current;
  }

  return pool.slice(0, Math.min(count, pool.length));
}

export async function BlogScenarioSeeder(): Promise<void> {
  console.log("Running seeder: BlogScenarioSeeder");

  const userFactory = new UserFactory();
  const postFactory = new PostFactory();
  const commentFactory = new CommentFactory();

  const users = (await userFactory.createMany(5)) as SeedModel[];
  const allPosts: SeedModel[] = [];

  for (const user of users) {
    for (let i = 0; i < 3; i += 1) {
      const post = (await postFactory.create({ user_id: user.id })) as SeedModel;
      allPosts.push(post);

      for (let j = 0; j < 2; j += 1) {
        await commentFactory.create({
          commentable_id: post.id,
          commentable_type: morphTypeOf(post),
        });
      }
    }

    await commentFactory.create({
      commentable_id: user.id,
      commentable_type: morphTypeOf(user),
    });
  }

  for (const user of users) {
    const favorites = pickRandomIds(allPosts, 2);
    if (typeof user.attach === "function") {
      await user.attach("post_user_pivot", "user_id", "post_id", user.id, favorites);
    }
  }

  console.log("Seeding completed for BlogScenarioSeeder");
}
`
  );
}


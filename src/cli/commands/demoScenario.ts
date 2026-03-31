import fs from "fs";
import path from "path";
import chalk from "chalk";
import {
  closeAllConnections,
  getAdapter,
  getConnection,
  type ConnectionName,
} from "../../core/connection/ConnectionFactory.js";
import { resolveConnectionName } from "../../core/connection/resolveConnectionName.js";
import { dbConfig } from "../../config/database.js";
import { PathMap } from "../utils/PathMap.js";
import { loadModule } from "../utils/typescript/tsRuntime.js";
import type { Collection, Db, Document, Filter } from "mongodb";
import { resolveScenarioMorphAliases } from "../utils/ScenarioMorphAliasRouting.js";

type Row = Record<string, unknown>;

type DemoScenarioOptions = {
  user?: number;
  random?: boolean;
  test?: boolean;
  connectionName?: string;
};

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return 0;
}

function buildMongoIdInFilter(values: unknown[]): Filter<Document> {
  return {
    $or: [
      { id: { $in: values } },
      { _id: { $in: values } },
    ],
  } as Filter<Document>;
}

export async function demoScenario(options?: DemoScenarioOptions): Promise<void> {
  const connectionName =
    options?.connectionName ??
    resolveConnectionName(undefined, { test: !!options?.test });
  const resolvedConnectionName = connectionName as ConnectionName;
  const driver =
    dbConfig.connections[connectionName as keyof typeof dbConfig.connections]?.driver ??
    connectionName;

  try {
    if (driver === "mongo") {
      await runMongoDemoScenario(connectionName, options);
      return;
    }

    const adapter = await getAdapter(resolvedConnectionName);
    const usersTable = adapter.wrapId("users");
    const postsTable = adapter.wrapId("posts");
    const commentsTable = adapter.wrapId("comments");
    const pivotTable = adapter.wrapId("post_user_pivot");

    const usersCountRow = await adapter.queryOne<Row>(
      `SELECT COUNT(*) as count FROM ${usersTable}`
    );
    const postsCountRow = await adapter.queryOne<Row>(
      `SELECT COUNT(*) as count FROM ${postsTable}`
    );
    const commentsCountRow = await adapter.queryOne<Row>(
      `SELECT COUNT(*) as count FROM ${commentsTable}`
    );
    const pivotCountRow = await adapter.queryOne<Row>(
      `SELECT COUNT(*) as count FROM ${pivotTable}`
    );

    console.log(chalk.cyanBright("\nScenario check: counts"));
    console.log(
      chalk.gray("users:"),
      toNumber(usersCountRow?.count)
    );
    console.log(
      chalk.gray("posts:"),
      toNumber(postsCountRow?.count)
    );
    console.log(
      chalk.gray("comments:"),
      toNumber(commentsCountRow?.count)
    );
    console.log(
      chalk.gray("post_user_pivot:"),
      toNumber(pivotCountRow?.count)
    );

    let userId: number | null = null;
    if (options?.user && Number.isFinite(options.user)) {
      userId = options.user;
    } else if (options?.random) {
      const randomFn = driver === "mysql" ? "RAND()" : "RANDOM()";
      const row = await adapter.queryOne<Row>(
        `SELECT ${adapter.wrapId("id")} as id FROM ${usersTable} ORDER BY ${randomFn} LIMIT 1`
      );
      userId = typeof row?.id === "number" ? row.id : null;
    }

    const user = userId
      ? await adapter.queryOne<Row>(
          `SELECT * FROM ${usersTable} WHERE ${adapter.wrapId("id")} = ${adapter.placeholder(1)} LIMIT 1`,
          [userId]
        )
      : await adapter.queryOne<Row>(
          `SELECT * FROM ${usersTable} ORDER BY ${adapter.wrapId("id")} LIMIT 1`
        );
    if (!user || typeof user.id !== "number") {
      console.log(chalk.yellow("\nNo users found to demonstrate relations."));
      return;
    }

    console.log(chalk.cyanBright("\nScenario check: relations"));
    console.log(chalk.gray("user:"), user);

    const posts = await adapter.query<Row>(
      `SELECT * FROM ${postsTable} WHERE ${adapter.wrapId("user_id")} = ${adapter.placeholder(1)} LIMIT 3`,
      [user.id]
    );
    console.log(chalk.gray("posts for user:"), posts.length);

    const { userMorph, postMorph } = resolveScenarioMorphAliases({
      isTest: !!options?.test,
      connectionName,
    });

    const userComments = await adapter.query<Row>(
      `SELECT * FROM ${commentsTable} WHERE ${adapter.wrapId("commentable_id")} = ${adapter.placeholder(1)} AND ${adapter.wrapId("commentable_type")} = ${adapter.placeholder(2)} LIMIT 3`,
      [user.id, userMorph]
    );
    console.log(chalk.gray("comments on user:"), userComments.length);

    const postIds = posts
      .map((p) => p.id)
      .filter((id) => typeof id === "number") as number[];
    if (postIds.length > 0) {
      const inResult = adapter.inClause(adapter.wrapId("commentable_id"), postIds, 1);
      const typePlaceholder = adapter.placeholder(inResult.nextIndex);
      const postComments = await adapter.query<Row>(
        `SELECT * FROM ${commentsTable} WHERE ${inResult.sql} AND ${adapter.wrapId("commentable_type")} = ${typePlaceholder} LIMIT 5`,
        [...inResult.params, postMorph]
      );
      console.log(chalk.gray("comments on posts:"), postComments.length);
    } else {
      console.log(chalk.gray("comments on posts:"), 0);
    }

    const favorites = await adapter.query<Row>(
      `SELECT ${postsTable}.* FROM ${postsTable}
       JOIN ${pivotTable} ON ${pivotTable}.${adapter.wrapId("post_id")} = ${postsTable}.${adapter.wrapId("id")}
       WHERE ${pivotTable}.${adapter.wrapId("user_id")} = ${adapter.placeholder(1)}
       LIMIT 5`,
      [user.id]
    );
    console.log(chalk.gray("favorite posts:"), favorites.length);
  } catch (err) {
    console.error(chalk.red("Demo scenario failed."));
    if (err instanceof Error) console.error(chalk.red(err.message));
  } finally {
    await closeAllConnections();
    if (process.env.ELOQUENT_CLI === "true") {
      setImmediate(() => process.exit(0));
    }
  }
}

async function runMongoDemoScenario(
  connectionName: string,
  options?: Pick<DemoScenarioOptions, "user" | "random" | "test">
): Promise<void> {
  const db = (await getConnection(connectionName as never)) as Db;
  const { userMorph, postMorph } = resolveScenarioMorphAliases({
    isTest: !!options?.test,
    connectionName,
  });

  const usersCollection = db.collection("users");
  const postsCollection = db.collection("posts");
  const commentsCollection = db.collection("comments");
  const pivotCollection = db.collection("post_user_pivot");

  const [usersCount, postsCount, commentsCount, pivotCount] = await Promise.all([
    usersCollection.countDocuments({}),
    postsCollection.countDocuments({}),
    commentsCollection.countDocuments({}),
    pivotCollection.countDocuments({}),
  ]);

  console.log(chalk.cyanBright("\nScenario check: counts"));
  console.log(chalk.gray("users:"), usersCount);
  console.log(chalk.gray("posts:"), postsCount);
  console.log(chalk.gray("comments:"), commentsCount);
  console.log(chalk.gray("post_user_pivot:"), pivotCount);

  let user: Document | null = null;
  if (options?.user && Number.isFinite(options.user)) {
    user = await usersCollection.findOne({ id: options.user } as Filter<Document>);
  } else if (options?.random) {
    user = await pickRandomMongoUser(usersCollection);
  } else {
    user = await usersCollection.findOne({});
  }

  if (!user) {
    console.log(chalk.yellow("\nNo users found to demonstrate relations."));
    return;
  }

  const userId = user.id ?? user._id;
  console.log(chalk.cyanBright("\nScenario check: relations"));
  console.log(chalk.gray("user:"), user);

  const posts = await postsCollection
    .find({ user_id: userId } as Filter<Document>)
    .limit(3)
    .toArray();
  console.log(chalk.gray("posts for user:"), posts.length);

  const userComments = await commentsCollection.countDocuments({
    commentable_id: userId,
    commentable_type: userMorph,
  } as Filter<Document>);
  console.log(chalk.gray("comments on user:"), userComments);

  const postIds = posts
    .map((post) => post.id ?? post._id)
    .filter((id) => id !== undefined);
  if (postIds.length > 0) {
    const postComments = await commentsCollection.countDocuments({
      commentable_id: { $in: postIds },
      commentable_type: postMorph,
    } as Filter<Document>);
    console.log(chalk.gray("comments on posts:"), postComments);
  } else {
    console.log(chalk.gray("comments on posts:"), 0);
  }

  const favoriteLinks = await pivotCollection
    .find({ user_id: userId } as Filter<Document>)
    .limit(20)
    .toArray();
  const favoritePostIds = favoriteLinks
    .map((entry) => entry.post_id ?? entry.postId)
    .filter((id) => id !== undefined);
  const favoritesCount =
    favoritePostIds.length > 0
      ? await postsCollection.countDocuments(buildMongoIdInFilter(favoritePostIds))
      : 0;
  console.log(chalk.gray("favorite posts:"), favoritesCount);
}

async function pickRandomMongoUser(
  collection: Collection<Document>
): Promise<Document | null> {
  const sampled = await collection.aggregate([{ $sample: { size: 1 } }]).toArray();
  return sampled[0] ?? null;
}

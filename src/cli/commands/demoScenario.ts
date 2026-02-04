import chalk from "chalk";
import { getAdapter } from "../../core/connection/ConnectionFactory";
import { closeAllConnections } from "../../core/connection/ConnectionFactory";
import { resolveConnectionName } from "../../core/connection/resolveConnectionName";
import { dbConfig } from "../../config/database";

type Row = Record<string, unknown>;

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return 0;
}

export async function demoScenario(options?: {
  user?: number;
  random?: boolean;
  test?: boolean;
}): Promise<void> {
  const connectionName = resolveConnectionName(undefined, { test: !!options?.test });
  const driver =
    dbConfig.connections[connectionName as keyof typeof dbConfig.connections]?.driver ??
    connectionName;

  try {
    const adapter = await getAdapter(connectionName);
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
      const randomFn = driver === "pg" ? "RANDOM()" : "RAND()";
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

    // Lazy-load models to avoid CLI compile errors when app folder is missing.
    let userMorph = "users";
    let postMorph = "posts";
    try {
      if (options?.test) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { User } = require("../../test/database/models/User");
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { Post } = require("../../test/database/models/Post");
        if (User?.getMorphClass) userMorph = User.getMorphClass();
        if (Post?.getMorphClass) postMorph = Post.getMorphClass();
      } else {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { User } = require("../../app/models/User");
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { Post } = require("../../app/models/Post");
        if (User?.getMorphClass) userMorph = User.getMorphClass();
        if (Post?.getMorphClass) postMorph = Post.getMorphClass();
      }
    } catch {
      // keep defaults
    }

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

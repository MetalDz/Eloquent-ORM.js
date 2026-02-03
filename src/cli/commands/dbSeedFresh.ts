import chalk from "chalk";
import { migrateFresh } from "./migrateFresh";
import { dbSeed } from "./dbSeed";
import { closeAllConnections } from "../../core/connection/ConnectionFactory";

/**
 * 🧩 db:seed:fresh
 * Drops all tables, re-runs migrations, and executes seeders.
 */
export async function dbSeedFresh(
  options?: { test?: boolean; class?: string }
): Promise<void> {
  console.log(chalk.cyanBright("\n🧬 Running db:seed:fresh\n"));

  try {
    // Step 1️⃣ — Drop and recreate schema
    console.log(chalk.yellow("🧱 Rebuilding database..."));

    // ✅ Handle migrateFresh gracefully: only pass param if accepted
    if (typeof migrateFresh === "function" && migrateFresh.length > 0) {
      await (migrateFresh as (opts: { test?: boolean }) => Promise<void>)({
        test: !!options?.test,
      });
    } else {
      await migrateFresh(); // if it's a no-arg function
    }

    // Step 2️⃣ — Run seeders
    console.log(chalk.greenBright("\n🌱 Running seeders...\n"));

    await dbSeed({
      test: !!options?.test,
      ...(options?.class ? { class: options.class } : {}),
    });

    console.log(chalk.greenBright("\n✅ Database fully refreshed and seeded!\n"));
  } catch (err) {
    console.error(chalk.red("❌ db:seed:fresh failed."));
    if (err instanceof Error) console.error(chalk.red(err.message));
  } finally {
    await closeAllConnections();
    console.log(chalk.gray("🔒 All database connections closed.\n"));
    if (process.env.ELOQUENT_CLI === "true") {
      setImmediate(() => process.exit(0));
    }
  }
}

import chalk from "chalk";
import { migrateRollback } from "./migrateRollback";

/**
 * 🧩 migrate:reset
 * Rolls back *all* migrations completely (every batch).
 */
export async function migrateReset(options?: { test?: boolean }): Promise<void> {
  console.log(
    chalk.cyan(
      `\n↩️  Resetting ${options?.test ? "test" : "development"} database (all batches)...\n`
    )
  );
  await migrateRollback("mysql", {
    test: !!options?.test,
    step: Number.MAX_SAFE_INTEGER,
  });
}

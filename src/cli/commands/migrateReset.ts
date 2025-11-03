import chalk from "chalk";
import { migrateRollback } from "./migrateRollback";

/**
 * 🧩 migrate:reset
 * Rolls back *all* migrations completely (every batch).
 */
export async function migrateReset(): Promise<void> {
  console.log(chalk.cyan("\n↩️  Resetting database (all batches)...\n"));
  await migrateRollback("mysql", { step: Number.MAX_SAFE_INTEGER });
}

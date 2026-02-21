import chalk from "chalk";
import readline from "readline";
import { migrateRun } from "./migrateRun";
import {
  getConnection,
  ConnectionName,
} from "../../core/connection/ConnectionFactory";
import { resolveConnectionName } from "../../core/connection/resolveConnectionName";
import { dbConfig } from "../../config/database";

/**
 * 🧩 migrate:fresh
 * Drops all tables and re-runs every migration from scratch — with confirmation.
 */
export async function migrateFresh(options?: { test?: boolean }): Promise<void> {
  const connectionName = resolveConnectionName(undefined, { test: !!options?.test });

  // ⚠️ Safety confirmation
  const confirmed = await confirmDangerousAction();
  if (!confirmed) {
    console.log(chalk.yellow("\n🛑 Operation cancelled by user.\n"));
    return;
  }

  const db = await getConnection(connectionName);
  console.log(chalk.gray(`🔌 Connected to ${connectionName}.`));

  try {
    const driver = dbConfig.connections[connectionName]?.driver;
    if (driver === "pg") {
      await db.query?.(`
        DO $$ DECLARE r RECORD;
        BEGIN
          FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname='public') LOOP
            EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
          END LOOP;
        END $$;
      `);
    } else if (driver === "sqlite") {
      const tables = (await db.query?.(
        "SELECT name FROM sqlite_master WHERE type='table';"
      )) as [Array<{ name: string }>, unknown[]];

      for (const table of tables?.[0] ?? []) {
        await db.query?.(`DROP TABLE IF EXISTS ${table.name};`);
      }
    } else if (driver === "mysql") {
      await db.query?.("SET FOREIGN_KEY_CHECKS = 0;");
      const tables = (await db.query?.("SHOW TABLES;")) as [Record<string, string>[], unknown[]];
      const tableList = tables?.[0] ?? [];

      for (const row of tableList) {
        const tableName = Object.values(row)[0];
        await db.query?.(`DROP TABLE IF EXISTS \`${tableName}\`;`);
      }
      await db.query?.("SET FOREIGN_KEY_CHECKS = 1;");
    }

    console.log(chalk.yellow("🧨 All tables dropped. Re-running migrations..."));
  } catch (err) {
    console.error(chalk.red("❌ Error while dropping tables:"));
    console.error(err);
  }

  await migrateRun(!!options?.test);
}

/**
 * 🧠 Ask user for confirmation before destructive actions
 */
async function confirmDangerousAction(): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    console.log(chalk.redBright("\n⚠️  WARNING: This will drop **ALL** tables in your database."));
    console.log(chalk.gray("   This action cannot be undone."));

    rl.question(chalk.yellow("\nDo you wish to continue? [y/N] "), (answer) => {
      rl.close();
      const normalized = answer.trim().toLowerCase();
      resolve(normalized === "y" || normalized === "yes");
    });
  });
}
// -----------------------------------------------------------------------------

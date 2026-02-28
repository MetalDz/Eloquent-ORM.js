import fs from "fs";
import chalk from "chalk";
import { getAdapter, closeAllConnections } from "../../core/connection/ConnectionFactory";
import { PathMap } from "../utils/PathMap";
import { resolveConnectionName } from "../../core/connection/resolveConnectionName";

export async function migrateStatus(isTest = false): Promise<void> {
  const migrationsDir = PathMap.migrations(isTest);
  const connectionName = resolveConnectionName(undefined, { test: isTest });

  const db = await getAdapter(connectionName);
  console.log(chalk.gray(`Connected to ${connectionName}.`));

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".ts") || f.endsWith(".js"))
    .sort();

  type MigrationRow = { name: string; batch: number; run_at: string };
  let applied: MigrationRow[] = [];

  try {
    applied = await db.query<MigrationRow>(
      "SELECT name, batch, run_at FROM migrations ORDER BY batch, id"
    );
  } catch {
    console.log(chalk.yellow("No migrations table found."));
  }

  const appliedNames = applied.map((row) => row.name);

  console.log(chalk.cyan("\nMigration Status:\n"));
  console.table(
    files.map((file) => ({
      Migration: file,
      Status: appliedNames.includes(file) ? "Applied" : "Pending",
      Batch: applied.find((row) => row.name === file)?.batch ?? "-",
      RunAt: applied.find((row) => row.name === file)?.run_at ?? "-",
    }))
  );

  await closeAllConnections();
}

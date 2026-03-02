import fs from "fs";
import path from "path";
import chalk from "chalk";
import { getAdapter, closeAllConnections } from "../../core/connection/ConnectionFactory";
import { PathMap } from "../utils/PathMap";
import { dbConfig } from "../../config/database";
import { resolveConnectionName } from "../../core/connection/resolveConnectionName";
import {
  acquireMigrationLock,
  ensureMigrationTables,
  readLastBatch,
  recordAppliedMigration,
  releaseMigrationLock,
  validateMigrationHistory,
  computeMigrationChecksum,
} from "../utils/migrations/MigrationTracker";
import { loadModule } from "../utils/typescript/tsRuntime";

export async function migrateRun(
  isTest: boolean = false,
  modelName?: string,
  dryRun: boolean = false,
  exitOnFinish: boolean = true
): Promise<void> {
  const exitCli = (): void => {
    if (exitOnFinish && process.env.ELOQUENT_CLI === "true") {
      setImmediate(() => process.exit(0));
    }
  };

  if (process.env.ELOQUENT_DEBUG === "true") {
    console.log("[migrate:run] start", { isTest, modelName, dryRun });
  }

  console.log(
    chalk.cyan(
      `\nRunning migrations in ${isTest ? "TEST" : "DEVELOPMENT"} mode${
        modelName ? ` for model "${modelName}"` : ""
      }...\n`
    )
  );

  const connectionName = resolveConnectionName(undefined, { test: isTest });
  const migrationsDir = PathMap.migrations(isTest, connectionName);
  if (!fs.existsSync(migrationsDir)) {
    console.log(chalk.yellow(`No migrations directory found for ${connectionName}.`));
    exitCli();
    return;
  }
  if (process.env.ELOQUENT_DEBUG === "true") {
    console.log("[migrate:run] connectionName", connectionName);
  }

  const driver = dbConfig.connections[connectionName]?.driver;
  if (!driver || !["mysql", "pg", "sqlite"].includes(driver)) {
    console.warn(chalk.yellow(`Skipping migrations: "${connectionName}" is not SQL-based.`));
    exitCli();
    return;
  }

  if (process.env.ELOQUENT_DEBUG === "true") {
    console.log("[migrate:run] before getAdapter");
  }
  const db = await getAdapter(connectionName);
  if (process.env.ELOQUENT_DEBUG === "true") {
    console.log("[migrate:run] after getAdapter");
  }
  console.log(chalk.gray(`Connected to ${connectionName}.`));
  const lockOwner = `migrate:run:${process.pid}:${Date.now()}`;

  const runQuery = async (sql: string, params: unknown[] = []): Promise<void> => {
    if (!sql || sql.trim() === "") return;
    if (dryRun) {
      console.log(chalk.gray(`[DRY-RUN] Would execute:\n${sql}\n`));
      return;
    }
    await db.execute(sql, params);
  };
  await ensureMigrationTables(db);
  if (!dryRun) {
    await acquireMigrationLock(db, lockOwner);
  }

  try {
    let files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".ts") || f.endsWith(".js"))
      .sort();

    if (modelName) {
      const lower = modelName.toLowerCase();
      files = files.filter((f) => f.includes(lower));
      if (files.length === 0) {
        console.log(chalk.yellow(`No migrations found for model: ${modelName}`));
        return;
      }
    }

    const appliedRows = await validateMigrationHistory(db, migrationsDir);
    const executed = appliedRows.map((row) => row.name);

    const pending = files.filter((f) => !executed.includes(f));
    if (pending.length === 0) {
      console.log(chalk.yellow("\nNo new migrations to run."));
      return;
    }

    console.log(chalk.gray(`Pending migrations: ${pending.length}`));

    const lastBatch = await readLastBatch(db);
    const newBatch = lastBatch + 1;
    let applied = 0;

    for (const file of pending) {
      const filePath = path.join(migrationsDir, file);
      const migrationModule = loadModule(path.resolve(filePath)) as {
        up?: (db: { query(sql: string, params?: unknown[]): Promise<void> }) => Promise<void>;
      };

      if (typeof migrationModule.up !== "function") {
        console.log(chalk.red(`Invalid migration: ${file}`));
        continue;
      }

      const fileContent = fs.readFileSync(filePath, "utf8");
      const isEmpty =
        !fileContent.includes("await db.query(") ||
        fileContent.match(/await db\.query\(`[^`]*`\);/g)?.length === 0;

      if (isEmpty) {
        console.log(chalk.gray(`Skipping empty migration: ${file}`));
        continue;
      }

      console.log(chalk.gray(`Applying: ${file}`));
      await migrationModule.up({ query: runQuery });

      if (!dryRun) {
        await recordAppliedMigration(
          db,
          file,
          newBatch,
          computeMigrationChecksum(filePath)
        );
      }

      console.log(chalk.green(`Migration applied: ${file}`));
      applied++;
    }

    console.log(chalk.greenBright(`\n${applied} migration(s) applied successfully.`));
  } catch (err) {
    console.error(chalk.red("\nError during migration execution:"));
    console.error(err);
    console.warn(chalk.yellow("Rolling back partial changes..."));
  } finally {
    if (!dryRun) {
      await releaseMigrationLock(db, lockOwner);
    }
    await closeAllConnections();
    console.log(chalk.gray("\nAll database connections closed.\n"));
    exitCli();
  }
}

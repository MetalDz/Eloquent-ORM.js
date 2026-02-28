import fs from "fs";
import path from "path";
import chalk from "chalk";
import { getAdapter, closeAllConnections } from "../../core/connection/ConnectionFactory";
import { PathMap } from "../utils/PathMap";
import { dbConfig } from "../../config/database";
import { resolveConnectionName } from "../../core/connection/resolveConnectionName";

export async function migrateRun(
  isTest: boolean = false,
  modelName?: string,
  dryRun: boolean = false
): Promise<void> {
  const exitCli = (): void => {
    if (process.env.ELOQUENT_CLI === "true") {
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

  const migrationsDir = PathMap.migrations(isTest);
  if (!fs.existsSync(migrationsDir)) {
    console.log(chalk.yellow("No migrations directory found."));
    exitCli();
    return;
  }

  const connectionName = resolveConnectionName(undefined, { test: isTest });
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

  const runQuery = async (sql: string, params: unknown[] = []): Promise<void> => {
    if (!sql || sql.trim() === "") return;
    if (dryRun) {
      console.log(chalk.gray(`[DRY-RUN] Would execute:\n${sql}\n`));
      return;
    }
    await db.execute(sql, params);
  };

  const trackerSQL =
    driver === "pg"
      ? `
        CREATE TABLE IF NOT EXISTS migrations (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          batch INT DEFAULT 1,
          run_at TIMESTAMP DEFAULT NOW()
        );`
      : driver === "sqlite"
      ? `
        CREATE TABLE IF NOT EXISTS migrations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name VARCHAR(255) NOT NULL,
          batch INT DEFAULT 1,
          run_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );`
      : `
        CREATE TABLE IF NOT EXISTS migrations (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          batch INT DEFAULT 1,
          run_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );`;
  await runQuery(trackerSQL);

  let files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".ts") || f.endsWith(".js"))
    .sort();

  if (modelName) {
    const lower = modelName.toLowerCase();
    files = files.filter((f) => f.includes(lower));
    if (files.length === 0) {
      console.log(chalk.yellow(`No migrations found for model: ${modelName}`));
      await closeAllConnections();
      exitCli();
      return;
    }
  }

  let executed: string[] = [];
  try {
    const rows = await db.query<{ name: string }>("SELECT name FROM migrations");
    executed = rows.map((row) => row.name);
  } catch {
    executed = [];
  }

  const pending = files.filter((f) => !executed.includes(f));
  if (pending.length === 0) {
    console.log(chalk.yellow("\nNo new migrations to run."));
    await closeAllConnections();
    exitCli();
    return;
  }

  console.log(chalk.gray(`Pending migrations: ${pending.length}`));

  let lastBatch = 0;
  try {
    const rows = await db.query<{ max: number | string | null }>(
      "SELECT MAX(batch) as max FROM migrations"
    );
    const max = rows[0]?.max;
    if (max !== null && max !== undefined) {
      lastBatch = Number(max);
    }
  } catch {
    lastBatch = 0;
  }
  const newBatch = lastBatch + 1;

  let applied = 0;

  try {
    for (const file of pending) {
      const filePath = path.join(migrationsDir, file);
      const migrationModule = (await import(path.resolve(filePath))) as {
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
        const insertSql = `INSERT INTO migrations (name, batch) VALUES (${db.placeholder(
          1
        )}, ${db.placeholder(2)});`;
        await runQuery(insertSql, [file, newBatch]);
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
    await closeAllConnections();
    console.log(chalk.gray("\nAll database connections closed.\n"));
    exitCli();
  }
}

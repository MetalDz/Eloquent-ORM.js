import fs from "fs";
import path from "path";
import chalk from "chalk";
import {  getConnection, closeAllConnections, ConnectionName } from "../../core/connection/ConnectionFactory";

/**
 * 🧱 migrate:run
 * Executes all pending migrations with strict local typing.
 */
export async function migrateRun(): Promise<void> {
  console.log(chalk.cyan("\n⚙️  Running migrations...\n"));

  // ✅ Step 1: Resolve migrations directory
  const migrationsDir = path.resolve("src/test/database/migrations");
  if (!fs.existsSync(migrationsDir)) {
    console.log(chalk.yellow("⚠️  No migrations directory found."));
    return;
  }

  // ✅ Step 2: Choose and validate connection name (type-safe)
  const envConnection = process.env.DB_CONNECTION;
  const connectionName: ConnectionName =
    envConnection === "mysql" ||
    envConnection === "pg" ||
    envConnection === "sqlite" ||
    envConnection === "mongo"
      ? envConnection
      : "mysql";

  // ✅ Step 3: Connect to database
  const db = await getConnection(connectionName);

  // ✅ Step 4: Define minimal schema typing
  interface SchemaBuilder {
    hasTable(name: string): Promise<boolean>;
    createTable(
      name: string,
      callback: (table: Record<string, unknown>) => void
    ): Promise<void>;
  }

  interface MigrationRecord {
    name: string;
  }

  if (!("schema" in db)) {
    console.error(chalk.red(`❌ The current connection does not support schema building.`));
    return;
  }

  const schema = db.schema as SchemaBuilder;

  // ✅ Step 5: Ensure "migrations" table exists
  const hasTable = await schema.hasTable("migrations");
  if (!hasTable) {
    await schema.createTable("migrations", (table) => {
      const t = table as Record<string, unknown>;
      Object.assign(t, {
        id: "increments primary key",
        name: "string",
        run_at: "timestamp default now()",
      });
    });
    console.log(chalk.gray("📦 Created 'migrations' tracking table."));
  }

  // ✅ Step 6: Load all migration files
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".ts") || f.endsWith(".js"))
    .sort();

  if (files.length === 0) {
    console.log(chalk.yellow("⚠️  No migration files found."));
    return;
  }

  // ✅ Step 7: Fetch executed migrations
  const executedRows = (await db("migrations").select("name")) as MigrationRecord[];
  const executed = executedRows.map((r) => r.name);

  let newCount = 0;

  // ✅ Step 8: Execute pending migrations
  for (const file of files) {
    if (executed.includes(file)) {
      console.log(chalk.gray(`⏭️  Skipped: ${file}`));
      continue;
    }

    const filePath = path.join(migrationsDir, file);
    const migrationModule = (await import(path.resolve(filePath))) as {
      up?: (dbConn: typeof db) => Promise<void>;
    };

    if (!migrationModule.up) {
      console.log(chalk.red(`❌ Invalid migration: ${file} (no up() function)`));
      continue;
    }

    try {
      await migrationModule.up(db);
      await db("migrations").insert({ name: file });
      console.log(chalk.greenBright(`✅ Migrated: ${file}`));
      newCount++;
    } catch (err: unknown) {
      console.error(chalk.red(`❌ Failed on: ${file}`));
      console.error(err);
      break;
    }
  }

  // ✅ Step 9: Final summary
  if (newCount === 0) {
    console.log(chalk.yellow("\n✨ No new migrations to run."));
  } else {
    console.log(chalk.greenBright(`\n🎉 ${newCount} new migration(s) applied successfully.`));
  }

  await closeAllConnections();
  console.log(chalk.gray("\n🔒 All database connections closed.\n"));
}

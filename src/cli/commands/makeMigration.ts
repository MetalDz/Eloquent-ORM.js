// src/cli/commands/makeMigration.ts
import fs from "fs";
import path from "path";
import chalk from "chalk";
import { SchemaBuilder } from "../../core/schema/SchemaBuilder";
import { PathMap } from "../utils/PathMap";
import { resolveConnectionName } from "../../core/connection/resolveConnectionName";
import { TypeScriptCompiler } from "../utils/typescript/TypeScriptCompiler";
import { closeAllConnections } from "../../core/connection/ConnectionFactory";
import { dbConfig } from "../../config/database";

interface MigrationOptions {
  test?: boolean;
  exit?: boolean;
}

function pascalCase(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/**
 * 🧱 make:migration (v4.0)
 *
 * ✅ CREATE → only once initially
 * ✅ UPDATE → overwrites old CREATE with first UPDATE
 * ✅ Subsequent updates → replace last UPDATE file
 * ✅ Keeps only ONE active migration file per model
 * ✅ No duplicates, no confusion
 */
export async function makeMigration(
  modelName: string,
  options: MigrationOptions = {}
): Promise<void> {
  const isTest = options.test === true;

  const modelsDir = PathMap.models(isTest);
  const migrationsDir = PathMap.migrations(isTest);
  PathMap.ensureDirs();

  if (!fs.existsSync(modelsDir)) {
    console.error(chalk.red(`❌ Models folder not found: ${modelsDir}`));
    return;
  }

  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true });
  }

  console.log(chalk.gray(`📁 Models Path: ${modelsDir}`));
  console.log(chalk.gray(`📁 Migrations Path: ${migrationsDir}`));

  const modelFiles =
    modelName.toLowerCase() === "all"
      ? fs.readdirSync(modelsDir).filter((f) => f.endsWith(".ts"))
      : [`${pascalCase(modelName)}.ts`];

  if (modelFiles.length === 0) {
    console.warn(chalk.yellow("⚠️  No model files found."));
    return;
  }

  for (const [index, file] of modelFiles.entries()) {
    const modelPath = path.join(modelsDir, file);
    if (!fs.existsSync(modelPath)) {
      console.log(chalk.yellow(`⚠️  Model not found: ${modelPath}`));
      continue;
    }

    try {
      if (!TypeScriptCompiler.compile([modelPath])) {
        console.warn(chalk.yellow(`⚠️  Skipping migration due to TS error in ${file}`));
        continue;
      }

      const absModelPath = path.resolve(modelPath);
      delete require.cache[require.resolve(absModelPath)];
      const modelModule = await import(absModelPath);

      const modelClassName = path.basename(file, ".ts");
      const ModelClass = modelModule[modelClassName];
      if (!ModelClass?.schema || !ModelClass?.tableName) {
        console.log(chalk.yellow(`⚠️  No schema found in ${modelClassName} — skipping.`));
        continue;
      }

      const connectionName = resolveConnectionName(ModelClass, { test: isTest });
      console.log(chalk.gray(`🔌 Using connection: ${connectionName}`));

      // 🧠 Generate SQL
      const driver =
        (dbConfig.connections as Record<string, { driver?: string }>)[connectionName]?.driver ??
        connectionName;
      const { mainSQL, extraTables } = await SchemaBuilder.toCreateSQL(
        ModelClass.tableName,
        ModelClass.schema,
        driver,
        true,
        connectionName
      );

      if (!mainSQL || mainSQL.trim() === "") {
        console.log(chalk.gray(`🧬 No new columns or schema changes — skipping.`));
        continue;
      }

      const files = fs.readdirSync(migrationsDir);
      const createFile = files.find((f) =>
        f.includes(`create_${ModelClass.tableName}_table.ts`)
      );
      const updateFile = files.find((f) =>
        f.includes(`update_${ModelClass.tableName}_table.ts`)
      );

      // 🧹 Clean logic: only keep 1 file per model
      if (createFile) {
        fs.unlinkSync(path.join(migrationsDir, createFile));
        console.log(chalk.gray(`🧹 Removed outdated CREATE migration: ${createFile}`));
      }
      if (updateFile) {
        fs.unlinkSync(path.join(migrationsDir, updateFile));
        console.log(chalk.gray(`🧹 Removed old UPDATE migration: ${updateFile}`));
      }

      // 📅 Generate timestamp (always fresh)
      const timestampBase = new Date()
        .toISOString()
        .replace(/[-:.TZ]/g, "")
        .slice(0, 14);

      const isFirstRun = !createFile && !updateFile;
      const prefix = isFirstRun ? "create" : "update";
      const migrationFile = `${timestampBase}_${prefix}_${ModelClass.tableName}_table.ts`;
      const migrationPath = path.join(migrationsDir, migrationFile);

// 🧾 Generate file content
const safeSQL = mainSQL.replace(/`/g, "\\`");
const safeExtraTables = extraTables.map((t) => t.replace(/`/g, "\\`"));
const header = `/**
 * 🧩 Auto-generated ${prefix.toUpperCase()} migration for ${modelClassName}
 * Connection: ${connectionName}
 * Mode: ${isTest ? "TEST" : "DEVELOPMENT"}
 * Generated at ${new Date().toISOString()}
 *
 * ⚙️  Philosophy:
 * This migration is model-driven — the Model schema is the single source of truth.
 * The "up" method applies the current state of your model.
 * The "down" method does not attempt to reverse deleted columns, because
 * model-driven migrations always regenerate from the latest model definition.
 */`;

const migrationContent = `${header}
export async function up(db: { query(sql: string): Promise<void> }) {
  ${
    safeSQL.trim()
      ? `await db.query(\`${safeSQL}\`);`
      : "// (no SQL changes detected)"
  }
  ${safeExtraTables.map((sql) => `await db.query(\`${sql}\`);`).join("\n  ")}
}

export async function down(db: { query(sql: string): Promise<void> }) {
  /**
   * ⚠️  Rollbacks are not auto-generated.
   * If needed, manually reverse the migration here.
   * Example: re-add columns or drop new ones.
   * 
   * Why? Because in model-driven architecture,
   * your model class already represents the latest schema state.
   */
}`;


      fs.writeFileSync(migrationPath, migrationContent, "utf8");

      const label = prefix === "create" ? "CREATE" : "UPDATE";
      console.log(chalk.green(`🧱 Migration (${label}) saved: ${migrationPath}`));
    } catch (err) {
      console.error(chalk.red(`❌ Error processing ${file}:`));
      console.error(err instanceof Error ? err.message : err);
    }
  }

  try {
    await closeAllConnections();
    console.log(chalk.gray("🔒 All database connections closed.\n"));
  } catch {
    console.warn(chalk.yellow("⚠️ Could not close DB connections cleanly."));
  }

  console.log(
    chalk.cyanBright(
      `✅ Migration generation complete in ${isTest ? "TEST" : "DEVELOPMENT"} mode.\n`
    )
  );

  if (options.exit !== false) {
    process.exit(0);
  }
}

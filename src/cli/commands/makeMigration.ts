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
  pivotSeparate?: boolean;
}

function pascalCase(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/**
 * ًں§± make:migration (v4.0)
 *
 * âœ… CREATE â†’ only once initially
 * âœ… UPDATE â†’ overwrites old CREATE with first UPDATE
 * âœ… Subsequent updates â†’ replace last UPDATE file
 * âœ… Keeps only ONE active migration file per model
 * âœ… No duplicates, no confusion
 */
export async function makeMigration(
  modelName: string,
  options: MigrationOptions = {}
): Promise<void> {
  const isTest = options.test === true;
  const pivotSeparate = options.pivotSeparate === true || modelName.toLowerCase() === "all";

  const modelsDir = PathMap.models(isTest);
  const migrationsDir = PathMap.migrations(isTest);
  PathMap.ensureDirs();

  if (!fs.existsSync(modelsDir)) {
    console.error(chalk.red(`â‌Œ Models folder not found: ${modelsDir}`));
    return;
  }

  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true });
  }

  console.log(chalk.gray(`ًں“پ Models Path: ${modelsDir}`));
  console.log(chalk.gray(`ًں“پ Migrations Path: ${migrationsDir}`));

  const modelFiles =
    modelName.toLowerCase() === "all"
      ? fs.readdirSync(modelsDir).filter((f) => f.endsWith(".ts"))
      : [`${pascalCase(modelName)}.ts`];

  if (modelFiles.length === 0) {
    console.warn(chalk.yellow("âڑ ï¸ڈ  No model files found."));
    return;
  }

  for (const [index, file] of modelFiles.entries()) {
    const modelPath = path.join(modelsDir, file);
    if (!fs.existsSync(modelPath)) {
      console.log(chalk.yellow(`âڑ ï¸ڈ  Model not found: ${modelPath}`));
      continue;
    }

    try {
      if (!TypeScriptCompiler.compile([modelPath])) {
        console.warn(chalk.yellow(`âڑ ï¸ڈ  Skipping migration due to TS error in ${file}`));
        continue;
      }

      const absModelPath = path.resolve(modelPath);
      delete require.cache[require.resolve(absModelPath)];
      const modelModule = await import(absModelPath);

      const modelClassName = path.basename(file, ".ts");
      const ModelClass = modelModule[modelClassName];
      if (!ModelClass?.schema || !ModelClass?.tableName) {
        console.log(chalk.yellow(`âڑ ï¸ڈ  No schema found in ${modelClassName} â€” skipping.`));
        continue;
      }

      const connectionName = resolveConnectionName(ModelClass, { test: isTest });
      console.log(chalk.gray(`ًں”Œ Using connection: ${connectionName}`));

      // ًں§  Generate SQL
      const driver =
        (dbConfig.connections as Record<string, { driver?: string }>)[connectionName]?.driver ??
        connectionName;
      const { mainSQL, extraTables, rollbackMainSQL, rollbackExtraTables } = await SchemaBuilder.toCreateSQL(
        ModelClass.tableName,
        ModelClass.schema,
        driver,
        true,
        connectionName
      );

      if ((!mainSQL || mainSQL.trim() === "") && extraTables.length === 0) {
        console.log(chalk.gray(`ℹ️ No new columns or schema changes — skipping.`));
        continue;
      }

      const files = fs.readdirSync(migrationsDir);
      const createFile = files.find((f) =>
        f.includes(`create_${ModelClass.tableName}_table.ts`)
      );
      const updateFile = files.find((f) =>
        f.includes(`update_${ModelClass.tableName}_table.ts`)
      );

      // 📆 Generate timestamp (always fresh)
      const timestampBase = new Date()
        .toISOString()
        .replace(/[-:.TZ]/g, "")
        .slice(0, 14);

      const isFirstRun = !createFile && !updateFile;
      const prefix = isFirstRun ? "create" : "update";
      const migrationFile = `${timestampBase}_${prefix}_${ModelClass.tableName}_table.ts`;
      const migrationPath = path.join(migrationsDir, migrationFile);

      // ًں§¾ Generate file content
      const escapeForTemplateLiteral = (sql: string): string =>
        sql.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");

      const safeSQL = escapeForTemplateLiteral(mainSQL);
      const safeExtraTables = extraTables.map((t) => escapeForTemplateLiteral(t));
      const safeRollbackSQL = escapeForTemplateLiteral(rollbackMainSQL);
      const safeRollbackExtraTables = rollbackExtraTables.map((t) =>
        escapeForTemplateLiteral(t)
      );

      const hasMainSQL = safeSQL.trim().length > 0;
      const upStatements: string[] = [];
      if (safeSQL.trim()) {
        upStatements.push(`await db.query(\`${safeSQL}\`);`);
      }
      if (!pivotSeparate) {
        upStatements.push(...safeExtraTables.map((sql) => `await db.query(\`${sql}\`);`));
      }

      const downStatements: string[] = [];
      if (!pivotSeparate) {
        downStatements.push(
          ...safeRollbackExtraTables.map((sql) => `await db.query(\`${sql}\`);`)
        );
      }
      if (safeRollbackSQL.trim()) {
        downStatements.push(`await db.query(\`${safeRollbackSQL}\`);`);
      }

      const header = `/**
 * ًں§© Auto-generated ${prefix.toUpperCase()} migration for ${modelClassName}
 * Connection: ${connectionName}
 * Mode: ${isTest ? "TEST" : "DEVELOPMENT"}
 * Generated at ${new Date().toISOString()}
 */`;

      const migrationContent = `${header}
export async function up(db: { query(sql: string): Promise<void> }) {
  ${
    upStatements.length > 0
      ? upStatements.join("\n  ")
      : "// (no SQL changes detected)"
  }
}

export async function down(db: { query(sql: string): Promise<void> }) {
  ${
    downStatements.length > 0
      ? downStatements.join("\n  ")
      : "// (no rollback SQL generated)"
  }
}`;

      if (hasMainSQL || !pivotSeparate) {
        // ✅ Clean logic: only keep 1 file per model
        if (createFile) {
          fs.unlinkSync(path.join(migrationsDir, createFile));
          console.log(chalk.gray(`🧹 Removed outdated CREATE migration: ${createFile}`));
        }
        if (updateFile) {
          fs.unlinkSync(path.join(migrationsDir, updateFile));
          console.log(chalk.gray(`🧹 Removed old UPDATE migration: ${updateFile}`));
        }

        fs.writeFileSync(migrationPath, migrationContent, "utf8");

        const label = prefix === "create" ? "CREATE" : "UPDATE";
        console.log(chalk.green(`📄 Migration (${label}) saved: ${migrationPath}`));
      }

      if (pivotSeparate && extraTables.length > 0) {
        for (const [pivotIndex, originalSql] of extraTables.entries()) {
          const match = originalSql.match(
            /CREATE TABLE(?: IF NOT EXISTS)?\s+[`"]?([A-Za-z0-9_]+)/i
          );
          const pivotTable = match?.[1] ?? "pivot";
          const safePivotSql = originalSql.replace(/`/g, "\\`");
          const safeRollbackPivotSql = (
            rollbackExtraTables[pivotIndex] ?? `DROP TABLE IF EXISTS ${pivotTable};`
          ).replace(/`/g, "\\`");
          const existingPivotFiles = fs
            .readdirSync(migrationsDir)
            .filter((f) => /_create_[A-Za-z0-9_]+_table\.ts$/.test(f))
            .filter((f) => f.includes(`_create_${pivotTable}_table.ts`));
          if (pivotTable !== "pivot") {
            const genericPivotFiles = fs
              .readdirSync(migrationsDir)
              .filter((f) => f.includes("_create_pivot_table.ts"));
            existingPivotFiles.push(...genericPivotFiles);
          }
          for (const oldPivot of existingPivotFiles) {
            fs.unlinkSync(path.join(migrationsDir, oldPivot));
            console.log(chalk.gray(`🧹 Removed old PIVOT migration: ${oldPivot}`));
          }

          const pivotFile = `${timestampBase}_create_${pivotTable}_table.ts`;
          const pivotPath = path.join(migrationsDir, pivotFile);
          const pivotHeader = `/**
 * ✅ Auto-generated CREATE migration for ${pivotTable}
 * Connection: ${connectionName}
 * Mode: ${isTest ? "TEST" : "DEVELOPMENT"}
 * Generated at ${new Date().toISOString()}
 */`;
          const pivotContent = `${pivotHeader}
export async function up(db: { query(sql: string): Promise<void> }) {
  await db.query(\`${safePivotSql}\`);
}

export async function down(db: { query(sql: string): Promise<void> }) {
  await db.query(\`${safeRollbackPivotSql}\`);
}`;
          fs.writeFileSync(pivotPath, pivotContent, "utf8");
          console.log(chalk.green(`📄 Pivot migration saved: ${pivotPath}`));
        }
      }
    } catch (err) {
      console.error(chalk.red(`â‌Œ Error processing ${file}:`));
      console.error(err instanceof Error ? err.message : err);
    }
  }

  try {
    await closeAllConnections();
    console.log(chalk.gray("ًں”’ All database connections closed.\n"));
  } catch {
    console.warn(chalk.yellow("âڑ ï¸ڈ Could not close DB connections cleanly."));
  }

  console.log(
    chalk.cyanBright(
      `âœ… Migration generation complete in ${isTest ? "TEST" : "DEVELOPMENT"} mode.\n`
    )
  );

  if (options.exit !== false) {
    process.exit(0);
  }
}



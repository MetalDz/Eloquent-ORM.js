// src/cli/commands/makeMigration.ts
import fs from "fs";
import path from "path";
import chalk from "chalk";
import { SchemaBuilder } from "../../core/schema/SchemaBuilder";
import { SchemaField } from "../../core/schema/SchemaBlueprint";
import { PathMap } from "../utils/PathMap";
import { resolveConnectionName } from "../../core/connection/resolveConnectionName";
import { TypeScriptCompiler } from "../utils/typescript/TypeScriptCompiler";
import {
  closeAllConnections,
  type ConnectionName,
} from "../../core/connection/ConnectionFactory";
import { dbConfig } from "../../config/database";
import { loadModule } from "../utils/typescript/tsRuntime";

interface MigrationOptions {
  test?: boolean;
  exit?: boolean;
  pivotSeparate?: boolean;
  connectionName?: ConnectionName;
}

type SchemaRelation = {
  kind?: string;
  relation?: string;
  model?: string;
};

type LoadedModel = {
  file: string;
  modelClassName: string;
  ModelClass: {
    schema: Record<string, SchemaField>;
    tableName: string;
    connectionName?: string;
  };
};

function pascalCase(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function getBelongsToDependencies(
  schema: Record<string, unknown> | undefined,
  knownModels: Set<string>
): string[] {
  if (!schema) return [];

  const deps = new Set<string>();
  for (const value of Object.values(schema)) {
    if (!value || typeof value !== "object") continue;

    const relation = value as SchemaRelation;
    if (relation.kind !== "relation" || relation.relation !== "belongsTo") continue;
    if (!relation.model || !knownModels.has(relation.model)) continue;
    deps.add(relation.model);
  }

  return [...deps];
}

function sortModelsByDependencies(models: LoadedModel[]): LoadedModel[] {
  const modelNames = new Set(models.map((item) => item.modelClassName));
  const byName = new Map(models.map((item) => [item.modelClassName, item]));
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const ordered: LoadedModel[] = [];

  const visit = (modelName: string): void => {
    if (visited.has(modelName)) return;
    if (visiting.has(modelName)) return;

    visiting.add(modelName);
    const model = byName.get(modelName);
    if (model) {
      const dependencies = getBelongsToDependencies(
        model.ModelClass.schema,
        modelNames
      );
      for (const dependency of dependencies) {
        visit(dependency);
      }
      ordered.push(model);
    }
    visiting.delete(modelName);
    visited.add(modelName);
  };

  for (const model of models) {
    visit(model.modelClassName);
  }

  return ordered;
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
  const forcedConnectionName = options.connectionName;
  const pivotSeparate = options.pivotSeparate === true || modelName.toLowerCase() === "all";

  const modelsDir = PathMap.models(isTest);
  PathMap.ensureDirs();

  if (!fs.existsSync(modelsDir)) {
    console.error(chalk.red(`â‌Œ Models folder not found: ${modelsDir}`));
    return;
  }

  console.log(chalk.gray(`ًں“پ Models Path: ${modelsDir}`));
  console.log(
    chalk.gray(
      `ًں“پ Migrations Root: ${isTest ? PathMap.testMigrations() : PathMap.appMigrations()}`
    )
  );

  const requestedModelFiles =
    modelName.toLowerCase() === "all"
      ? fs.readdirSync(modelsDir).filter((f) => f.endsWith(".ts"))
      : [`${pascalCase(modelName)}.ts`];

  if (requestedModelFiles.length === 0) {
    console.warn(chalk.yellow("âڑ ï¸ڈ  No model files found."));
    return;
  }

  const loadedModels: LoadedModel[] = [];
  const timestampSeed = new Date()
    .toISOString()
    .replace(/[-:.TZ]/g, "")
    .slice(0, 14);
  let migrationSequence = 0;
  const nextTimestamp = (): string => {
    migrationSequence += 1;
    return `${timestampSeed}${String(migrationSequence).padStart(3, "0")}`;
  };

  for (const file of requestedModelFiles) {
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
      const modelModule = loadModule(absModelPath);

      const modelClassName = path.basename(file, ".ts");
      const ModelClass = modelModule[modelClassName] as
        | {
            schema?: Record<string, SchemaField>;
            tableName?: string;
            connectionName?: string;
          }
        | undefined;
      if (!ModelClass?.schema || !ModelClass?.tableName) {
        console.log(chalk.yellow(`âڑ ï¸ڈ  No schema found in ${modelClassName} â€” skipping.`));
        continue;
      }

      loadedModels.push({
        file,
        modelClassName,
        ModelClass: {
          schema: ModelClass.schema,
          tableName: ModelClass.tableName,
          connectionName: ModelClass.connectionName,
        },
      });
    } catch (err) {
      console.error(chalk.red(`â‌Œ Error processing ${file}:`));
      console.error(err instanceof Error ? err.message : err);
    }
  }

  const orderedModels =
    modelName.toLowerCase() === "all"
      ? sortModelsByDependencies(loadedModels)
      : loadedModels;

  for (const { file, modelClassName, ModelClass } of orderedModels) {
    try {
      const resolvedConnectionName = resolveConnectionName(ModelClass, { test: isTest });
      const connectionName = forcedConnectionName ?? resolvedConnectionName;
      const migrationsDir = PathMap.migrations(isTest, connectionName);
      if (!fs.existsSync(migrationsDir)) {
        fs.mkdirSync(migrationsDir, { recursive: true });
      }
      console.log(chalk.gray(`ًں”Œ Using connection: ${connectionName}`));
      console.log(chalk.gray(`ًں“پ Migrations Path: ${migrationsDir}`));

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
      const timestampBase = nextTimestamp();

      const normalizedMainSQL = mainSQL.trim().toUpperCase();
      const isCreateMigration = normalizedMainSQL.startsWith("CREATE TABLE");
      const prefix = isCreateMigration ? "create" : "update";
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

          const pivotTimestamp = nextTimestamp();
          const pivotFile = `${pivotTimestamp}_create_${pivotTable}_table.ts`;
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



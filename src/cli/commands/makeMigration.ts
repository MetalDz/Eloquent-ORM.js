// src/cli/commands/makeMigration.ts
import fs from "fs";
import path from "path";
import chalk from "chalk";
import { SchemaBuilder } from "../../core/schema/SchemaBuilder";
import { RelationDefinition, SchemaField } from "../../core/schema/SchemaBlueprint";
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
    softDeletes?: boolean;
  };
};

function hasSoftDeletesSchema(schema: Record<string, SchemaField>): boolean {
  for (const [name, field] of Object.entries(schema)) {
    if (field.kind === "mixin" && field.name === "SoftDeletes") {
      return true;
    }
    if (field.kind === "column") {
      if (field.type === "softDeletes") return true;
      if (name === "deleted_at") return true;
    }
  }
  return false;
}

function normalizedSchemaForMigration(modelClass: {
  schema: Record<string, SchemaField>;
  softDeletes?: boolean;
}): Record<string, SchemaField> {
  const schema: Record<string, SchemaField> = { ...modelClass.schema };
  if (modelClass.softDeletes && !hasSoftDeletesSchema(schema)) {
    schema.deleted_at = { kind: "mixin", name: "SoftDeletes" };
  }
  return schema;
}

function stableMigrationBody(content: string): string {
  const marker = "export async function up";
  const markerIndex = content.indexOf(marker);
  return markerIndex >= 0 ? content.slice(markerIndex).trim() : content.trim();
}

function hasSameGeneratedBody(filePath: string, nextContent: string): boolean {
  if (!fs.existsSync(filePath)) {
    return false;
  }
  const current = fs.readFileSync(filePath, "utf8");
  return stableMigrationBody(current) === stableMigrationBody(nextContent);
}

type PendingPivotMigration = {
  connectionName: string;
  migrationsDir: string;
  pivotTable: string;
  content: string;
};

type MongoIndexDefinition = {
  keys: Record<string, 1 | -1>;
  options?: Record<string, unknown>;
};

type MongoPivotDefinition = {
  collectionName: string;
  leftKey: string;
  rightKey: string;
};

function pascalCase(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function getBelongsToDependencies(
  schema: Record<string, unknown>,
  knownModels: Set<string>
): string[] {
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
    const model = byName.get(modelName)!;
    const dependencies = getBelongsToDependencies(
      model.ModelClass.schema,
      modelNames
    );
    for (const dependency of dependencies) {
      visit(dependency);
    }
    ordered.push(model);
    visiting.delete(modelName);
    visited.add(modelName);
  };

  for (const model of models) {
    visit(model.modelClassName);
  }

  return ordered;
}

function singularizeTableName(name: string): string {
  const normalized = name.toLowerCase();
  return normalized.endsWith("s") ? normalized.slice(0, -1) : normalized;
}

function buildMongoIndexDefinitions(
  schema: Record<string, SchemaField>
): MongoIndexDefinition[] {
  const indexes: MongoIndexDefinition[] = [];
  const seen = new Set<string>();

  const push = (
    keys: Record<string, 1 | -1>,
    options?: Record<string, unknown>
  ): void => {
    const signature = JSON.stringify({ keys, options: options ?? {} });
    if (seen.has(signature)) return;
    seen.add(signature);
    indexes.push({ keys, options });
  };

  for (const [name, field] of Object.entries(schema)) {
    if (field.kind === "column") {
      if (field.options?.primary || field.type === "increments") {
        push({ [name]: 1 }, { unique: true, name: `${name}_pk_unique` });
      }
      if (field.options?.unique) {
        push({ [name]: 1 }, { unique: true, name: `${name}_unique` });
      } else if (field.options?.index) {
        push({ [name]: 1 }, { name: `${name}_idx` });
      }
      if (field.type === "softDeletes" || name === "deleted_at") {
        push({ deleted_at: 1 }, { name: "deleted_at_idx" });
      }
      continue;
    }

    if (field.kind === "relation" && field.relation === "belongsTo") {
      const relation = field as RelationDefinition;
      const fk = relation.options?.foreignKey;
      if (fk) {
        push({ [fk]: 1 }, { name: `${fk}_idx` });
      }
      continue;
    }

    if (field.kind === "mixin" && field.name === "SoftDeletes") {
      push({ deleted_at: 1 }, { name: "deleted_at_idx" });
    }
  }

  return indexes;
}

function buildMongoPivotDefinitions(
  currentTableName: string,
  schema: Record<string, SchemaField>
): MongoPivotDefinition[] {
  const pivots = new Map<string, MongoPivotDefinition>();
  const sourceTable = currentTableName.toLowerCase();
  const sourceKey = singularizeTableName(sourceTable);

  for (const field of Object.values(schema)) {
    if (field.kind !== "relation" || field.relation !== "belongsToMany" || !field.model) {
      continue;
    }

    const targetTable = field.model.toLowerCase().endsWith("s")
      ? field.model.toLowerCase()
      : `${field.model.toLowerCase()}s`;
    const targetKey = singularizeTableName(targetTable);
    const sorted = [sourceKey, targetKey].sort();
    const collectionName = `${sorted[0]}_${sorted[1]}_pivot`;

    pivots.set(collectionName, {
      collectionName,
      leftKey: `${sorted[0]}_id`,
      rightKey: `${sorted[1]}_id`,
    });
  }

  return [...pivots.values()];
}

/**
 * make:migration (v4.1)
 *
 * - Baseline CREATE migrations are generated once.
 * - UPDATE migrations are append-only.
 * - Existing migration files are never deleted automatically.
 * - Duplicate generated SQL bodies are skipped.
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
  const pendingPivotMigrations = new Map<string, PendingPivotMigration>();
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
            softDeletes?: boolean;
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
          softDeletes: ModelClass.softDeletes,
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
      const files = fs
        .readdirSync(migrationsDir)
        .filter((fileName) => fileName.endsWith(".ts") || fileName.endsWith(".js"));
      const createFiles = files.filter((f) =>
        f.includes(`create_${ModelClass.tableName}_table.ts`)
      );
      const updateFiles = files.filter((f) =>
        f.includes(`update_${ModelClass.tableName}_table.ts`)
      );
      const needsBaselineCreate = createFiles.length === 0 && updateFiles.length === 0;
      console.log(chalk.gray(`ًں”Œ Using connection: ${connectionName}`));
      console.log(chalk.gray(`ًں“پ Migrations Path: ${migrationsDir}`));

      const driver =
        (dbConfig.connections as Record<string, { driver?: string }>)[connectionName]?.driver ??
        connectionName;
      const normalizedSchema = normalizedSchemaForMigration(ModelClass);

      if (driver === "mongo") {
        const mongoIndexes = buildMongoIndexDefinitions(normalizedSchema);
        const mongoPivots = buildMongoPivotDefinitions(
          ModelClass.tableName,
          normalizedSchema
        );
        const hasMongoWork =
          needsBaselineCreate || mongoIndexes.length > 0 || mongoPivots.length > 0;
        if (!hasMongoWork) {
          console.log(chalk.gray(`ℹ️ No new columns or schema changes — skipping.`));
          continue;
        }

        const timestampBase = nextTimestamp();
        const prefix = needsBaselineCreate ? "create" : "update";
        const migrationFile = `${timestampBase}_${prefix}_${ModelClass.tableName}_table.ts`;
        const migrationPath = path.join(migrationsDir, migrationFile);
        const stringify = (value: unknown): string => JSON.stringify(value);

        const upStatements: string[] = [
          `await db.ensureCollection(${stringify(ModelClass.tableName)});`,
          ...mongoIndexes.map((index) => {
            if (index.options && Object.keys(index.options).length > 0) {
              return `await db.createIndex(${stringify(ModelClass.tableName)}, ${stringify(
                index.keys
              )}, ${stringify(index.options)});`;
            }
            return `await db.createIndex(${stringify(ModelClass.tableName)}, ${stringify(
              index.keys
            )});`;
          }),
        ];

        if (!pivotSeparate) {
          for (const pivot of mongoPivots) {
            upStatements.push(
              `await db.ensureCollection(${stringify(pivot.collectionName)});`
            );
            upStatements.push(
              `await db.createIndex(${stringify(pivot.collectionName)}, ${stringify(
                { [pivot.leftKey]: 1, [pivot.rightKey]: 1 }
              )}, ${stringify({
                unique: true,
                name: `${pivot.collectionName}_pair_unique`,
              })});`
            );
          }
        }

        const downStatements: string[] = [];
        if (prefix === "create") {
          if (!pivotSeparate) {
            downStatements.push(
              ...mongoPivots.map(
                (pivot) =>
                  `await db.dropCollection(${stringify(pivot.collectionName)});`
              )
            );
          }
          downStatements.push(`await db.dropCollection(${stringify(ModelClass.tableName)});`);
        }

        const header = `/**
 * ✅ Auto-generated ${prefix.toUpperCase()} migration for ${modelClassName}
 * Connection: ${connectionName}
 * Mode: ${isTest ? "TEST" : "DEVELOPMENT"}
 * Generated at ${new Date().toISOString()}
 */`;

        const migrationContent = `${header}
export async function up(db: {
  ensureCollection(name: string): Promise<void>;
  createIndex(collectionName: string, keys: Record<string, 1 | -1>, options?: Record<string, unknown>): Promise<void>;
}) {
  ${
    upStatements.length > 0
      ? upStatements.join("\n  ")
      : "// (no Mongo changes detected)"
  }
}

export async function down(db: { dropCollection(name: string): Promise<void> }) {
  ${
    downStatements.length > 0
      ? downStatements.join("\n  ")
      : "// (no rollback operations generated)"
  }
}`;

        if (prefix === "create" && createFiles.length > 0) {
          console.log(
            chalk.gray(
              `ℹ️ Baseline CREATE already exists for "${ModelClass.tableName}" — skipping CREATE regeneration.`
            )
          );
        } else {
          const samePrefixFiles = prefix === "create" ? createFiles : updateFiles;
          const unchangedFile =
            samePrefixFiles.find((fileName) =>
              hasSameGeneratedBody(path.join(migrationsDir, fileName), migrationContent)
            ) ?? null;

          if (unchangedFile) {
            console.log(chalk.gray(`ℹ️ Migration unchanged: ${unchangedFile}`));
          } else {
            fs.writeFileSync(migrationPath, migrationContent, "utf8");
            const label = prefix === "create" ? "CREATE" : "UPDATE";
            console.log(chalk.green(`📄 Migration (${label}) saved: ${migrationPath}`));
          }
        }

        if (pivotSeparate && mongoPivots.length > 0) {
          for (const pivot of mongoPivots) {
            const pivotHeader = `/**
 * ✅ Auto-generated CREATE migration for ${pivot.collectionName}
 * Connection: ${connectionName}
 * Mode: ${isTest ? "TEST" : "DEVELOPMENT"}
 * Generated at ${new Date().toISOString()}
 */`;
            const pivotContent = `${pivotHeader}
export async function up(db: {
  ensureCollection(name: string): Promise<void>;
  createIndex(collectionName: string, keys: Record<string, 1 | -1>, options?: Record<string, unknown>): Promise<void>;
}) {
  await db.ensureCollection(${stringify(pivot.collectionName)});
  await db.createIndex(${stringify(pivot.collectionName)}, ${stringify({
              [pivot.leftKey]: 1,
              [pivot.rightKey]: 1,
            })}, ${stringify({
              unique: true,
              name: `${pivot.collectionName}_pair_unique`,
            })});
}

export async function down(db: { dropCollection(name: string): Promise<void> }) {
  await db.dropCollection(${stringify(pivot.collectionName)});
}`;
            pendingPivotMigrations.set(`${connectionName}:${pivot.collectionName}`, {
              connectionName,
              migrationsDir,
              pivotTable: pivot.collectionName,
              content: pivotContent,
            });
          }
        }

        continue;
      }

      if (!["mysql", "pg", "sqlite"].includes(driver)) {
        console.warn(
          chalk.yellow(
            `Skipping make:migration for "${connectionName}": unsupported driver "${driver}".`
          )
        );
        continue;
      }

      const { mainSQL, extraTables, rollbackMainSQL, rollbackExtraTables } = await SchemaBuilder.toCreateSQL(
        ModelClass.tableName,
        normalizedSchema,
        driver,
        !needsBaselineCreate,
        connectionName,
        needsBaselineCreate
      );

      if ((!mainSQL || mainSQL.trim() === "") && extraTables.length === 0) {
        console.log(chalk.gray(`ℹ️ No new columns or schema changes — skipping.`));
        continue;
      }

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
        if (prefix === "create" && createFiles.length > 0) {
          console.log(
            chalk.gray(
              `ℹ️ Baseline CREATE already exists for "${ModelClass.tableName}" — skipping CREATE regeneration.`
            )
          );
        } else {
          const samePrefixFiles = prefix === "create" ? createFiles : updateFiles;
          const unchangedFile =
            samePrefixFiles.find((fileName) =>
              hasSameGeneratedBody(path.join(migrationsDir, fileName), migrationContent)
            ) ?? null;

          if (unchangedFile) {
            console.log(chalk.gray(`ℹ️ Migration unchanged: ${unchangedFile}`));
          } else {
            fs.writeFileSync(migrationPath, migrationContent, "utf8");

            const label = prefix === "create" ? "CREATE" : "UPDATE";
            console.log(chalk.green(`📄 Migration (${label}) saved: ${migrationPath}`));
          }
        }
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
          pendingPivotMigrations.set(`${connectionName}:${pivotTable}`, {
            connectionName,
            migrationsDir,
            pivotTable,
            content: pivotContent,
          });
        }
      }
    } catch (err) {
      console.error(chalk.red(`â‌Œ Error processing ${file}:`));
      console.error(err instanceof Error ? err.message : err);
    }
  }

  for (const pendingPivot of pendingPivotMigrations.values()) {
    const allFiles = fs
      .readdirSync(pendingPivot.migrationsDir)
      .filter((f) => f.endsWith(".ts") || f.endsWith(".js"));
    const existingPivotFiles = allFiles
      .filter((f) => /_create_[A-Za-z0-9_]+_table\.ts$/.test(f))
      .filter((f) => f.includes(`_create_${pendingPivot.pivotTable}_table.ts`));
    if (pendingPivot.pivotTable !== "pivot") {
      const genericPivotFiles = allFiles.filter((f) => f.includes("_create_pivot_table.ts"));
      existingPivotFiles.push(...genericPivotFiles);
    }
    const uniquePivotFiles = [...new Set(existingPivotFiles)];
    const unchangedPivot = uniquePivotFiles.find((fileName) =>
      hasSameGeneratedBody(path.join(pendingPivot.migrationsDir, fileName), pendingPivot.content)
    );
    if (unchangedPivot) {
      console.log(chalk.gray(`ℹ️ Pivot migration unchanged: ${unchangedPivot}`));
      continue;
    }

    const pivotTimestamp = nextTimestamp();
    const pivotFile = `${pivotTimestamp}_create_${pendingPivot.pivotTable}_table.ts`;
    const pivotPath = path.join(pendingPivot.migrationsDir, pivotFile);
    fs.writeFileSync(pivotPath, pendingPivot.content, "utf8");
    console.log(chalk.green(`📄 Pivot migration saved: ${pivotPath}`));
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



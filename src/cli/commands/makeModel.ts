// src/cli/commands/makeModel.ts
import fs from "fs";
import path from "path";
import chalk from "chalk";
import { SchemaBuilder } from "../../core/schema/SchemaBuilder";
import { PathMap } from "../utils/PathMap";
import { TemplateEngine } from "../utils/TemplateEngine";
import { ImportResolver } from "../utils/ImportResolver";
import { resolveConnectionName } from "../../core/connection/resolveConnectionName";
import { TypeScriptCompiler } from "../utils/typescript/TypeScriptCompiler";
import { closeAllConnections } from "../../core/connection/ConnectionFactory";
import { dbConfig } from "../../config/database";
import { loadModule } from "../utils/typescript/tsRuntime";
import type {
  SchemaField,
  ColumnDefinition,
} from "../../core/schema/SchemaBlueprint";

interface ModelOptions {
  test?: boolean;
  withMigration?: boolean;
  force?: boolean;
  attrsFromSchema?: boolean;
}

type LoadedModelClass = {
  schema?: Record<string, SchemaField>;
  tableName?: string;
  timestamps?: boolean;
  softDeletes?: boolean;
  connectionName?: string;
};

function pascalCase(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function pluralize(name: string): string {
  return name.toLowerCase().endsWith("s") ? name.toLowerCase() : name.toLowerCase() + "s";
}

function defaultAttrsTypeBody(): string {
  return [
    "  id?: number;",
    "  name?: string;",
    "  created_at?: string | Date | null;",
    "  updated_at?: string | Date | null;",
  ].join("\n");
}

function columnBaseType(column: ColumnDefinition): string {
  switch (column.type) {
    case "increments":
    case "int":
    case "bigint":
    case "decimal":
    case "float":
      return "number";
    case "uuid":
    case "string":
    case "text":
      return "string";
    case "boolean":
      return "boolean";
    case "json":
      return "Record<string, unknown>";
    case "timestamp":
      return "string | Date";
    default:
      return "unknown";
  }
}

function addNullable(type: string): string {
  if (type.includes("null")) return type;
  return `${type} | null`;
}

function isOptional(column: ColumnDefinition): boolean {
  if (column.type === "increments" || column.options?.primary) return true;
  if (column.options?.default !== undefined) return true;
  return column.options?.notNull !== true;
}

function buildAttrsTypeBody(
  schema: Record<string, SchemaField>,
  options?: { includeTimestamps?: boolean; includeSoftDeletes?: boolean }
): string {
  const lines: string[] = [];
  const added = new Set<string>();

  const pushField = (name: string, type: string, optional: boolean): void => {
    if (added.has(name)) return;
    added.add(name);
    lines.push(`  ${name}${optional ? "?" : ""}: ${type};`);
  };

  for (const [key, field] of Object.entries(schema)) {
    if (field.kind !== "column") continue;
    const column = field as ColumnDefinition;

    if (column.type === "timestamps") {
      pushField("created_at", "string | Date | null", true);
      pushField("updated_at", "string | Date | null", true);
      continue;
    }

    if (column.type === "softDeletes") {
      pushField("deleted_at", "string | Date | null", true);
      continue;
    }

    const baseType = columnBaseType(column);
    const nullableType = column.options?.notNull === true ? baseType : addNullable(baseType);
    pushField(key, nullableType, isOptional(column));
  }

  if (options?.includeTimestamps) {
    pushField("created_at", "string | Date | null", true);
    pushField("updated_at", "string | Date | null", true);
  }

  if (options?.includeSoftDeletes) {
    pushField("deleted_at", "string | Date | null", true);
  }

  return lines.length ? lines.join("\n") : "  // No columns found in schema";
}

/**
 * 🧱 make:model
 * Generates a new model file (and optionally a migration).
 *
 * Usage:
 *   eloquent make:model User
 *   eloquent make:model User --with-migration
 *   eloquent make:model User --attrs-from-schema
 *   eloquent make:model User --with-migration --force
 */
export async function makeModel(name: string, options: ModelOptions = {}): Promise<void> {
  const isTest = options.test === true;
  const withMigration = options.withMigration === true;
  const force = options.force === true;
  const attrsFromSchema = options.attrsFromSchema === true;
  const modelName = pascalCase(name);
  const tableName = pluralize(name);
  const mode = isTest ? "TEST" : "DEVELOPMENT";
  let wroteModel = false;

  PathMap.ensureDirs();
  const modelsDir = PathMap.models(isTest);
  const migrationsDir = isTest ? PathMap.testMigrations() : PathMap.appMigrations();

  console.log(chalk.gray(`📁 Models Path: ${modelsDir}`));
  console.log(chalk.gray(`📁 Migrations Path: ${migrationsDir}`));

  const coreImportPath = ImportResolver.coreImportPath(isTest);
  const schemaImportPath = ImportResolver.schemaImportPath(isTest);
  let tpl = "";

  // 🧠 1️⃣ Generate Model
  const modelFilePath = path.join(modelsDir, `${modelName}.ts`);
  try {
    tpl = TemplateEngine.load("model");

    const modelContent = TemplateEngine.render(tpl, {
      ModelName: modelName,
      tableName,
      coreImportPath,
      schemaImportPath,
      attrsTypeBody: defaultAttrsTypeBody(),
    });

    const header = `/**
 * 🧩 Auto-generated EloquentJS ORM Model
 * Model: ${modelName}
 * Table: ${tableName}
 * Mode: ${mode}
 * Generated at: ${new Date().toISOString()}
 */\n\n`;

    const finalContent = header + modelContent;

    if (fs.existsSync(modelFilePath) && !force) {
      console.log(chalk.yellow(`⚠️  Model already exists: ${modelFilePath}`));
    } else {
      TemplateEngine.save(modelFilePath, finalContent);
      wroteModel = true;
      console.log(chalk.green(`✅ Model created: ${modelFilePath}`));
    }
  } catch (err) {
    console.error(chalk.red("❌ Error rendering model template:"), err);
    return;
  }

  if (attrsFromSchema && wroteModel) {
    try {
      if (!TypeScriptCompiler.compile([modelFilePath])) {
        console.warn(chalk.yellow(`⚠️  Skipping attrs inference — ${modelName}.ts has TS errors.`));
      } else {
        const absModelPath = path.resolve(modelFilePath);
        delete require.cache[require.resolve(absModelPath)];
        const modelModule = loadModule(absModelPath);
        const ModelClass = modelModule[modelName] as LoadedModelClass | undefined;

        if (!ModelClass?.schema) {
          console.log(chalk.yellow(`⚠️  Schema not found in ${modelName}.ts — keeping defaults.`));
        } else {
          const attrsTypeBody = buildAttrsTypeBody(ModelClass.schema, {
            includeTimestamps: Boolean(ModelClass.timestamps),
            includeSoftDeletes: Boolean(ModelClass.softDeletes),
          });

          const modelContent = TemplateEngine.render(tpl, {
            ModelName: modelName,
            tableName,
            coreImportPath,
            schemaImportPath,
            attrsTypeBody,
          });

          const header = `/**
 * 🧩 Auto-generated EloquentJS ORM Model
 * Model: ${modelName}
 * Table: ${tableName}
 * Mode: ${mode}
 * Generated at: ${new Date().toISOString()}
 */\n\n`;

          TemplateEngine.save(modelFilePath, header + modelContent);
          console.log(chalk.green(`✅ Inferred attrs type from schema for ${modelName}.ts`));
        }
      }
    } catch (err) {
      console.error(chalk.red("❌ Error inferring attrs from schema:"), err);
    }
  }

  // 🧭 2️⃣ Stop here if no migration requested
  if (!withMigration) {
    console.log(chalk.cyanBright(`💡 Next step:`));
    console.log(chalk.cyan(`   1️⃣ Define your schema inside ${modelName}.ts`));
    console.log(chalk.cyan(`   2️⃣ Run: eloquent make:migration ${modelName}`));
    return;
  }

  // 🧱 3️⃣ Generate smart migration (SchemaBuilder v3)
  try {
    if (!TypeScriptCompiler.compile([modelFilePath])) {
      console.warn(chalk.yellow(`⚠️  Skipping migration — ${modelName}.ts has TS errors.`));
      return;
    }

    const absModelPath = path.resolve(modelFilePath);
    delete require.cache[require.resolve(absModelPath)];
    const modelModule = loadModule(absModelPath);
    const ModelClass = modelModule[modelName] as LoadedModelClass | undefined;

    if (!ModelClass?.schema || !ModelClass?.tableName) {
      console.log(chalk.yellow(`⚠️  Schema not found in ${modelName}.ts — skipping migration.`));
      return;
    }

    const connectionName = resolveConnectionName(ModelClass, { test: isTest });
    const connectionMigrationsDir = PathMap.migrations(isTest, connectionName);
    if (!fs.existsSync(connectionMigrationsDir)) {
      fs.mkdirSync(connectionMigrationsDir, { recursive: true });
    }
    console.log(chalk.gray(`Using connection: ${connectionName}`));
    console.log(chalk.gray(`Migrations Path: ${connectionMigrationsDir}`));
    const driver =
      (dbConfig.connections as Record<string, { driver?: string }>)[connectionName]?.driver ??
      connectionName;
    const { mainSQL } = await SchemaBuilder.toCreateSQL(
      ModelClass.tableName,
      ModelClass.schema,
      driver,
      true, // smart update detection
      connectionName
    );

    const isCreate = mainSQL.trim().toUpperCase().startsWith("CREATE TABLE");
    const prefix = isCreate ? "create" : "update";
    const timestamp = new Date().toISOString().replace(/[-:TZ]/g, "").slice(0, 14);
    const migrationFile = `${timestamp}_${prefix}_${ModelClass.tableName}_table.ts`;
    const migrationPath = path.join(connectionMigrationsDir, migrationFile);

    // 🧹 Clean old opposite migration
    const opposite = isCreate ? "update" : "create";
    const oldFile = fs
      .readdirSync(connectionMigrationsDir)
      .find((f) => f.includes(`${opposite}_${ModelClass.tableName}_table.ts`));

    if (oldFile) {
      fs.unlinkSync(path.join(connectionMigrationsDir, oldFile));
      console.log(chalk.gray(`🧹 Removed old ${opposite} migration: ${oldFile}`));
    }

    // 🧩 Prevent duplicates
    const existing = fs
      .readdirSync(connectionMigrationsDir)
      .find((f) => f.includes(`${prefix}_${ModelClass.tableName}_table.ts`));

    if (existing && !force) {
      console.log(chalk.yellow(`⚠️  Migration already exists: ${existing}`));
      console.log(chalk.gray("ℹ️  Use --force to overwrite it.\n"));
      return;
    }

    // 🧾 Write migration file
    const safeSQL = mainSQL.replace(/`/g, "\\`");
    const migrationContent = `/**
 * 🧩 Auto-generated ${prefix.toUpperCase()} migration for ${modelName}
 * Mode: ${mode}
 * Generated at ${new Date().toISOString()}
 */
export async function up(db: { query(sql: string): Promise<void> }) {
  await db.query(\`${safeSQL}\`);
}

export async function down(db: { query(sql: string): Promise<void> }) {
  await db.query(\`DROP TABLE IF EXISTS \\\`${ModelClass.tableName}\\\`;\`);
}
`;
    fs.writeFileSync(migrationPath, migrationContent, "utf8");
    console.log(chalk.green(`🧱 Migration (${prefix.toUpperCase()}) created: ${migrationPath}`));
  } catch (err) {
    console.error(chalk.red("❌ Error generating migration:"), err);
  } finally {
    try {
      await closeAllConnections();
      console.log(chalk.gray("All database connections closed."));
    } catch {
      console.warn(chalk.yellow("Could not close DB connections cleanly."));
    }
  }
}

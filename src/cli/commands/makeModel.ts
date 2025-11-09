// src/cli/commands/makeModel.ts
import fs from "fs";
import path from "path";
import chalk from "chalk";
import { SchemaBuilder } from "../../core/schema/SchemaBuilder";
import { PathMap } from "../utils/PathMap";
import { TemplateEngine } from "../utils/TemplateEngine";
import { ImportResolver } from "../utils/ImportResolver";
import { TypeScriptCompiler } from "../utils/typescript/TypeScriptCompiler";

interface ModelOptions {
  test?: boolean;
  withMigration?: boolean;
  force?: boolean;
}

function pascalCase(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function pluralize(name: string): string {
  return name.toLowerCase().endsWith("s") ? name.toLowerCase() : name.toLowerCase() + "s";
}

/**
 * 🧱 make:model
 * Generates a new model file (and optionally a migration).
 *
 * Usage:
 *   eloquent make:model User
 *   eloquent make:model User --with-migration
 *   eloquent make:model User --with-migration --force
 */
export async function makeModel(name: string, options: ModelOptions = {}): Promise<void> {
  const isTest = options.test === true;
  const withMigration = options.withMigration === true;
  const force = options.force === true;
  const modelName = pascalCase(name);
  const tableName = pluralize(name);
  const mode = isTest ? "TEST" : "DEVELOPMENT";

  PathMap.ensureDirs();
  const modelsDir = PathMap.models(isTest);
  const migrationsDir = PathMap.migrations(isTest);

  console.log(chalk.gray(`📁 Models Path: ${modelsDir}`));
  console.log(chalk.gray(`📁 Migrations Path: ${migrationsDir}`));

  const coreImportPath = ImportResolver.coreImportPath(isTest);
  const schemaImportPath = ImportResolver.schemaImportPath(isTest);

  // 🧠 1️⃣ Generate Model
  const modelFilePath = path.join(modelsDir, `${modelName}.ts`);
  try {
    const tpl = TemplateEngine.load("model");

    const modelContent = TemplateEngine.render(tpl, {
      ModelName: modelName,
      tableName,
      coreImportPath,
      schemaImportPath,
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
      console.log(chalk.green(`✅ Model created: ${modelFilePath}`));
    }
  } catch (err) {
    console.error(chalk.red("❌ Error rendering model template:"), err);
    return;
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
    const modelModule = await import(absModelPath);
    const ModelClass = modelModule[modelName];

    if (!ModelClass?.schema || !ModelClass?.tableName) {
      console.log(chalk.yellow(`⚠️  Schema not found in ${modelName}.ts — skipping migration.`));
      return;
    }

    const { mainSQL } = await SchemaBuilder.toCreateSQL(
      ModelClass.tableName,
      ModelClass.schema,
      undefined,
      true // smart update detection
    );

    const isCreate = mainSQL.trim().toUpperCase().startsWith("CREATE TABLE");
    const prefix = isCreate ? "create" : "update";
    const timestamp = new Date().toISOString().replace(/[-:TZ]/g, "").slice(0, 14);
    const migrationFile = `${timestamp}_${prefix}_${ModelClass.tableName}_table.ts`;
    const migrationPath = path.join(migrationsDir, migrationFile);

    // 🧹 Clean old opposite migration
    const opposite = isCreate ? "update" : "create";
    const oldFile = fs
      .readdirSync(migrationsDir)
      .find((f) => f.includes(`${opposite}_${ModelClass.tableName}_table.ts`));

    if (oldFile) {
      fs.unlinkSync(path.join(migrationsDir, oldFile));
      console.log(chalk.gray(`🧹 Removed old ${opposite} migration: ${oldFile}`));
    }

    // 🧩 Prevent duplicates
    const existing = fs
      .readdirSync(migrationsDir)
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
  }
}

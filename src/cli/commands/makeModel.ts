import fs from "fs";
import path from "path";
import chalk from "chalk";
import { SchemaBuilder } from "../../core/schema/SchemaBuilder";
import { PathMap } from "../utils/PathMap";
import { TemplateEngine } from "../utils/TemplateEngine";
import { ImportResolver } from "../utils/ImportResolver";

interface ModelOptions {
  test?: boolean;
}

function pascalCase(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function pluralize(name: string): string {
  return name.toLowerCase().endsWith("s") ? name.toLowerCase() : name.toLowerCase() + "s";
}

/**
 * 🧱 make:model
 * Generates a new model file (with dynamic import paths) and optional migration.
 *
 * Usage:
 *   eloquent make:model User
 *   eloquent make:model User --test
 */
export async function makeModel(name: string, options: ModelOptions = {}): Promise<void> {
  const isTest = options.test === true;
  const modelName = pascalCase(name);
  const tableName = pluralize(name);
  const mode = isTest ? "TEST" : "DEVELOPMENT";

  // 🧩 Prepare directories
  PathMap.ensureDirs();
  const modelsDir = PathMap.models(isTest);
  const migrationsDir = PathMap.migrations(isTest);

  if (!fs.existsSync(modelsDir)) fs.mkdirSync(modelsDir, { recursive: true });
  if (!fs.existsSync(migrationsDir)) fs.mkdirSync(migrationsDir, { recursive: true });

  console.log(chalk.gray(`📁 Models Path: ${modelsDir}`));
  console.log(chalk.gray(`📁 Migrations Path: ${migrationsDir}`));

  // 🧩 Resolve import paths dynamically
  const coreImportPath = ImportResolver.coreImportPath(isTest);
  const schemaImportPath = ImportResolver.schemaImportPath(isTest);

  // 🧠 Render model template
  try {
    const tpl = TemplateEngine.load("model");

    const modelContent = TemplateEngine.render(tpl, {
      ModelName: modelName,
      tableName,
      coreImportPath,
      schemaImportPath,
    });

    const headerComment = `/**
 * 🧩 Auto-generated EloquentJS ORM Model
 * Model: ${modelName}
 * Table: ${tableName}
 * Mode: ${mode}
 * Generated at: ${new Date().toISOString()}
 */\n\n`;

    const finalContent = headerComment + modelContent;
    const modelFilePath = path.join(modelsDir, `${modelName}.ts`);

    if (fs.existsSync(modelFilePath)) {
      console.log(chalk.yellow(`⚠️  Model already exists: ${modelFilePath}`));
      return;
    }

    TemplateEngine.save(modelFilePath, finalContent);
    console.log(chalk.green(`✅ Model created: ${modelFilePath}`));
  } catch (err) {
    console.error(chalk.red("❌ Error rendering model template:"));
    console.error(err);
    return;
  }

  // 🧱 Generate migration (optional)
  try {
    const modelFilePath = path.join(modelsDir, `${modelName}.ts`);

    // Syntax validation before import
    const { execSync } = await import("child_process");
    execSync(`npx tsc "${modelFilePath}" --noEmit --skipLibCheck`, { stdio: "inherit" });

    const modelModule = await import(path.resolve(modelFilePath));
    const ModelClass = modelModule[modelName];

    if (ModelClass?.schema && ModelClass?.tableName) {
      const createSQL = SchemaBuilder.toCreateSQL(ModelClass.tableName, ModelClass.schema);
      const timestamp = new Date().toISOString().replace(/[-:TZ]/g, "").slice(0, 14);
      const migrationFile = `${timestamp}_create_${ModelClass.tableName}_table.ts`;
      const migrationPath = path.join(migrationsDir, migrationFile);

      const migrationContent = `/**
 * 🧩 Auto-generated migration for ${modelName}
 * Mode: ${mode}
 * Generated at ${new Date().toISOString()}
 */
export async function up(db: { query(sql: string): Promise<void> }) {
  await db.query(\`${createSQL}\`);
}

export async function down(db: { query(sql: string): Promise<void> }) {
  await db.query(\`DROP TABLE IF EXISTS \\\`${ModelClass.tableName}\\\`;\`);
}
`;

      fs.writeFileSync(migrationPath, migrationContent, "utf8");
      console.log(chalk.green(`🧱 Migration created: ${migrationPath}`));
    } else {
      console.log(chalk.yellow("⚠️  Model schema not found — skipping migration generation."));
    }
  } catch (err) {
    console.log(chalk.yellow("⚠️  Could not import or compile model."));
    console.error(err instanceof Error ? err.message : err);
  }
}

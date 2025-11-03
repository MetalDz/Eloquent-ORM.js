// src/cli/commands/makeModel.ts
import fs from "fs";
import path from "path";
import chalk from "chalk";
import { SchemaBuilder } from "../../core/schema/SchemaBuilder";
import { PathMap } from "../utils/PathMap";

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
 * Generates a new model file and optionally its migration.
 *
 * Usage:
 *  eloquent make:model User
 *  eloquent make:model User --test
 */
export async function makeModel(name: string, options: ModelOptions = {}): Promise<void> {
  const isTest = options.test === true;
  const modelName = pascalCase(name);
  const tableName = pluralize(name);

  // 1️⃣ Setup correct directories
  PathMap.ensureDirs();
  const modelsDir = PathMap.models(isTest);
  const migrationsDir = PathMap.migrations(isTest);

  const mode = isTest ? "TEST" : "DEVELOPMENT";

  if (!fs.existsSync(modelsDir)) fs.mkdirSync(modelsDir, { recursive: true });
  if (!fs.existsSync(migrationsDir)) fs.mkdirSync(migrationsDir, { recursive: true });

  console.log(chalk.gray(`📁 Models Path: ${modelsDir}`));
  console.log(chalk.gray(`📁 Migrations Path: ${migrationsDir}`));

  // 2️⃣ Load model template
  const tplPath = path.resolve(process.cwd(), "src/cli/templates/model.tpl");
  if (!fs.existsSync(tplPath)) {
    console.error(chalk.red(`❌ Missing template: ${tplPath}`));
    return;
  }

  const tpl = fs.readFileSync(tplPath, "utf8");

  // 3️⃣ Replace placeholders
  const modelContent = tpl
    .replace(/{{ModelName}}/g, modelName)
    .replace(/{{tableName}}/g, tableName);

  // 4️⃣ Add metadata header
  const headerComment = `/**
 * 🧩 Auto-generated EloquentJS ORM Model
 * Model: ${modelName}
 * Table: ${tableName}
 * Mode: ${mode}
 * Generated at: ${new Date().toISOString()}
 */\n\n`;

  const finalContent = headerComment + modelContent;

  // 5️⃣ Write model file
  const modelFilePath = path.join(modelsDir, `${modelName}.ts`);

  if (fs.existsSync(modelFilePath)) {
    console.log(chalk.yellow(`⚠️  Model already exists: ${modelFilePath}`));
    return;
  }

  fs.writeFileSync(modelFilePath, finalContent, "utf8");
  console.log(chalk.green(`✅ Model created: ${modelFilePath}`));

  // 6️⃣ Generate migration (optional)
  try {
    // Compile syntax check before import
    const { execSync } = await import("child_process");modelFilePath
    execSync(`npx tsc "${modelFilePath}" --noEmit --skipLibCheck`, { stdio: "inherit" });

    // Import directly (ts-node / tsx handles .ts imports)
    const modelModule = await import(path.resolve(modelFilePath));
    const ModelClass = modelModule[modelName];

    if (ModelClass?.schema && ModelClass?.tableName) {
      const createSQL = SchemaBuilder.toCreateSQL(ModelClass.tableName, ModelClass.schema);
      const timestamp = new Date().toISOString().replace(/[-:TZ]/g, "").slice(0, 14);
      const migrationFile = `${timestamp}_create_${ModelClass.tableName}_table.ts`;
      const migrationPath = path.join(migrationsDir, migrationFile);

      const migrationContent = `/**
 * Auto-generated migration for ${modelName}
 * Mode: ${mode}
 * Generated at ${new Date().toISOString()}
 */
export async function up(db: { query(sql: string): Promise<void> }) {
  await db.query(\`${createSQL}\`);
}

export async function down(db: { query(sql: string): Promise<void> }) {
  await db.query('DROP TABLE IF EXISTS \`${ModelClass.tableName}\`;');
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

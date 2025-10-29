import fs from "fs";
import path from "path";
import chalk from "chalk";
import { SchemaBuilder } from "../../core/schema/SchemaBuilder";

function pascalCase(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}
function pluralize(name: string): string {
  return name.toLowerCase().endsWith("s") ? name.toLowerCase() : name.toLowerCase() + "s";
}

/**
 * 🧱 make:model
 * Generates a new model and its migration.
 */
export async function makeModel(name: string): Promise<void> {
  const modelName = pascalCase(name);
  const tableName = pluralize(name);

  // 🔹 Step 1: prepare directories
  const modelDir = path.resolve("src/models");
  const migrationDir = path.resolve("src/migrations");
  if (!fs.existsSync(modelDir)) fs.mkdirSync(modelDir, { recursive: true });
  if (!fs.existsSync(migrationDir)) fs.mkdirSync(migrationDir, { recursive: true });

  // 🔹 Step 2: create model file
  const tplPath = path.resolve("src/cli/templates/model.tpl");
  if (!fs.existsSync(tplPath)) {
    console.error(chalk.red(`❌ Missing template: ${tplPath}`));
    return;
  }

  const tpl = fs.readFileSync(tplPath, "utf8");
  const modelContent = tpl
    .replace(/{{ModelName}}/g, modelName)
    .replace(/{{tableName}}/g, tableName);

  const modelFile = path.join(modelDir, `${modelName}.ts`);
  if (fs.existsSync(modelFile)) {
    console.log(chalk.yellow(`⚠️  Model already exists: ${modelFile}`));
    return;
  }
  fs.writeFileSync(modelFile, modelContent, "utf8");
  console.log(chalk.green(`✅ Model created: ${modelFile}`));

  // 🔹 Step 3: generate migration automatically
  try {
    // dynamic import (transpiled JS)
    const modelModule = await import(`../../../models/${modelName}.js`);
    const ModelClass = modelModule[modelName];
    if (ModelClass?.schema && ModelClass?.tableName) {
      const createSQL = SchemaBuilder.toCreateSQL(ModelClass.tableName, ModelClass.schema);
      const timestamp = new Date().toISOString().replace(/[-:TZ]/g, "").slice(0, 14);
      const migrationFile = `${timestamp}_create_${ModelClass.tableName}_table.ts`;
      const migrationPath = path.join(migrationDir, migrationFile);

      const migrationContent = `
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
  } catch {
    console.log(chalk.yellow("⚠️  Could not import model (TS build required before migration generation)."));
  }
}

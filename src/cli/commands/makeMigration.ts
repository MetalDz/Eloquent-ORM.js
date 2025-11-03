// src/cli/commands/makeMigration.ts
import fs from "fs";
import path from "path";
import chalk from "chalk";
import { SchemaBuilder } from "../../core/schema/SchemaBuilder";
import { PathMap } from "../utils/PathMap";
import { resolveConnectionName } from "../../core/connection/resolveConnectionName";

// ✅ Allow CLI to import .ts model files safely
require("ts-node").register({
  transpileOnly: true,
  compilerOptions: { 
    module: "commonjs",
    target: "es2017",
    downlevelIteration: true,
  },
  cache: false,
});

interface MigrationOptions {
  test?: boolean;
}

function pascalCase(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/**
 * 🧱 make:migration
 * Generates SQL migrations from model schemas via SchemaBuilder.
 *
 * Usage:
 *  eloquent make:migration User
 *  eloquent make:migration all
 *  eloquent make:migration User --test
 */
export async function makeMigration(
  modelName: string,
  options: MigrationOptions = {}
): Promise<void> {
  const isTest = options.test === true;

  // 1️⃣ Setup directories
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

  // 2️⃣ Collect target models
  const modelFiles =
    modelName.toLowerCase() === "all"
      ? fs.readdirSync(modelsDir).filter((f) => f.endsWith(".ts"))
      : [`${pascalCase(modelName)}.ts`];

  if (modelFiles.length === 0) {
    console.warn(chalk.yellow("⚠️  No model files found."));
    return;
  }

  // 3️⃣ Process each model
  for (const file of modelFiles) {
    const modelPath = path.join(modelsDir, file);

    if (!fs.existsSync(modelPath)) {
      console.log(chalk.yellow(`⚠️  Model not found: ${modelPath}`));
      continue;
    }

    try {
      // ✅ Type-check before import
      const { execSync } = await import("child_process");
      execSync(`npx tsc "${modelPath}" --noEmit --skipLibCheck`, { stdio: "inherit" });

      // 🧹 Clear require cache
      const absModelPath = path.resolve(modelPath);
      delete require.cache[require.resolve(absModelPath)];

      // ✅ Dynamic import
      const modelModule = await import(absModelPath);
      const modelClassName = path.basename(file, ".ts");
      const ModelClass = modelModule[modelClassName];

      if (!ModelClass?.schema || !ModelClass?.tableName) {
        console.log(chalk.yellow(`⚠️  No schema found in ${modelClassName} — skipping.`));
        continue;
      }

      // 🧩 Resolve connection & dialect
      const connectionName = resolveConnectionName(ModelClass);
      console.log(chalk.gray(`🔌 Using connection: ${connectionName}`));

      // ✅ Build SQL from schema
      const { mainSQL, extraTables } = SchemaBuilder.toCreateSQL(
        ModelClass.tableName,
        ModelClass.schema,
        connectionName
      );

      const dropSQLs = SchemaBuilder.toDropSQL(
        ModelClass.tableName,
        ModelClass.schema
      );

      // Escape backticks
      const safeUpSQL = mainSQL.replace(/`/g, "\\`");
      const safeExtraTables = extraTables.map((t) => t.replace(/`/g, "\\`"));
      const safeDownSQL = dropSQLs.map((s) => s.replace(/`/g, "\\`"));

      // 🧾 Generate file
      const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
      const migrationFile = `${timestamp}_create_${ModelClass.tableName}_table.ts`;
      const migrationPath = path.join(migrationsDir, migrationFile);

      const migrationContent = `/**
 * 🧩 Auto-generated migration for model: ${modelClassName}
 * Connection: ${connectionName}
 * Mode: ${isTest ? "TEST" : "DEVELOPMENT"}
 * Generated at ${new Date().toISOString()}
 */
export async function up(db: { query(sql: string): Promise<void> }) {
  await db.query(\`${safeUpSQL}\`);
  ${safeExtraTables.map((sql) => `await db.query(\`${sql}\`);`).join("\n  ")}
}

export async function down(db: { query(sql: string): Promise<void> }) {
  ${safeDownSQL.map((sql) => `await db.query(\`${sql}\`);`).join("\n  ")}
}
`;

      // ✍️ Write to file
      fs.writeFileSync(migrationPath, migrationContent, "utf8");
      console.log(chalk.green(`🧱 Migration created: ${migrationPath}`));
    } catch (err) {
      console.error(chalk.red(`❌ Error processing ${file}:`));
      console.error(err instanceof Error ? err.message : err);
    }
  }

  // 4️⃣ Done
  console.log(
    chalk.cyanBright(
      `✅ Migration generation complete in ${isTest ? "TEST" : "DEVELOPMENT"} mode.`
    )
  );
}

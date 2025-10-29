import fs from "fs";
import path from "path";
import chalk from "chalk";
import { writeFileSafe } from "../utils/fileWriter.js";

export async function makeMigration(name: string) {
  const now = new Date();
  const timestamp = now
    .toISOString()
    .replace(/[-:TZ]/g, "")
    .slice(0, 14); // 20251025163500
  const fileName = `${timestamp}_${name}.ts`;

  const match = name.match(/create_(.+)_table/);
  const tableName = match ? match[1] : name;

  const tplPath = path.resolve("src/cli/templates/migration.tpl");

  if (!fs.existsSync(tplPath)) {
    console.error(chalk.red(`❌ Missing migration template: ${tplPath}`));
    return;
  }

  const template = fs.readFileSync(tplPath, "utf8");
  const content = template
    .replace(/{{name}}/g, name)
    .replace(/{{date}}/g, now.toISOString().split("T")[0])
    .replace(/{{tableName}}/g, tableName);

  const targetPath = path.resolve("src/test/database/migrations", fileName);
  const created = writeFileSafe(targetPath, content);

  if (created) {
    console.log(
      chalk.greenBright(
        `🧱 Migration created successfully: ${path.relative(process.cwd(), targetPath)}`
      )
    );
  }
}

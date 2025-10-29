import fs from "fs";
import path from "path";
import chalk from "chalk";

/**
 * 🧩 Utility: writeFileSafe
 * Creates directories recursively and writes the file safely.
 * Shows clear success or warning messages.
 */
export function writeFileSafe(filePath: string, content: string) {
  const dir = path.dirname(filePath);

  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(chalk.cyan(`📁 Created directory: ${dir}`));
    }

    if (fs.existsSync(filePath)) {
      console.log(chalk.yellow(`⚠️  File already exists: ${filePath}`));
      return false;
    }

    fs.writeFileSync(filePath, content, "utf8");
    console.log(chalk.greenBright(`✅ Created: ${filePath}`));
    return true;

  } catch (err) {
    console.error(chalk.red(`❌ Error writing file: ${filePath}`));
    console.error(err);
    return false;
  }
}

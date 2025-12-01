import fs from "fs";
import path from "path";
import chalk from "chalk";

/**
 * 🧩 Utility: writeFileSafe
 * Creates directories recursively and writes the file safely.
 * Returns true if created, false if skipped.
 */
export function writeFileSafe(filePath: string, content: string): boolean {
  const dir = path.dirname(filePath);

  try {
    // Create directories recursively if not existing
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(chalk.cyan(`📁 Created directory: ${dir}`));
    }

    // Skip file if already exists
    if (fs.existsSync(filePath)) {
      console.log(chalk.yellow(`⚠️  File already exists, skipped: ${filePath}`));
      return false;
    }

    // Write file
    fs.writeFileSync(filePath, content, "utf8");
    console.log(chalk.greenBright(`✅ Created file: ${filePath}`));
    return true;

  } catch (err) {
    console.error(chalk.red(`❌ Error writing file: ${filePath}`));
    if (err instanceof Error) {
      console.error(chalk.red(`Reason: ${err.message}`));
    }
    return false;
  }
}

/**
 * 🧩 Utility: overwriteFile
 * Forces file writing (replaces existing file).
 */
export function overwriteFile(filePath: string, content: string): boolean {
  const dir = path.dirname(filePath);

  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(chalk.cyan(`📁 Created directory: ${dir}`));
    }

    fs.writeFileSync(filePath, content, "utf8");
    console.log(chalk.green(`✏️  Overwritten: ${filePath}`));
    return true;

  } catch (err) {
    console.error(chalk.red(`❌ Error overwriting file: ${filePath}`));
    if (err instanceof Error) {
      console.error(chalk.red(`Reason: ${err.message}`));
    }
    return false;
  }
}

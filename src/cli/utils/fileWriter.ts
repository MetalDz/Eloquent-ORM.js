import fs from "fs";
import path from "path";
import chalk from "chalk";

/**
 * Utility: writeFileSafe
 * Creates directories recursively and writes the file safely.
 * Returns true if created, false if skipped.
 */
function ensureParentDirectory(filePath: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(chalk.cyan(`Created directory: ${dir}`));
  }
}

function logFileWriteError(action: "writing" | "overwriting", filePath: string, err: unknown): void {
  console.error(chalk.red(`Error ${action} file: ${filePath}`));
  if (err instanceof Error) {
    console.error(chalk.red(`Reason: ${err.message}`));
  }
}

export function writeFileSafe(filePath: string, content: string): boolean {
  try {
    ensureParentDirectory(filePath);

    if (fs.existsSync(filePath)) {
      console.log(chalk.yellow(`File already exists, skipped: ${filePath}`));
      return false;
    }

    fs.writeFileSync(filePath, content, "utf8");
    console.log(chalk.greenBright(`Created file: ${filePath}`));
    return true;
  } catch (err) {
    logFileWriteError("writing", filePath, err);
    return false;
  }
}

/**
 * Utility: overwriteFile
 * Forces file writing (replaces existing file).
 */
export function overwriteFile(filePath: string, content: string): boolean {
  try {
    ensureParentDirectory(filePath);
    fs.writeFileSync(filePath, content, "utf8");
    console.log(chalk.green(`Overwritten: ${filePath}`));
    return true;
  } catch (err) {
    logFileWriteError("overwriting", filePath, err);
    return false;
  }
}

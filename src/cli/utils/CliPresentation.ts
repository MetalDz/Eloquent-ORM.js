import chalk from "chalk";
import figlet from "figlet";

export function printCliBanner(
  writeLine: (...args: unknown[]) => void = console.log.bind(console),
): void {
  writeLine(chalk.cyan(figlet.textSync("Eloquent ORM JS", { horizontalLayout: "fitted" })));
  writeLine(chalk.gray("  Developer CLI for Eloquent ORM JS (v1.0)\n"));
}

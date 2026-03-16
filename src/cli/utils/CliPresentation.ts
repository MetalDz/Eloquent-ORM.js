import chalk from "chalk";
import figlet from "figlet";

export function printCliBanner(
  writeLine: (...args: unknown[]) => void = console.log.bind(console),
): void {
  writeLine(
    chalk.cyan(figlet.textSync("EloquentJS", { horizontalLayout: "fitted" })),
  );
  writeLine(chalk.gray("Developer CLI for EloquentJS ORM (v1.0)\n"));
  writeLine(
    chalk.green("Ready to manage your EloquentJS models and database!\n"),
  );
}

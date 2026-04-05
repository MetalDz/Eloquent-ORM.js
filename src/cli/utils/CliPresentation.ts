import chalk from "chalk";
import figlet from "figlet";
import { resolveCliVersion } from "./CliVersion.js";

export function printCliBanner(
  writeLine: (...args: unknown[]) => void = console.log.bind(console),
): void {
  const cliVersion = resolveCliVersion();
  writeLine(
    chalk.cyan(figlet.textSync("Eloquent ORM JS", { horizontalLayout: "fitted" })),
  );
  writeLine(chalk.gray(`  Developer CLI for Eloquent ORM JS (v${cliVersion})\n`));
}

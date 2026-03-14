import type { StorageKind } from "./ArtifactStorage";

type CliStorageKind = Exclude<StorageKind, "unknown" | "mixed">;

export type CliBootstrapEnv = {
  [key: string]: string | undefined;
  DB_CONNECTION?: string;
  DB_TEST_CONNECTION?: string;
};

const FACTORY_AUTOLOAD_COMMANDS = new Set([
  "db:seed",
  "db:seed:fresh",
  "factory:status",
  "demo:scenario",
  "make:scenario",
]);

export function isCliTestArgv(argv: string[]): boolean {
  return argv.includes("--test");
}

export function applyCliTestConnectionOverride(
  argv: string[],
  env: CliBootstrapEnv
): void {
  if (!isCliTestArgv(argv)) {
    return;
  }

  env.DB_CONNECTION = env.DB_TEST_CONNECTION || "mysql_test";
}

export function resolveCliRequestedStorageKind(
  argv: string[],
  env: CliBootstrapEnv
): CliStorageKind | undefined {
  const hasMongo = argv.includes("--mongo");
  const hasSql =
    argv.includes("--mysql") ||
    argv.includes("--pg") ||
    argv.includes("--sqlite") ||
    argv.includes("--all-connections");

  if (hasMongo && !hasSql) {
    return "mongo";
  }

  if (hasSql && !hasMongo) {
    return "sql";
  }

  const defaultConnection = isCliTestArgv(argv)
    ? env.DB_TEST_CONNECTION || env.DB_CONNECTION
    : env.DB_CONNECTION;

  if (defaultConnection === "mongo" || defaultConnection === "mongo_test") {
    return "mongo";
  }

  if (defaultConnection) {
    return "sql";
  }

  return undefined;
}

export function shouldAutoLoadFactoriesForCli(argv: string[]): boolean {
  const command = argv[2] ?? "";
  for (const supportedCommand of FACTORY_AUTOLOAD_COMMANDS) {
    if (command.startsWith(supportedCommand)) {
      return true;
    }
  }
  return false;
}

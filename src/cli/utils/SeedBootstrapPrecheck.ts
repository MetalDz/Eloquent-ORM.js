import fs from "fs";
import chalk from "chalk";
import {
  closeAllConnections,
  getConnection,
  getAdapter,
  type ConnectionName,
} from "../../core/connection/ConnectionFactory";
import { resolveConnectionName } from "../../core/connection/resolveConnectionName";
import { dbConfig } from "../../config/database";
import { PathMap } from "./PathMap";

export type SeedBootstrapPrecheckOptions = {
  test?: boolean;
  connectionNames?: ConnectionName[];
};

export type SeedBootstrapConnectionReport = {
  connectionName: ConnectionName;
  migrationsDir: string;
  clean: boolean;
  reasons: string[];
  pendingMigrations: string[];
};

export type SeedBootstrapPrecheckReport = {
  clean: boolean;
  checks: SeedBootstrapConnectionReport[];
};

function listMigrationFiles(migrationsDir: string): string[] {
  return fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".ts") || file.endsWith(".js"))
    .sort();
}

async function inspectConnection(
  connectionName: ConnectionName,
  isTest: boolean
): Promise<SeedBootstrapConnectionReport> {
  const migrationsDir = PathMap.migrations(isTest, connectionName);
  const reasons: string[] = [];
  let pendingMigrations: string[] = [];
  const driver = dbConfig.connections[connectionName]?.driver;

  if (driver === "mongo") {
    try {
      await getConnection(connectionName);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      reasons.push(`Unable to connect to MongoDB: ${message}`);
    }

    return {
      connectionName,
      migrationsDir,
      clean: reasons.length === 0,
      reasons,
      pendingMigrations,
    };
  }

  if (!fs.existsSync(migrationsDir)) {
    reasons.push(`Missing migrations directory: ${migrationsDir}`);
    return {
      connectionName,
      migrationsDir,
      clean: false,
      reasons,
      pendingMigrations,
    };
  }

  const files = listMigrationFiles(migrationsDir);
  if (files.length === 0) {
    reasons.push("No migration files found on disk.");
  }

  if (driver !== "mysql" && driver !== "pg" && driver !== "sqlite") {
    reasons.push(`Connection "${connectionName}" is not a SQL driver.`);
    return {
      connectionName,
      migrationsDir,
      clean: false,
      reasons,
      pendingMigrations,
    };
  }

  try {
    const db = await getAdapter(connectionName);
    const rows = await db.query<{ name: string }>(
      "SELECT name FROM migrations ORDER BY id"
    );
    const appliedNames = new Set(rows.map((row) => row.name));

    if (appliedNames.size === 0) {
      reasons.push("No applied migration history found.");
    }

    pendingMigrations = files.filter((file) => !appliedNames.has(file));
    if (pendingMigrations.length > 0) {
      reasons.push(
        `Pending migrations detected (${pendingMigrations.length}).`
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    reasons.push(`Unable to read migrations table: ${message}`);
  }

  return {
    connectionName,
    migrationsDir,
    clean: reasons.length === 0,
    reasons,
    pendingMigrations,
  };
}

export async function runSeedBootstrapPrecheck(
  options: SeedBootstrapPrecheckOptions = {}
): Promise<SeedBootstrapPrecheckReport> {
  const isTest = !!options.test;
  const connectionNames =
    options.connectionNames && options.connectionNames.length > 0
      ? options.connectionNames
      : [resolveConnectionName(undefined, { test: isTest })];

  const checks: SeedBootstrapConnectionReport[] = [];

  try {
    for (const connectionName of connectionNames) {
      checks.push(await inspectConnection(connectionName, isTest));
    }
  } finally {
    await closeAllConnections();
  }

  return {
    clean: checks.every((check) => check.clean),
    checks,
  };
}

export function printSeedBootstrapPrecheck(
  report: SeedBootstrapPrecheckReport
): void {
  console.log(chalk.cyan("Seed bootstrap precheck results:"));

  for (const check of report.checks) {
    if (check.clean) {
      console.log(
        chalk.green(
          `  [${check.connectionName}] clean (no pending migrations, history present).`
        )
      );
      continue;
    }

    console.log(chalk.red(`  [${check.connectionName}] not clean.`));
    for (const reason of check.reasons) {
      console.log(chalk.red(`    - ${reason}`));
    }
    if (check.pendingMigrations.length > 0) {
      console.log(
        chalk.yellow(
          `    Pending files: ${check.pendingMigrations.join(", ")}`
        )
      );
    }
  }
}

export async function assertSeedBootstrapPrecheck(
  options: SeedBootstrapPrecheckOptions = {}
): Promise<boolean> {
  const report = await runSeedBootstrapPrecheck(options);
  printSeedBootstrapPrecheck(report);
  if (!report.clean) {
    process.exitCode = 1;
  }
  return report.clean;
}


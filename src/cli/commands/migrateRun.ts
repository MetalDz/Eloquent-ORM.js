import fs from "fs";
import path from "path";
import chalk from "chalk";
import {
  getAdapter,
  getConnection,
  closeAllConnections,
  type ConnectionName,
} from "../../core/connection/ConnectionFactory";
import { PathMap } from "../utils/PathMap";
import { dbConfig } from "../../config/database";
import { resolveConnectionName } from "../../core/connection/resolveConnectionName";
import {
  acquireMigrationLock,
  ensureMigrationTables,
  readLastBatch,
  recordAppliedMigration,
  releaseMigrationLock,
  validateMigrationHistory,
  computeMigrationChecksum,
} from "../utils/migrations/MigrationTracker";
import {
  acquireMigrationLock as acquireMongoMigrationLock,
  ensureMigrationCollection,
  readLastBatch as readLastMongoBatch,
  recordAppliedMigration as recordAppliedMongoMigration,
  releaseMigrationLock as releaseMongoMigrationLock,
  validateMigrationHistory as validateMongoMigrationHistory,
} from "../utils/migrations/MongoMigrationTracker";
import { loadModule } from "../utils/typescript/tsRuntime";
import {
  resolveSqlConnectionNames,
  type SqlConnectionFlags,
} from "../utils/resolveSqlConnectionFlags";
import { appendAuditEvent } from "../utils/AuditTrail";
import type { Db } from "mongodb";

export type MigrateRunOptions = {
  connectionNames?: ConnectionName[];
  auditCommand?: string;
};

export type MigrationConnectionFlags = SqlConnectionFlags;
export const resolveMigrationConnectionNames = resolveSqlConnectionNames;

type MongoMigrationContext = {
  ensureCollection: (name: string) => Promise<void>;
  dropCollection: (name: string) => Promise<void>;
  createIndex: (
    collectionName: string,
    keys: Record<string, 1 | -1>,
    options?: Record<string, unknown>
  ) => Promise<void>;
  dropIndex: (collectionName: string, indexName: string) => Promise<void>;
  collection: (name: string) => ReturnType<Db["collection"]>;
  db: Db;
  query: (sql: string) => Promise<void>;
};

function createMongoMigrationContext(
  db: Db,
  dryRun: boolean,
  operations: { count: number }
): MongoMigrationContext {
  const collectionExists = async (name: string): Promise<boolean> => {
    const rows = await db
      .listCollections({ name }, { nameOnly: true })
      .toArray();
    return rows.length > 0;
  };

  return {
    ensureCollection: async (name: string) => {
      operations.count++;
      if (dryRun) {
        console.log(chalk.gray(`[DRY-RUN] Would ensure collection "${name}"`));
        return;
      }
      if (await collectionExists(name)) return;
      await db.createCollection(name);
    },
    dropCollection: async (name: string) => {
      operations.count++;
      if (dryRun) {
        console.log(chalk.gray(`[DRY-RUN] Would drop collection "${name}"`));
        return;
      }
      if (!(await collectionExists(name))) return;
      await db.collection(name).drop();
    },
    createIndex: async (collectionName, keys, options) => {
      operations.count++;
      if (dryRun) {
        console.log(
          chalk.gray(
            `[DRY-RUN] Would create index on "${collectionName}": ${JSON.stringify({
              keys,
              options: options ?? {},
            })}`
          )
        );
        return;
      }
      await db.collection(collectionName).createIndex(keys, options ?? {});
    },
    dropIndex: async (collectionName, indexName) => {
      operations.count++;
      if (dryRun) {
        console.log(
          chalk.gray(
            `[DRY-RUN] Would drop index "${indexName}" on "${collectionName}"`
          )
        );
        return;
      }
      await db.collection(collectionName).dropIndex(indexName);
    },
    collection: (name: string) => db.collection(name),
    db,
    query: async (sql: string) => {
      if (!sql || sql.trim() === "") return;
      throw new Error(
        "Mongo migrations do not support SQL query() calls. Use ensureCollection/createIndex/dropCollection or collection()."
      );
    },
  };
}

async function getMongoConnection(connectionName: ConnectionName): Promise<Db> {
  if (typeof getConnection === "function") {
    return (await getConnection(connectionName)) as Db;
  }

  // Test harness compatibility: some command-level mocks only provide getAdapter.
  return (await (getAdapter as unknown as (name: ConnectionName) => Promise<unknown>)(
    connectionName
  )) as Db;
}

async function runMigrationsForConnection(
  connectionName: ConnectionName,
  isTest: boolean,
  modelName: string | undefined,
  dryRun: boolean
): Promise<boolean> {
  console.log(
    chalk.cyan(
      `\nRunning migrations in ${isTest ? "TEST" : "DEVELOPMENT"} mode on "${connectionName}"${
        modelName ? ` for model "${modelName}"` : ""
      }...\n`
    )
  );

  const migrationsDir = PathMap.migrations(isTest, connectionName);
  if (!fs.existsSync(migrationsDir)) {
    console.log(chalk.yellow(`No migrations directory found for ${connectionName}.`));
    return true;
  }
  if (process.env.ELOQUENT_DEBUG === "true") {
    console.log("[migrate:run] connectionName", connectionName);
  }

  const driver = dbConfig.connections[connectionName]?.driver ?? connectionName;
  if (driver === "mongo") {
    const db = await getMongoConnection(connectionName);
    console.log(chalk.gray(`Connected to ${connectionName}.`));
    const lockOwner = `migrate:run:${connectionName}:${process.pid}:${Date.now()}`;
    let completedWithoutError = false;

    await ensureMigrationCollection(db);
    if (!dryRun) {
      await acquireMongoMigrationLock(db, lockOwner);
    }

    try {
      let files = fs
        .readdirSync(migrationsDir)
        .filter((f) => f.endsWith(".ts") || f.endsWith(".js"))
        .sort();

      if (modelName) {
        const lower = modelName.toLowerCase();
        files = files.filter((f) => f.includes(lower));
        if (files.length === 0) {
          console.log(chalk.yellow(`No migrations found for model: ${modelName}`));
          completedWithoutError = true;
          return true;
        }
      }

      const appliedRows = await validateMongoMigrationHistory(db, migrationsDir);
      const executed = appliedRows.map((row) => row.name);
      const pending = files.filter((f) => !executed.includes(f));

      if (pending.length === 0) {
        console.log(chalk.yellow("\nNo new migrations to run."));
        completedWithoutError = true;
        return true;
      }

      console.log(chalk.gray(`Pending migrations: ${pending.length}`));
      const lastBatch = await readLastMongoBatch(db);
      const newBatch = lastBatch + 1;
      let applied = 0;

      for (const file of pending) {
        const filePath = path.join(migrationsDir, file);
        const migrationModule = loadModule(path.resolve(filePath)) as {
          up?: (db: MongoMigrationContext) => Promise<void>;
        };

        if (typeof migrationModule.up !== "function") {
          console.log(chalk.red(`Invalid migration: ${file}`));
          continue;
        }

        console.log(chalk.gray(`Applying: ${file}`));
        const operations = { count: 0 };
        const context = createMongoMigrationContext(db, dryRun, operations);

        await migrationModule.up(context);

        // Keep parity with SQL behavior: skip explicit no-op migrations when no
        // migration helper operation was used.
        if (operations.count === 0) {
          console.log(chalk.gray(`Skipping empty migration: ${file}`));
          continue;
        }

        if (!dryRun) {
          await recordAppliedMongoMigration(
            db,
            file,
            newBatch,
            computeMigrationChecksum(filePath)
          );
        }

        console.log(chalk.green(`Migration applied: ${file}`));
        applied++;
      }

      console.log(chalk.greenBright(`\n${applied} migration(s) applied successfully.`));
      completedWithoutError = true;
      return true;
    } catch (err) {
      console.error(chalk.red("\nError during migration execution:"));
      console.error(err);
      console.warn(chalk.yellow("Rolling back partial changes..."));
      return false;
    } finally {
      if (!dryRun) {
        await releaseMongoMigrationLock(db, lockOwner);
      }
      await closeAllConnections();
      console.log(chalk.gray("\nAll database connections closed.\n"));
    }
  }

  if (!["mysql", "pg", "sqlite"].includes(driver)) {
    console.warn(
      chalk.yellow(
        `Skipping migrations: "${connectionName}" has unsupported driver "${driver}".`
      )
    );
    return true;
  }

  if (process.env.ELOQUENT_DEBUG === "true") {
    console.log("[migrate:run] before getAdapter");
  }
  const db = await getAdapter(connectionName);
  if (process.env.ELOQUENT_DEBUG === "true") {
    console.log("[migrate:run] after getAdapter");
  }
  console.log(chalk.gray(`Connected to ${connectionName}.`));
  const lockOwner = `migrate:run:${connectionName}:${process.pid}:${Date.now()}`;
  let completedWithoutError = false;

  await ensureMigrationTables(db);
  if (!dryRun) {
    await acquireMigrationLock(db, lockOwner);
  }

  try {
    let files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".ts") || f.endsWith(".js"))
      .sort();

    if (modelName) {
      const lower = modelName.toLowerCase();
      files = files.filter((f) => f.includes(lower));
      if (files.length === 0) {
        console.log(chalk.yellow(`No migrations found for model: ${modelName}`));
        completedWithoutError = true;
        return true;
      }
    }

    const appliedRows = await validateMigrationHistory(db, migrationsDir);
    const executed = appliedRows.map((row) => row.name);

    const pending = files.filter((f) => !executed.includes(f));
    if (pending.length === 0) {
      console.log(chalk.yellow("\nNo new migrations to run."));
      completedWithoutError = true;
      return true;
    }

    console.log(chalk.gray(`Pending migrations: ${pending.length}`));

    const lastBatch = await readLastBatch(db);
    const newBatch = lastBatch + 1;
    let applied = 0;

    for (const file of pending) {
      const filePath = path.join(migrationsDir, file);
      const migrationModule = loadModule(path.resolve(filePath)) as {
        up?: (db: { query(sql: string, params?: unknown[]): Promise<void> }) => Promise<void>;
      };

      if (typeof migrationModule.up !== "function") {
        console.log(chalk.red(`Invalid migration: ${file}`));
        continue;
      }

      console.log(chalk.gray(`Applying: ${file}`));
      let executedStatements = 0;
      const runQuery = async (sql: string, params: unknown[] = []): Promise<void> => {
        if (!sql || sql.trim() === "") return;
        executedStatements++;
        if (dryRun) {
          console.log(chalk.gray(`[DRY-RUN] Would execute:\n${sql}\n`));
          return;
        }
        await db.execute(sql, params);
      };

      await migrationModule.up({ query: runQuery });

      if (executedStatements === 0) {
        console.log(chalk.gray(`Skipping empty migration: ${file}`));
        continue;
      }

      if (!dryRun) {
        await recordAppliedMigration(
          db,
          file,
          newBatch,
          computeMigrationChecksum(filePath)
        );
      }

      console.log(chalk.green(`Migration applied: ${file}`));
      applied++;
    }

    console.log(chalk.greenBright(`\n${applied} migration(s) applied successfully.`));
    completedWithoutError = true;
    return true;
  } catch (err) {
    console.error(chalk.red("\nError during migration execution:"));
    console.error(err);
    console.warn(chalk.yellow("Rolling back partial changes..."));
    return false;
  } finally {
    if (!dryRun) {
      await releaseMigrationLock(db, lockOwner, { success: completedWithoutError });
    }
    await closeAllConnections();
    console.log(chalk.gray("\nAll database connections closed.\n"));
  }
}

export async function migrateRun(
  isTest: boolean = false,
  modelName?: string,
  dryRun: boolean = false,
  exitOnFinish: boolean = true,
  options: MigrateRunOptions = {}
): Promise<void> {
  const exitCli = (): void => {
    if (exitOnFinish && process.env.ELOQUENT_CLI === "true") {
      setImmediate(() => process.exit(process.exitCode ?? 0));
    }
  };

  if (process.env.ELOQUENT_DEBUG === "true") {
    console.log("[migrate:run] start", {
      isTest,
      modelName,
      dryRun,
      connectionNames: options.connectionNames,
    });
  }

  const connectionNames =
    options.connectionNames && options.connectionNames.length > 0
      ? options.connectionNames
      : [resolveConnectionName(undefined, { test: isTest })];

  let hadFailure = false;
  const auditCommand = options.auditCommand ?? "migrate:run";
  for (const connectionName of connectionNames) {
    const success = await runMigrationsForConnection(
      connectionName,
      isTest,
      modelName,
      dryRun
    );
    appendAuditEvent({
      command: auditCommand,
      connectionName,
      test: isTest,
      result: success ? "success" : "failure",
      metadata: {
        modelName: modelName ?? null,
        dryRun,
      },
    });
    if (!success) {
      hadFailure = true;
    }
  }

  if (hadFailure) {
    process.exitCode = 1;
  }

  exitCli();
}

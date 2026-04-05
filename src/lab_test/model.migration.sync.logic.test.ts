import fs from "fs";
import os from "os";
import path from "path";
import {
  appModelsDir,
  appRootDir,
  bootstrapAppFixtures,
  connectionMigrationsDir,
  ensureDir,
  resetSqliteDatabase,
} from "./support/cli.integration.harness.js";

jest.mock("chalk", () => {
  const passthrough = (value: unknown): string => String(value);
  const identity = new Proxy(passthrough, {
    get: () => passthrough,
    apply: (_target, _thisArg, args) => String(args[0] ?? ""),
  });
  return { __esModule: true, default: identity };
});

const { makeMigration } = require("../../dist/cli/commands/makeMigration.js") as {
  makeMigration: (
    modelName: string,
    options?: {
      test?: boolean;
      exit?: boolean;
      pivotSeparate?: boolean;
      connectionName?: string;
    }
  ) => Promise<void>;
};

const { migrateRun } = require("../../dist/cli/commands/migrateRun.js") as {
  migrateRun: (
    isTest?: boolean,
    modelName?: string,
    dryRun?: boolean,
    exitOnFinish?: boolean,
    options?: { connectionNames?: string[] }
  ) => Promise<void>;
};

function fixtureModelTableNames(): string[] {
  return fs
    .readdirSync(appModelsDir)
    .filter((file) => file.endsWith(".ts"))
    .map((file) => {
      const content = fs.readFileSync(path.join(appModelsDir, file), "utf8");
      const tableNameMatch = content.match(/static tableName = "([^"]+)"/);
      if (!tableNameMatch) {
        throw new Error(`Missing static tableName in fixture model: ${file}`);
      }
      return tableNameMatch[1];
    })
    .sort();
}

function migrationFiles(dirPath: string): string[] {
  return fs
    .readdirSync(dirPath)
    .filter((file) => file.endsWith(".ts") || file.endsWith(".js"))
    .sort();
}

describe("Model/migration sync guard", () => {
  let appRootBackupDir: string | null = null;
  let originalDbConnection: string | undefined;
  let originalSqlitePath: string | undefined;

  beforeAll(() => {
    const appBackupRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "eloquent-model-migration-sync-")
    );
    appRootBackupDir = path.join(appBackupRoot, "app");
    if (fs.existsSync(appRootDir)) {
      fs.cpSync(appRootDir, appRootBackupDir, { recursive: true });
    }

    fs.rmSync(appRootDir, { recursive: true, force: true });
    ensureDir(appRootDir);
    bootstrapAppFixtures();

    originalDbConnection = process.env.DB_CONNECTION;
    originalSqlitePath = process.env.SQLITE_PATH;
    process.env.DB_CONNECTION = "sqlite";
    process.env.SQLITE_PATH = "./cli.integration.app.sqlite";
  });

  afterAll(() => {
    resetSqliteDatabase("./cli.integration.app.sqlite");

    if (originalDbConnection === undefined) {
      delete process.env.DB_CONNECTION;
    } else {
      process.env.DB_CONNECTION = originalDbConnection;
    }

    if (originalSqlitePath === undefined) {
      delete process.env.SQLITE_PATH;
    } else {
      process.env.SQLITE_PATH = originalSqlitePath;
    }

    if (!appRootBackupDir) return;

    fs.rmSync(appRootDir, { recursive: true, force: true });
    if (fs.existsSync(appRootBackupDir)) {
      fs.cpSync(appRootBackupDir, appRootDir, { recursive: true });
      fs.rmSync(path.dirname(appRootBackupDir), { recursive: true, force: true });
    }
  });

  test("fixture app sqlite migrations stay aligned with the generated model set", async () => {
    const sqliteMigrationsDir = connectionMigrationsDir(false, "sqlite");
    fs.rmSync(sqliteMigrationsDir, { recursive: true, force: true });
    resetSqliteDatabase("./cli.integration.app.sqlite");

    const firstLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    try {
      await makeMigration("all", {
        connectionName: "sqlite",
        exit: false,
      });
    } finally {
      firstLogSpy.mockRestore();
    }

    const tableNames = fixtureModelTableNames();
    const generatedFiles = migrationFiles(sqliteMigrationsDir);

    expect(generatedFiles.some((file) => file.includes("create_pivot_table"))).toBe(false);

    for (const tableName of tableNames) {
      const matchingFiles = generatedFiles.filter((file) =>
        file.includes(`create_${tableName}_table`)
      );
      expect(matchingFiles).toHaveLength(1);

      const migrationContent = fs.readFileSync(
        path.join(sqliteMigrationsDir, matchingFiles[0]),
        "utf8"
      );
      expect(migrationContent).toContain(`CREATE TABLE IF NOT EXISTS "${tableName}"`);
      expect(migrationContent).toContain(`DROP TABLE IF EXISTS "${tableName}";`);
    }

    const migrateLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    try {
      await migrateRun(false, undefined, false, false, {
        connectionNames: ["sqlite"],
      });
    } finally {
      migrateLogSpy.mockRestore();
    }

    const rerunLogs: string[] = [];
    const rerunLogSpy = jest.spyOn(console, "log").mockImplementation((message?: unknown) => {
      rerunLogs.push(String(message ?? ""));
    });
    try {
      await makeMigration("all", {
        connectionName: "sqlite",
        exit: false,
      });
    } finally {
      rerunLogSpy.mockRestore();
    }

    const rerunFiles = migrationFiles(sqliteMigrationsDir);
    expect(rerunFiles).toEqual(generatedFiles);
    for (const tableName of tableNames) {
      expect(rerunLogs.join("\n")).toContain(`INFO: No schema differences for '${tableName}'.`);
    }
  });
});

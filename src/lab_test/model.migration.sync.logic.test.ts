import fs from "fs";
import path from "path";

jest.mock("chalk", () => {
  const passthrough = (value: unknown): string => String(value);
  const identity = new Proxy(passthrough, {
    get: () => passthrough,
    apply: (_target, _thisArg, args) => String(args[0] ?? ""),
  });
  return { __esModule: true, default: identity };
});

const { PathMap } = require("../../dist/cli/utils/PathMap.js") as {
  PathMap: {
    ensureDirs(): void;
    models(isTest?: boolean): string;
    appMigrations(connectionName?: string): string;
    migrations(isTest?: boolean, connectionName?: string): string;
  };
};

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

const repoRoot = process.cwd();
const fixtureRootDir = path.resolve(repoRoot, "src", "__model_migration_sync__");
const fixtureModelsDir = path.join(fixtureRootDir, "models");
const fixtureMigrationsRoot = path.join(fixtureRootDir, "database", "migrations");
const sqliteMigrationsDir = path.join(fixtureMigrationsRoot, "sqlite");
const sqliteDatabasePath = path.join(fixtureRootDir, "cli.integration.app.sqlite");

function ensureDir(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true });
}

function resetSqliteDatabase(filePath: string): void {
  if (fs.existsSync(filePath)) {
    fs.rmSync(filePath, { force: true });
  }
}

function writeFixture(filePath: string, content: string): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, "utf8");
}

function bootstrapFixtureModels(): void {
  writeFixture(
    path.join(fixtureModelsDir, "User.ts"),
    `import { SqlModel } from "../../core/model/BaseModel.js";
import { column, relation } from "../../core/schema/SchemaBlueprint.js";

type UserAttrs = {
  id?: number | null;
  name?: string | null;
  created_at?: string | Date | null;
  updated_at?: string | Date | null;
};

export class User extends SqlModel<UserAttrs> {
  static tableName = "users";
  static connectionName = process.env.DB_CONNECTION ?? "sqlite";
  static schema = {
    id: column("increments", undefined, { primary: true }),
    name: column("string", 255, { notNull: true }),
    created_at: column("timestamp"),
    updated_at: column("timestamp"),
    posts: relation("hasMany", "Post", { foreignKey: "user_id" }),
    favorites: relation("belongsToMany", "Post"),
  };

  constructor() {
    super("users", process.env.DB_CONNECTION ?? "sqlite");
  }
}
`
  );

  writeFixture(
    path.join(fixtureModelsDir, "Post.ts"),
    `import { SqlModel } from "../../core/model/BaseModel.js";
import { column, relation } from "../../core/schema/SchemaBlueprint.js";

type PostAttrs = {
  id?: number | null;
  name?: string | null;
  user_id?: number | null;
  created_at?: string | Date | null;
  updated_at?: string | Date | null;
};

export class Post extends SqlModel<PostAttrs> {
  static tableName = "posts";
  static connectionName = process.env.DB_CONNECTION ?? "sqlite";
  static schema = {
    id: column("increments", undefined, { primary: true }),
    name: column("string", 255, { notNull: true }),
    user_id: column("int", undefined, { notNull: true }),
    created_at: column("timestamp"),
    updated_at: column("timestamp"),
    author: relation("belongsTo", "User", { foreignKey: "user_id" }),
    favoritedBy: relation("belongsToMany", "User"),
  };

  constructor() {
    super("posts", process.env.DB_CONNECTION ?? "sqlite");
  }
}
`
  );
}

function fixtureModelTableNames(): string[] {
  return fs
    .readdirSync(fixtureModelsDir)
    .filter((file) => file.endsWith(".ts"))
    .map((file) => {
      const content = fs.readFileSync(path.join(fixtureModelsDir, file), "utf8");
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
  let originalDbConnection: string | undefined;
  let originalSqlitePath: string | undefined;

  beforeAll(() => {
    originalDbConnection = process.env.DB_CONNECTION;
    originalSqlitePath = process.env.SQLITE_PATH;
    process.env.DB_CONNECTION = "sqlite";
    process.env.SQLITE_PATH = sqliteDatabasePath;
  });

  beforeEach(() => {
    jest.restoreAllMocks();

    fs.rmSync(fixtureRootDir, { recursive: true, force: true });
    ensureDir(fixtureModelsDir);
    ensureDir(sqliteMigrationsDir);
    bootstrapFixtureModels();
    resetSqliteDatabase(sqliteDatabasePath);

    jest.spyOn(PathMap, "ensureDirs").mockImplementation(() => {
      ensureDir(fixtureModelsDir);
      ensureDir(sqliteMigrationsDir);
    });
    jest.spyOn(PathMap, "models").mockImplementation((isTest = false) =>
      isTest ? path.resolve(repoRoot, "src/test/database/models") : fixtureModelsDir
    );
    jest.spyOn(PathMap, "appMigrations").mockImplementation((connectionName?: string) =>
      connectionName ? path.join(fixtureMigrationsRoot, connectionName) : fixtureMigrationsRoot
    );
    jest.spyOn(PathMap, "migrations").mockImplementation((isTest = false, connectionName?: string) => {
      if (isTest) {
        return path.resolve(repoRoot, "src/test/database/migrations", connectionName ?? "");
      }
      return connectionName ? path.join(fixtureMigrationsRoot, connectionName) : fixtureMigrationsRoot;
    });
  });

  afterAll(() => {
    resetSqliteDatabase(sqliteDatabasePath);
    fs.rmSync(fixtureRootDir, { recursive: true, force: true });

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
  });

  test("fixture app sqlite migrations stay aligned with the generated model set", async () => {
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

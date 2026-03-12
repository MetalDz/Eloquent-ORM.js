import fs from "fs";
import os from "os";
import path from "path";
import { makeScenario } from "../cli/commands/makeScenario";
import { resolveSeederStorageKindFromFile } from "../cli/utils/ArtifactStorage";
import { PathMap } from "../cli/utils/PathMap";

jest.mock("chalk", () => ({
  __esModule: true,
  default: new Proxy(
    (value: unknown): string => String(value ?? ""),
    {
      get: () => (value: unknown): string => String(value ?? ""),
      apply: (_target, _thisArg, args: unknown[]) => String(args[0] ?? ""),
    }
  ),
}));

jest.mock("../cli/commands/makeFactory", () => ({
  makeFactory: jest.fn(async () => undefined),
}));

jest.mock("../cli/commands/makeMigration", () => ({
  makeMigration: jest.fn(async () => undefined),
}));

jest.mock("../cli/commands/makeController", () => ({
  makeController: jest.fn(async () => undefined),
}));

jest.mock("../cli/commands/makeService", () => ({
  makeService: jest.fn(async () => undefined),
}));

jest.mock("../cli/commands/migrateFresh", () => ({
  migrateFresh: jest.fn(async () => undefined),
}));

jest.mock("../cli/commands/dbSeed", () => ({
  dbSeed: jest.fn(async () => undefined),
}));

jest.mock("../cli/utils/resolveConnectionFlags", () => ({
  resolveConnectionNamesFromFlags: jest.fn(() => ["mongo_test"]),
}));

describe("NoSQL phase 17 scenario artifact cache reset", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.spyOn(console, "log").mockImplementation(() => undefined);
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
    jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("make:scenario --force clears stale SQL scenario modules before mongo storage detection", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-scenario-cache-reset-"));
    const modelsDir = path.join(root, "models");
    const factoriesDir = path.join(root, "factories");
    const seedsDir = path.join(root, "seeds");
    const migrationsDir = path.join(root, "migrations");
    fs.mkdirSync(modelsDir, { recursive: true });
    fs.mkdirSync(factoriesDir, { recursive: true });
    fs.mkdirSync(seedsDir, { recursive: true });
    fs.mkdirSync(migrationsDir, { recursive: true });

    const baseModelImport = path
      .relative(modelsDir, path.resolve(process.cwd(), "src/core/model/BaseModel"))
      .replace(/\\/g, "/");
    const schemaImport = path
      .relative(modelsDir, path.resolve(process.cwd(), "src/core/schema/SchemaBlueprint"))
      .replace(/\\/g, "/");

    const oldSqlModel = (name: string) => `import { SqlModel } from "${baseModelImport}";
import { column, relation } from "${schemaImport}";
export class ${name} extends SqlModel<Record<string, unknown>> {
  static tableName = "${name.toLowerCase()}s";
  static connectionName = "sqlite_test";
  static schema = {
    id: column("increments", undefined, { primary: true }),
    ${name === "User" ? 'posts: relation("hasMany", "Post", { foreignKey: "user_id" }),' : ""}
    ${name === "Post" ? 'author: relation("belongsTo", "User", { foreignKey: "user_id" }),' : ""}
  };
  constructor() { super("${name.toLowerCase()}s", "sqlite_test"); }
}
`;

    fs.writeFileSync(path.join(modelsDir, "User.ts"), oldSqlModel("User"), "utf8");
    fs.writeFileSync(path.join(modelsDir, "Post.ts"), oldSqlModel("Post"), "utf8");
    fs.writeFileSync(path.join(modelsDir, "Comment.ts"), oldSqlModel("Comment"), "utf8");
    fs.writeFileSync(
      path.join(factoriesDir, "UserFactory.ts"),
      `import { User } from "../models/User";
export class UserFactory { model = User; definition() { return {}; } }
`,
      "utf8"
    );
    fs.writeFileSync(
      path.join(factoriesDir, "PostFactory.ts"),
      `import { Post } from "../models/Post";
export class PostFactory { model = Post; definition() { return {}; } }
`,
      "utf8"
    );
    fs.writeFileSync(
      path.join(factoriesDir, "CommentFactory.ts"),
      `import { Comment } from "../models/Comment";
export class CommentFactory { model = Comment; definition() { return {}; } }
`,
      "utf8"
    );
    jest.spyOn(PathMap, "ensureDirs").mockImplementation(() => undefined);
    jest.spyOn(PathMap, "models").mockReturnValue(modelsDir);
    jest.spyOn(PathMap, "factories").mockReturnValue(factoriesDir);
    jest.spyOn(PathMap, "seeds").mockReturnValue(seedsDir);
    jest.spyOn(PathMap, "migrations").mockReturnValue(migrationsDir);

    const staleSeederPath = path.join(seedsDir, "BlogScenarioSeeder.ts");
    fs.writeFileSync(
      staleSeederPath,
      `import { UserFactory } from "../factories/UserFactory";
import { PostFactory } from "../factories/PostFactory";
import { CommentFactory } from "../factories/CommentFactory";
export async function BlogScenarioSeeder() {
  new UserFactory();
  new PostFactory();
  new CommentFactory();
}
`,
      "utf8"
    );

    expect(resolveSeederStorageKindFromFile(staleSeederPath, true)).toBe("sql");

    const importResolver = await import("../cli/utils/ImportResolver");
    jest.spyOn(importResolver.ImportResolver, "coreImportPath").mockReturnValue("eloquentjs");
    jest.spyOn(importResolver.ImportResolver, "schemaImportPath").mockReturnValue("eloquentjs");

    try {
      await makeScenario("blog", { test: true, mongo: true, force: true });

      fs.writeFileSync(
        path.join(factoriesDir, "UserFactory.ts"),
        `import { User } from "../models/User";
export class UserFactory { model = User; definition() { return {}; } }
`,
        "utf8"
      );
      fs.writeFileSync(
        path.join(factoriesDir, "PostFactory.ts"),
        `import { Post } from "../models/Post";
export class PostFactory { model = Post; definition() { return {}; } }
`,
        "utf8"
      );
      fs.writeFileSync(
        path.join(factoriesDir, "CommentFactory.ts"),
        `import { Comment } from "../models/Comment";
export class CommentFactory { model = Comment; definition() { return {}; } }
`,
        "utf8"
      );

      expect(resolveSeederStorageKindFromFile(path.join(seedsDir, "BlogScenarioSeeder.ts"), true)).toBe(
        "mongo"
      );
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

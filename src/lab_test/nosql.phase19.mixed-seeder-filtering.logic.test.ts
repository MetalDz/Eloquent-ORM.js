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

import fs from "fs";
import os from "os";
import path from "path";
import {
  matchesTargetStorageKind,
  resolveFactoryStorageKindFromFile,
  resolveSeederStorageKindFromFile,
} from "../cli/utils/ArtifactStorage";
import { dbSeed } from "../cli/commands/dbSeed";
import { PathMap } from "../cli/utils/PathMap";
import * as tsRuntime from "../cli/utils/typescript/tsRuntime";

describe("NoSQL phase 19 mixed seeder filtering", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.spyOn(console, "log").mockImplementation(() => undefined);
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
    jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("mixed SQL + Mongo scenario seeders resolve to mixed and do not match mongo/sql targets", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-mixed-seeder-kind-"));
    const modelsDir = path.join(root, "models");
    const factoriesDir = path.join(root, "factories");
    const seedsDir = path.join(root, "seeds");
    fs.mkdirSync(modelsDir, { recursive: true });
    fs.mkdirSync(factoriesDir, { recursive: true });
    fs.mkdirSync(seedsDir, { recursive: true });

    const baseModelImport = path
      .relative(modelsDir, path.resolve(process.cwd(), "src/core/model/BaseModel"))
      .replace(/\\/g, "/");

    jest.spyOn(PathMap, "models").mockReturnValue(modelsDir);
    jest.spyOn(PathMap, "factories").mockReturnValue(factoriesDir);
    jest.spyOn(PathMap, "seeds").mockReturnValue(seedsDir);

    try {
      fs.writeFileSync(
        path.join(modelsDir, "User.ts"),
        `import { SqlModel } from "${baseModelImport}";
export class User extends SqlModel<Record<string, unknown>> {
  static tableName = "users";
  static connectionName = "mysql";
  constructor() { super("users", "mysql"); }
}
`,
        "utf8"
      );
      fs.writeFileSync(
        path.join(modelsDir, "Photo.ts"),
        `import { MongoModel } from "${baseModelImport}";
export class Photo extends MongoModel<Record<string, unknown>> {
  static tableName = "photos";
  static connectionName = "mongo";
  constructor() { super("photos", "mongo"); }
}
`,
        "utf8"
      );
      fs.writeFileSync(
        path.join(factoriesDir, "UserFactory.ts"),
        `import { User } from "../models/User";
export class UserFactory { model = User; definition() { return {}; } }
`,
        "utf8"
      );
      fs.writeFileSync(
        path.join(factoriesDir, "PhotoFactory.ts"),
        `import { Photo } from "../models/Photo";
export class PhotoFactory { model = Photo; definition() { return {}; } }
`,
        "utf8"
      );
      fs.writeFileSync(
        path.join(seedsDir, "MediaScenarioSeeder.ts"),
        `import { UserFactory } from "../factories/UserFactory";
import { PhotoFactory } from "../factories/PhotoFactory";
export async function MediaScenarioSeeder() {
  new UserFactory();
  new PhotoFactory();
}
`,
        "utf8"
      );

      expect(resolveFactoryStorageKindFromFile(path.join(factoriesDir, "UserFactory.ts"), false)).toBe(
        "sql"
      );
      expect(resolveFactoryStorageKindFromFile(path.join(factoriesDir, "PhotoFactory.ts"), false)).toBe(
        "mongo"
      );
      expect(resolveSeederStorageKindFromFile(path.join(seedsDir, "MediaScenarioSeeder.ts"), false)).toBe(
        "mixed"
      );
      expect(matchesTargetStorageKind("mixed", "mongo")).toBe(false);
      expect(matchesTargetStorageKind("mixed", "sql")).toBe(false);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test("dbSeed skips mixed seeders when targeting mongo", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-mixed-seeder-run-"));
    const modelsDir = path.join(root, "models");
    const factoriesDir = path.join(root, "factories");
    const seedsDir = path.join(root, "seeds");
    fs.mkdirSync(modelsDir, { recursive: true });
    fs.mkdirSync(factoriesDir, { recursive: true });
    fs.mkdirSync(seedsDir, { recursive: true });

    const baseModelImport = path
      .relative(modelsDir, path.resolve(process.cwd(), "src/core/model/BaseModel"))
      .replace(/\\/g, "/");

    jest.spyOn(PathMap, "models").mockReturnValue(modelsDir);
    jest.spyOn(PathMap, "factories").mockReturnValue(factoriesDir);
    jest.spyOn(PathMap, "seeds").mockReturnValue(seedsDir);

    const loadModuleSpy = jest.spyOn(tsRuntime, "loadModule");

    try {
      fs.writeFileSync(
        path.join(modelsDir, "User.ts"),
        `import { SqlModel } from "${baseModelImport}";
export class User extends SqlModel<Record<string, unknown>> {
  static tableName = "users";
  static connectionName = "mysql";
  constructor() { super("users", "mysql"); }
}
`,
        "utf8"
      );
      fs.writeFileSync(
        path.join(modelsDir, "Photo.ts"),
        `import { MongoModel } from "${baseModelImport}";
export class Photo extends MongoModel<Record<string, unknown>> {
  static tableName = "photos";
  static connectionName = "mongo";
  constructor() { super("photos", "mongo"); }
}
`,
        "utf8"
      );
      fs.writeFileSync(
        path.join(factoriesDir, "UserFactory.ts"),
        `import { User } from "../models/User";
export class UserFactory { model = User; definition() { return {}; } }
`,
        "utf8"
      );
      fs.writeFileSync(
        path.join(factoriesDir, "PhotoFactory.ts"),
        `import { Photo } from "../models/Photo";
export class PhotoFactory { model = Photo; definition() { return {}; } }
`,
        "utf8"
      );
      fs.writeFileSync(
        path.join(seedsDir, "MediaScenarioSeeder.ts"),
        `import { UserFactory } from "../factories/UserFactory";
import { PhotoFactory } from "../factories/PhotoFactory";
export async function MediaScenarioSeeder() {
  new UserFactory();
  new PhotoFactory();
}
`,
        "utf8"
      );

      await dbSeed({
        connectionNames: ["mongo"],
        close: false,
        exit: false,
      });

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining("No compatible seeder files found for mongo."));
      expect(loadModuleSpy).not.toHaveBeenCalledWith(path.join(seedsDir, "MediaScenarioSeeder.ts"));
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

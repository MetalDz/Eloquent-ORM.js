import fs from "fs";
import os from "os";
import path from "path";
import { dbConfig } from "../config/database";
import {
  matchesTargetStorageKind,
  resolveFactoryStorageKindFromCtor,
  resolveFactoryStorageKindFromFile,
  resolveModelStorageKind,
  resolveModelStorageKindFromCtor,
  resolveSeederStorageKindFromFile,
  targetStorageKindForConnection,
} from "../cli/utils/ArtifactStorage";
import { PathMap } from "../cli/utils/PathMap";
import * as tsRuntime from "../cli/utils/typescript/tsRuntime";
import { MongoModel, SqlModel } from "../core/model/BaseModel";

describe("LTS phase 5 ArtifactStorage coverage", () => {
  const originalConnections = dbConfig.connections;

  beforeEach(() => {
    dbConfig.connections = { ...originalConnections };
  });

  afterEach(() => {
    dbConfig.connections = { ...originalConnections };
    jest.restoreAllMocks();
  });

  test("plan tracks the dedicated ArtifactStorage coverage slice", () => {
    const planPath = path.resolve(
      process.cwd(),
      "validation tasks/LTS-Phase5-ArtifactStorage-Coverage-Plan.md",
    );
    const content = fs.readFileSync(planPath, "utf8");

    expect(content).toContain("# LTS Phase 5 ArtifactStorage Coverage Plan");
    expect(content).toContain("Status: COMPLETED");
    expect(content).toContain("src/cli/utils/ArtifactStorage.ts");
    expect(content).toContain("src/lab_test/lts.phase5.artifact-storage-coverage.logic.test.ts");
  });

  test("ctor-based model and factory storage detection covers sql, mongo, connection-name, and unknown fallbacks", () => {
    class SqlCtor extends SqlModel<Record<string, unknown>> {
      constructor() {
        super("sql_models", "sqlite_test");
      }
    }

    class MongoCtor extends MongoModel<Record<string, unknown>> {
      constructor() {
        super("mongo_models", "mongo_test");
      }
    }

    class ConnectionBasedCtor {
      static connectionName = "mongo_test";
    }

    class SqlConnectionBasedCtor {
      static connectionName = "sqlite_test";
    }

    class UnknownConnectionCtor {
      static connectionName = 42 as unknown;
    }

    class MissingConnectionCtor {
      static connectionName = "missing_connection";
    }

    class SqlFactory {
      model = SqlCtor;
    }

    class ThrowingFactory {
      constructor() {
        throw new Error("boom");
      }
    }

    expect(resolveModelStorageKindFromCtor(SqlCtor)).toBe("sql");
    expect(resolveModelStorageKindFromCtor(MongoCtor)).toBe("mongo");
    expect(resolveModelStorageKindFromCtor(ConnectionBasedCtor)).toBe("mongo");
    expect(resolveModelStorageKindFromCtor(SqlConnectionBasedCtor)).toBe("sql");
    expect(resolveModelStorageKindFromCtor(UnknownConnectionCtor)).toBe("unknown");
    expect(resolveModelStorageKindFromCtor(MissingConnectionCtor)).toBe("unknown");
    expect(resolveFactoryStorageKindFromCtor(SqlFactory)).toBe("sql");
    expect(resolveFactoryStorageKindFromCtor(ThrowingFactory)).toBe("unknown");
    expect(resolveFactoryStorageKindFromCtor({})).toBe("unknown");
  });

  test("model, factory, and seeder file resolution covers direct paths, extension fallback, loader fallback, and missing artifacts", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-artifact-storage-"));
    const modelsDir = path.join(root, "models");
    const factoriesDir = path.join(root, "factories");
    const seedsDir = path.join(root, "seeds");
    fs.mkdirSync(modelsDir, { recursive: true });
    fs.mkdirSync(factoriesDir, { recursive: true });
    fs.mkdirSync(seedsDir, { recursive: true });

    jest.spyOn(PathMap, "models").mockReturnValue(modelsDir);
    jest.spyOn(PathMap, "factories").mockReturnValue(factoriesDir);

    const directModelPath = path.join(modelsDir, "DirectModel.ts");
    const regexModelPath = path.join(modelsDir, "RegexModel.ts");
    const fallbackModelPath = path.join(modelsDir, "FallbackModel.ts");
    const unknownModelPath = path.join(modelsDir, "UnknownModel.ts");
    const unreadableModelPath = path.join(modelsDir, "UnreadableModel.ts");
    const directFactoryPath = path.join(factoriesDir, "DirectFactory.ts");
    const unreadableFactoryPath = path.join(factoriesDir, "UnreadableFactory.ts");
    const unreadableModelFactoryPath = path.join(factoriesDir, "UnreadableModelFactory.ts");
    const loaderFactoryPath = path.join(factoriesDir, "LoaderFactory.ts");
    const loaderUnknownFactoryPath = path.join(factoriesDir, "LoaderUnknownFactory.ts");
    const blankImportFactoryPath = path.join(factoriesDir, "BlankImportFactory.ts");
    const missingModelFactoryPath = path.join(factoriesDir, "MissingModelFactory.ts");
    const blankImportSeederPath = path.join(seedsDir, "BlankImportSeeder.ts");
    const emptySeederPath = path.join(seedsDir, "EmptySeeder.ts");
    const missingFactorySeederPath = path.join(seedsDir, "MissingFactorySeeder.ts");

    fs.writeFileSync(directModelPath, 'export class DirectModel extends SqlModel {}', "utf8");
    fs.writeFileSync(
      regexModelPath,
      'export class RegexModel { static connectionName = process.env.DB_CONNECTION ?? "mongo_test"; }',
      "utf8",
    );
    fs.writeFileSync(fallbackModelPath, "export class FallbackModel {}", "utf8");
    fs.writeFileSync(unknownModelPath, "export class UnknownModel {}", "utf8");
    fs.writeFileSync(unreadableModelPath, "export class UnreadableModel {}", "utf8");

    fs.writeFileSync(
      directFactoryPath,
      'import { DirectModel } from "../models/DirectModel.ts";\nexport class DirectFactory {}',
      "utf8",
    );
    fs.writeFileSync(
      unreadableFactoryPath,
      "export class UnreadableFactory {}",
      "utf8",
    );
    fs.writeFileSync(
      unreadableModelFactoryPath,
      'import { UnreadableModel } from "../models/UnreadableModel";\nexport class UnreadableFactory {}',
      "utf8",
    );
    fs.writeFileSync(loaderFactoryPath, "export class LoaderFactory {}", "utf8");
    fs.writeFileSync(loaderUnknownFactoryPath, "export const helper = 1;", "utf8");
    fs.writeFileSync(
      blankImportFactoryPath,
      'import { IgnoreMe } from "../models/   ";\nimport { DirectModel } from "../models/DirectModel.ts";\nexport class BlankImportFactory {}',
      "utf8",
    );
    fs.writeFileSync(
      missingModelFactoryPath,
      'import { MissingModel } from "../models/MissingModel";\nexport class MissingModelFactory {}',
      "utf8",
    );

    fs.writeFileSync(
      blankImportSeederPath,
      'import { IgnoreMe } from "../factories/   ";\nimport { DirectFactory } from "../factories/DirectFactory";\nexport async function BlankImportSeeder() {}',
      "utf8",
    );
    fs.writeFileSync(emptySeederPath, "export async function EmptySeeder() {}", "utf8");
    fs.writeFileSync(
      missingFactorySeederPath,
      'import { MissingFactory } from "../factories/MissingFactory";\nexport async function MissingFactorySeeder() {}',
      "utf8",
    );

    class FallbackCtor {
      static connectionName = "sqlite_test";
    }

    class UnknownCtor {}

    class MongoFactoryModel {
      static connectionName = "mongo_test";
    }

    class LoaderFactory {
      model = MongoFactoryModel;
    }

    const originalReadFileSync = fs.readFileSync.bind(fs);
    jest.spyOn(fs, "readFileSync").mockImplementation(
      ((filePath: fs.PathOrFileDescriptor, ...args: unknown[]) => {
        if (filePath === fallbackModelPath || filePath === unreadableModelPath || filePath === unreadableFactoryPath) {
          throw new Error("unreadable");
        }

        return originalReadFileSync(filePath, ...(args as [BufferEncoding?])) as never;
      }) as typeof fs.readFileSync,
    );

    jest.spyOn(tsRuntime, "loadModule").mockImplementation((filePath: string) => {
      if (filePath === fallbackModelPath) {
        return { FallbackModel: FallbackCtor };
      }
      if (filePath === unknownModelPath) {
        return { UnknownModel: UnknownCtor };
      }
      if (filePath === unreadableFactoryPath || filePath === loaderFactoryPath) {
        return { LoaderFactory };
      }
      if (filePath === loaderUnknownFactoryPath) {
        return { helper: 1 };
      }

      return require(filePath) as Record<string, unknown>;
    });

    try {
      expect(resolveModelStorageKind("MissingModel", false)).toBe("unknown");
      expect(resolveModelStorageKind("DirectModel.ts", false)).toBe("sql");
      expect(resolveModelStorageKind("RegexModel", false)).toBe("mongo");
      expect(resolveModelStorageKind("FallbackModel", false)).toBe("sql");
      expect(resolveModelStorageKind("UnknownModel", false)).toBe("unknown");

      expect(resolveFactoryStorageKindFromFile(path.join(factoriesDir, "MissingFactory.ts"), false)).toBe(
        "unknown",
      );
      expect(resolveFactoryStorageKindFromFile(directFactoryPath, false)).toBe("sql");
      expect(resolveFactoryStorageKindFromFile(blankImportFactoryPath, false)).toBe("sql");
      expect(resolveFactoryStorageKindFromFile(missingModelFactoryPath, false)).toBe("unknown");
      expect(resolveFactoryStorageKindFromFile(unreadableFactoryPath, false)).toBe("mongo");
      expect(resolveFactoryStorageKindFromFile(unreadableModelFactoryPath, false)).toBe("unknown");
      expect(resolveFactoryStorageKindFromFile(loaderFactoryPath, false)).toBe("mongo");
      expect(resolveFactoryStorageKindFromFile(loaderUnknownFactoryPath, false)).toBe("unknown");

      expect(resolveSeederStorageKindFromFile(path.join(seedsDir, "MissingSeeder.ts"), false)).toBe(
        "unknown",
      );
      expect(resolveSeederStorageKindFromFile(emptySeederPath, false)).toBe("unknown");
      expect(resolveSeederStorageKindFromFile(blankImportSeederPath, false)).toBe("sql");
      expect(resolveSeederStorageKindFromFile(missingFactorySeederPath, false)).toBe("unknown");
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test("connection target helpers preserve sql/mongo defaults and compatibility matching", () => {
    expect(targetStorageKindForConnection("mongo_test")).toBe("mongo");
    expect(targetStorageKindForConnection("unknown_connection")).toBe("sql");
    expect(matchesTargetStorageKind("mongo", "mongo")).toBe(true);
    expect(matchesTargetStorageKind("sql", "mongo")).toBe(false);
  });
});

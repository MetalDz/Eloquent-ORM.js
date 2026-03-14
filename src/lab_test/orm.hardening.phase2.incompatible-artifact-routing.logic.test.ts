import fs from "fs";
import path from "path";

import { PathMap } from "../cli/utils/PathMap";
import { dbSeed } from "../cli/commands/dbSeed";
import { FactoryRegistry } from "../cli/utils/factories/FactoryRegistry";
import * as artifactStorage from "../cli/utils/ArtifactStorage";
import * as tsRuntime from "../cli/utils/typescript/tsRuntime";
import {
  createTargetedArtifactDecision,
  summarizeSkippedArtifacts,
} from "../cli/utils/ArtifactRoutingReport";
import { MongoModel, SqlModel } from "../core/model/BaseModel";

jest.mock("chalk", () => ({
  __esModule: true,
  default: new Proxy(
    (value: unknown): string => String(value ?? ""),
    {
      get: () => (value: unknown): string => String(value ?? ""),
      apply: (_target, _thisArg, args: unknown[]) => String(args[0] ?? ""),
    },
  ),
}));

class SqlArtifactModel extends SqlModel<Record<string, never>> {
  constructor() {
    super("sql_artifacts", "sqlite_test");
  }
}

class MongoArtifactModel extends MongoModel<Record<string, never>> {
  constructor() {
    super("mongo_artifacts", "mongo_test");
  }
}

class SqlArtifactFactory {
  model = SqlArtifactModel;

  definition(): Record<string, never> {
    return {};
  }
}

class MongoArtifactFactory {
  model = MongoArtifactModel;

  definition(): Record<string, never> {
    return {};
  }
}

describe("ORM hardening phase 2 - incompatible artifact routing", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    FactoryRegistry.clear();
    jest.spyOn(console, "log").mockImplementation(() => undefined);
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    jest
      .spyOn(artifactStorage, "resolveSeederStorageKindFromFile")
      .mockReturnValue("unknown");
  });

  afterEach(() => {
    jest.restoreAllMocks();
    FactoryRegistry.clear();
  });

  test("plan records the incompatible artifact routing slice", () => {
    const planPath = path.resolve(
      process.cwd(),
      "validation tasks/ORM-Hardening-Phase2-Incompatible-Artifact-Routing-Plan.md",
    );
    const content = fs.readFileSync(planPath, "utf8");

    expect(content).toContain("Status: COMPLETED");
    expect(content).toContain("src/cli/utils/ArtifactRoutingReport.ts");
    expect(content).toContain("src/cli/commands/dbSeed.ts");
    expect(content).toContain("src/cli/utils/factories/FactoryRegistry.ts");
  });

  test("routing report helper creates deterministic decisions and summaries", () => {
    const direct = createTargetedArtifactDecision("MongoSeeder.ts", "mongo", "mongo");
    const mixed = createTargetedArtifactDecision("MediaScenarioSeeder.ts", "mixed", "mongo");

    expect(direct).toEqual({
      name: "MongoSeeder.ts",
      kind: "mongo",
      matches: true,
      reason: "direct_match",
    });
    expect(mixed).toEqual({
      name: "MediaScenarioSeeder.ts",
      kind: "mixed",
      matches: false,
      reason: "mixed_artifact",
    });
    expect(summarizeSkippedArtifacts("seeder", [mixed], "mongo")).toContain(
      "Skipping incompatible seeder for mongo: MediaScenarioSeeder.ts",
    );
  });

  test("dbSeed reports skipped incompatible seeders in targeted flows", async () => {
    jest.spyOn(PathMap, "seeds").mockReturnValue("virtual-seeds");
    jest.spyOn(fs, "existsSync").mockReturnValue(true);
    jest
      .spyOn(fs, "readdirSync")
      .mockReturnValue([
        "MediaScenarioSeeder.ts",
      ] as unknown as ReturnType<typeof fs.readdirSync>);
    jest
      .spyOn(artifactStorage, "resolveSeederStorageKindFromFile")
      .mockReturnValue("mixed");

    await dbSeed({
      connectionNames: ["mongo"],
      close: false,
      exit: false,
    });

    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("Skipping incompatible seeder for mongo: MediaScenarioSeeder.ts"),
    );
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("No compatible seeder files found for mongo."),
    );
  });

  test("factory auto-discovery warns when incompatible factories are skipped for a target", async () => {
    jest.spyOn(PathMap, "factories").mockReturnValue("virtual-factories");
    jest.spyOn(fs, "existsSync").mockReturnValue(true);
    jest
      .spyOn(fs, "readdirSync")
      .mockReturnValue([
        "SqlArtifactFactory.ts",
        "MongoArtifactFactory.ts",
      ] as unknown as ReturnType<typeof fs.readdirSync>);
    jest.spyOn(tsRuntime, "loadModule").mockImplementation((filePath: string) => {
      if (filePath.includes("MongoArtifactFactory")) {
        return { MongoArtifactFactory };
      }
      return { SqlArtifactFactory };
    });

    await FactoryRegistry.autoDiscover(true, { storageKind: "mongo" });

    expect(FactoryRegistry.list()).toEqual(["MongoArtifactFactory"]);
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("Skipping incompatible factory for mongo: SqlArtifactFactory"),
    );
  });
});

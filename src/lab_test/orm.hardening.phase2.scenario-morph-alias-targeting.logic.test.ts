import fs from "fs";
import os from "os";
import path from "path";
import { PathMap } from "../cli/utils/PathMap";
import { resolveScenarioMorphAliases } from "../cli/utils/ScenarioMorphAliasRouting";
import { dbConfig } from "../config/database";

describe("ORM hardening phase 2 - scenario morph alias targeting", () => {
  const originalConnections = dbConfig.connections;

  beforeEach(() => {
    jest.restoreAllMocks();
    dbConfig.connections = { ...originalConnections };
  });

  afterEach(() => {
    jest.restoreAllMocks();
    dbConfig.connections = { ...originalConnections };
  });

  test("plan records the targeted morph-alias routing seam", () => {
    const planPath = path.resolve(
      process.cwd(),
      "validation tasks/ORM-Hardening-Phase2-Scenario-Morph-Alias-Targeting-Plan.md",
    );
    const content = fs.readFileSync(planPath, "utf8");

    expect(content).toContain("Status: COMPLETED");
    expect(content).toContain("src/cli/utils/ScenarioMorphAliasRouting.ts");
    expect(content).toContain("src/cli/commands/demoScenario.ts");
  });

  test("compatible mongo model files supply morph aliases for mongo-targeted flows", () => {
    const modelsDir = fs.mkdtempSync(path.join(os.tmpdir(), "phase2-morph-mongo-"));
    try {
      fs.writeFileSync(
        path.join(modelsDir, "User.ts"),
        'export class User { static connectionName = "mongo_test"; static getMorphClass() { return "accounts"; } }\n',
        "utf8",
      );
      fs.writeFileSync(
        path.join(modelsDir, "Post.ts"),
        'export class Post { static connectionName = "mongo_test"; static getMorphClass() { return "articles"; } }\n',
        "utf8",
      );

      jest.spyOn(PathMap, "models").mockReturnValue(modelsDir);
      (dbConfig.connections as Record<string, { driver?: string }>).mongo_test = {
        driver: "mongo",
      };

      expect(resolveScenarioMorphAliases({ isTest: true, connectionName: "mongo_test" })).toEqual({
        userMorph: "accounts",
        postMorph: "articles",
      });
    } finally {
      fs.rmSync(modelsDir, { recursive: true, force: true });
    }
  });

  test("mongo-targeted flows ignore SQL-only model files and fall back to default aliases", () => {
    const modelsDir = fs.mkdtempSync(path.join(os.tmpdir(), "phase2-morph-fallback-"));
    try {
      fs.writeFileSync(
        path.join(modelsDir, "User.ts"),
        'export class User { static connectionName = "sqlite_test"; static getMorphClass() { return "accounts"; } }\n',
        "utf8",
      );
      fs.writeFileSync(
        path.join(modelsDir, "Post.ts"),
        'export class Post { static connectionName = "sqlite_test"; static getMorphClass() { return "articles"; } }\n',
        "utf8",
      );

      jest.spyOn(PathMap, "models").mockReturnValue(modelsDir);
      (dbConfig.connections as Record<string, { driver?: string }>).mongo_test = {
        driver: "mongo",
      };

      expect(resolveScenarioMorphAliases({ isTest: true, connectionName: "mongo_test" })).toEqual({
        userMorph: "users",
        postMorph: "posts",
      });
    } finally {
      fs.rmSync(modelsDir, { recursive: true, force: true });
    }
  });

  test("sql-targeted flows ignore Mongo-only model files and fall back to default aliases", () => {
    const modelsDir = fs.mkdtempSync(path.join(os.tmpdir(), "phase2-morph-sql-fallback-"));
    try {
      fs.writeFileSync(
        path.join(modelsDir, "User.ts"),
        'export class User { static connectionName = "mongo"; static getMorphClass() { return "accounts"; } }\n',
        "utf8",
      );
      fs.writeFileSync(
        path.join(modelsDir, "Post.ts"),
        'export class Post { static connectionName = "mongo"; static getMorphClass() { return "articles"; } }\n',
        "utf8",
      );

      jest.spyOn(PathMap, "models").mockReturnValue(modelsDir);
      (dbConfig.connections as Record<string, { driver?: string }>).sqlite_test = {
        driver: "sqlite",
      };

      expect(resolveScenarioMorphAliases({ isTest: true, connectionName: "sqlite_test" })).toEqual({
        userMorph: "users",
        postMorph: "posts",
      });
    } finally {
      fs.rmSync(modelsDir, { recursive: true, force: true });
    }
  });
});

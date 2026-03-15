import fs from "fs";
import path from "path";

describe("production documentation presence and baseline content", () => {
  const rootDir = process.cwd();

  test("required production documentation files exist", () => {
    const requiredDocs = [
      "SECURITY.md",
      "src/documentation/api-reference.md",
      "src/documentation/cli-production-safety.md",
      "src/documentation/usage-guides.md",
      "src/documentation/upgrade-guide.md",
      "src/documentation/db-least-privilege-env-contract.md",
      "src/documentation/migration-rollback-recovery-runbook.md",
    ];

    const missing = requiredDocs.filter((relPath) =>
      !fs.existsSync(path.resolve(rootDir, relPath))
    );
    expect(missing).toEqual([]);
  });

  test("API reference documents the current public export surface", () => {
    const apiDoc = fs.readFileSync(
      path.resolve(rootDir, "src/documentation/api-reference.md"),
      "utf8"
    );

    const expectedExports = [
      "BaseModel",
      "CacheManager",
      "CoreModel",
      "Factory",
      "Model",
      "MongoModel",
      "MorphRegistry",
      "PivotHelperMixin",
      "SchemaBuilder",
      "SchemaValidator",
      "SqlModel",
      "column",
      "isModelRegistered",
      "isModelRegistryStrictMode",
      "mixin",
      "registerModels",
      "relation",
      "setModelRegistryStrictMode",
      "setupCache",
      "validate",
      "validateSchema",
    ];

    for (const exportName of expectedExports) {
      expect(apiDoc).toContain(exportName);
    }
  });

  test("security policy includes supported versions and reporting flow", () => {
    const securityDoc = fs.readFileSync(
      path.resolve(rootDir, "SECURITY.md"),
      "utf8"
    );

    expect(securityDoc).toContain("Supported Versions");
    expect(securityDoc).toContain("Reporting a Vulnerability");
    expect(securityDoc).toContain("GitHub Security Advisories");
  });

  test("CLI production safety doc includes destructive override contract", () => {
    const cliSafetyDoc = fs.readFileSync(
      path.resolve(rootDir, "src/documentation/cli-production-safety.md"),
      "utf8"
    );

    expect(cliSafetyDoc).toContain("ELOQUENT_ALLOW_PROD_DESTRUCTIVE=true");
    expect(cliSafetyDoc).toContain("--force");
    expect(cliSafetyDoc).toContain("--yes");
    expect(cliSafetyDoc).toContain("db:seed:precheck");
  });

  test("usage and upgrade guides include required lifecycle topics", () => {
    const usageDoc = fs.readFileSync(
      path.resolve(rootDir, "src/documentation/usage-guides.md"),
      "utf8"
    );
    const upgradeDoc = fs.readFileSync(
      path.resolve(rootDir, "src/documentation/upgrade-guide.md"),
      "utf8"
    );

    expect(usageDoc).toContain("Runtime Setup");
    expect(usageDoc).toContain("Migration Workflow");
    expect(usageDoc).toContain("Seeding Workflow");
    expect(usageDoc).toContain("Multi-Driver Workflow");
    expect(usageDoc).toContain("Test Mode Workflow");

    expect(upgradeDoc).toContain("0.10.x");
    expect(upgradeDoc).toContain("Pre-Upgrade Checklist");
    expect(upgradeDoc).toContain("Post-Upgrade Checklist");
  });
});


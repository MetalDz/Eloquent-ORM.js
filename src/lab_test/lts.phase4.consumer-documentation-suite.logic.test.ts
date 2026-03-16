import fs from "fs";
import path from "path";

describe("LTS phase 4 consumer documentation suite", () => {
  const rootDir = process.cwd();
  const phasePlanPath = path.resolve(
    rootDir,
    "validation tasks/LTS-Phase4-Consumer-Documentation-Suite-Plan.md"
  );
  const masterPlanPath = path.resolve(
    rootDir,
    "validation tasks/LTS-Trust-Building-Plan.md"
  );
  const packageDocsPath = path.resolve(rootDir, "src/documentation/package-docs-index.md");
  const installPath = path.resolve(
    rootDir,
    "src/documentation/installation-and-quickstart.md"
  );
  const troubleshootingPath = path.resolve(
    rootDir,
    "src/documentation/troubleshooting.md"
  );

  test("phase plan records the completed consumer documentation suite slice", () => {
    const plan = fs.readFileSync(phasePlanPath, "utf8");

    const requiredSnippets = [
      "# LTS Phase 4: Consumer Documentation Suite Plan",
      "Status: COMPLETED",
      "`src/documentation/package-docs-index.md`",
      "`src/documentation/installation-and-quickstart.md`",
      "`src/documentation/troubleshooting.md`",
      "package-level consumer documentation layer",
      "Marked Phase 4 complete in the master LTS plan.",
    ];

    for (const snippet of requiredSnippets) {
      expect(plan).toContain(snippet);
    }
  });

  test("master LTS plan is completed and shows Phase 4 completed", () => {
    const masterPlan = fs.readFileSync(masterPlanPath, "utf8");

    const requiredSnippets = [
      "Status: COMPLETED",
      "### Phase 4: Consumer Documentation Suite",
      "- [x] Publish full package docs from installation to usage to support",
      "- [x] add docs entry-point tests and section coverage tests",
    ];

    for (const snippet of requiredSnippets) {
      expect(masterPlan).toContain(snippet);
    }
  });

  test("package docs entry point routes consumers from installation to support", () => {
    const docs = fs.readFileSync(packageDocsPath, "utf8");

    const requiredSnippets = [
      "# EloquentJS Package Docs",
      "## Start Here",
      "./installation-and-quickstart.md",
      "./upgrade-guide.md",
      "./support-policy.md",
      "## Installation and Setup",
      "./usage-guides.md",
      "./api-reference.md",
      "## SQL and Mongo Usage",
      "./nosql-usage-guide.md",
      "## Operations and Safety",
      "./cli-production-safety.md",
      "./db-least-privilege-env-contract.md",
      "./migration-rollback-recovery-runbook.md",
      "## Stability and Compatibility",
      "./backward-compatibility-policy.md",
      "./public-api-freeze-policy.md",
      "## Troubleshooting and Security",
      "./troubleshooting.md",
    ];

    for (const snippet of requiredSnippets) {
      expect(docs).toContain(snippet);
    }
  });

  test("installation and troubleshooting guides cover first-use and support paths", () => {
    const packageJson = JSON.parse(
      fs.readFileSync(path.resolve(rootDir, "package.json"), "utf8"),
    ) as { name?: string };
    const packageName = packageJson.name ?? "eloquent-orm.js";
    const install = fs.readFileSync(installPath, "utf8");
    const troubleshooting = fs.readFileSync(troubleshootingPath, "utf8");

    const installSnippets = [
      "# Installation and Quick Start",
      `npm install ${packageName}`,
      "Example SQL-first setup",
      "Example Mongo setup",
      "## Quick Start",
      "registerModels",
      "eloquent migrate:run --all-migrations",
      "## First Runtime Example",
      "await user.save();",
      "Where to Go Next",
      "./support-policy.md",
    ];

    for (const snippet of installSnippets) {
      expect(install).toContain(snippet);
    }

    const troubleshootingSnippets = [
      "# Troubleshooting Guide",
      "npm run typecheck",
      "npm run build",
      "Mongo auth or DNS fails",
      "npm run test:pack-smoke",
      "ELOQUENT_PACK_SMOKE_ENABLE_MONGO_RUNTIME=1",
      "factory:status --mongo",
      "./package-docs-index.md",
      "./usage-guides.md",
      "./api-reference.md",
      "./support-policy.md",
    ];

    for (const snippet of troubleshootingSnippets) {
      expect(troubleshooting).toContain(snippet);
    }
  });
});

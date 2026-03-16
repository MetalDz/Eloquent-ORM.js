import fs from "fs";
import path from "path";

describe("LTS phase 3 compatibility and API freeze", () => {
  const rootDir = process.cwd();
  const phasePlanPath = path.resolve(
    rootDir,
    "validation tasks/LTS-Phase3-Compatibility-And-API-Freeze-Plan.md"
  );
  const masterPlanPath = path.resolve(
    rootDir,
    "validation tasks/LTS-Trust-Building-Plan.md"
  );
  const compatibilityPolicyPath = path.resolve(
    rootDir,
    "src/documentation/backward-compatibility-policy.md"
  );
  const apiFreezePolicyPath = path.resolve(
    rootDir,
    "src/documentation/public-api-freeze-policy.md"
  );

  test("phase plan records the completed compatibility and API freeze slice", () => {
    const plan = fs.readFileSync(phasePlanPath, "utf8");

    const requiredSnippets = [
      "# LTS Phase 3: Compatibility and API Freeze Plan",
      "Status: COMPLETED",
      "`src/documentation/backward-compatibility-policy.md`",
      "`src/documentation/public-api-freeze-policy.md`",
      "compatibility surfaces",
      "public API definition",
      "Marked Phase 3 complete in the master LTS plan.",
    ];

    for (const snippet of requiredSnippets) {
      expect(plan).toContain(snippet);
    }
  });

  test("master LTS plan is completed and shows Phase 3 completed", () => {
    const masterPlan = fs.readFileSync(masterPlanPath, "utf8");

    const requiredSnippets = [
      "Status: COMPLETED",
      "### Phase 3: Compatibility + API Freeze",
      "- [x] Write backward compatibility policy",
      "- [x] write public API freeze policy",
      "- [x] add tests for export/CLI/generator/runtime compatibility promises",
    ];

    for (const snippet of requiredSnippets) {
      expect(masterPlan).toContain(snippet);
    }
  });

  test("compatibility policy defines breaking surfaces and major-only changes", () => {
    const policy = fs.readFileSync(compatibilityPolicyPath, "utf8");

    const requiredSnippets = [
      "# Backward Compatibility Policy",
      "documented package root exports",
      "documented CLI commands and flags",
      "documented generator outputs",
      "documented migration and seeding lifecycle contracts",
      "## What Counts as Breaking",
      "## Major-Only Changes",
      "## Minor and Patch Compatibility",
      "## Internal Modules",
      "Deep imports into internal paths are unsupported unless explicitly documented.",
    ];

    for (const snippet of requiredSnippets) {
      expect(policy).toContain(snippet);
    }
  });

  test("public API freeze policy defines the public surface and references the enforcing tests", () => {
    const policy = fs.readFileSync(apiFreezePolicyPath, "utf8");

    const requiredSnippets = [
      "# Public API Freeze Policy",
      "root package exports from `dist/index.js`",
      "the published CLI command surface",
      "documented generator outputs produced by supported CLI commands",
      "deep imports under `dist/core/*`",
      "deep imports under `dist/cli/*`",
      "## Freeze Rules",
      "## Freeze Checklist",
      "src/lab_test/package.surface.logic.test.ts",
      "src/lab_test/eloquent.cli.commands.testing.logic.test.ts",
      "src/lab_test/orm.hardening.phase3.generated-app-test-model-stack.logic.test.ts",
      "src/lab_test/scenario.generated.model.instance.persistence.logic.test.ts",
      "src/lab_test/orm.hardening.phase3.pack-smoke-generated-artifact-lifecycle.logic.test.ts",
      "No release line should be labeled `LTS` until the public API freeze rules are active and enforced by tests.",
    ];

    for (const snippet of requiredSnippets) {
      expect(policy).toContain(snippet);
    }
  });
});

import fs from "fs";
import path from "path";

describe("LTS phase 1 versioning and support foundation", () => {
  const rootDir = process.cwd();
  const phasePlanPath = path.resolve(
    rootDir,
    "validation tasks/LTS-Phase1-Versioning-And-Support-Foundation-Plan.md"
  );
  const masterPlanPath = path.resolve(
    rootDir,
    "validation tasks/LTS-Trust-Building-Plan.md"
  );
  const versioningPolicyPath = path.resolve(rootDir, "src/documentation/versioning-policy.md");
  const supportPolicyPath = path.resolve(rootDir, "src/documentation/support-policy.md");

  test("phase plan records the completed versioning and support foundation slice", () => {
    const plan = fs.readFileSync(phasePlanPath, "utf8");

    const requiredSnippets = [
      "# LTS Phase 1: Versioning and Support Foundation Plan",
      "Status: COMPLETED",
      "`src/documentation/versioning-policy.md`",
      "`src/documentation/support-policy.md`",
      "update the master LTS plan status from `PLANNED` to `IN PROGRESS`",
      "Marked Phase 1 complete in the master LTS plan.",
    ];

    for (const snippet of requiredSnippets) {
      expect(plan).toContain(snippet);
    }
  });

  test("master plan is now in progress and shows Phase 1 completed", () => {
    const masterPlan = fs.readFileSync(masterPlanPath, "utf8");

    const requiredSnippets = [
      "Status: IN PROGRESS",
      "### Phase 1: Versioning + Support Foundation",
      "- [x] Write versioning policy doc",
      "- [x] write support policy doc",
      "- [x] add contract tests for both",
    ];

    for (const snippet of requiredSnippets) {
      expect(masterPlan).toContain(snippet);
    }
  });

  test("versioning and support docs define the initial LTS trust foundation", () => {
    const versioningPolicy = fs.readFileSync(versioningPolicyPath, "utf8");
    const supportPolicy = fs.readFileSync(supportPolicyPath, "utf8");

    const versioningSnippets = [
      "# Versioning Policy",
      "major",
      "minor",
      "patch",
      "CLI contract",
      "generator output",
      "Deprecation Policy",
      "Pre-Release Channels",
      "Release Evidence",
    ];

    for (const snippet of versioningSnippets) {
      expect(versioningPolicy).toContain(snippet);
    }

    const supportSnippets = [
      "# Support Policy",
      "current stable line only",
      "`stable`",
      "`LTS`",
      "Node.js support",
      "mysql",
      "pg",
      "sqlite",
      "mongo",
      "Backport Policy",
      "Consumer Expectations",
    ];

    for (const snippet of supportSnippets) {
      expect(supportPolicy).toContain(snippet);
    }
  });
});

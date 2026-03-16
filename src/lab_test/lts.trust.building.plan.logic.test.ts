import fs from "fs";
import path from "path";

describe("LTS trust building plan", () => {
  const rootDir = process.cwd();
  const planPath = path.resolve(rootDir, "validation tasks/LTS-Trust-Building-Plan.md");

  test("plan defines the LTS trust-building scope and trust gap honestly", () => {
    const plan = fs.readFileSync(planPath, "utf8");

    const requiredSnippets = [
      "# LTS Trust Building Plan",
      "Status: COMPLETED",
      'Move the ORM from "production-usable in controlled environments" to "consumer-trusted LTS-grade package"',
      "controlled-production usable",
      "not yet consumer-trusted as an LTS package",
      "## Scope",
      "- Versioning policy",
      "- support policy",
      "- release cadence",
      "- backward compatibility rules",
      "- public API freeze and export discipline",
      "- consumer-facing package documentation",
      "- coverage plan to `100%`",
    ];

    for (const snippet of requiredSnippets) {
      expect(plan).toContain(snippet);
    }
  });

  test("plan locks versioning, support, release cadence, compatibility, and public API freeze tracks", () => {
    const plan = fs.readFileSync(planPath, "utf8");

    const requiredSnippets = [
      "### 1) Versioning Policy",
      "major: breaking public API or migration-contract changes",
      "minor: additive backward-compatible features",
      "patch: fixes only, no silent contract drift",
      "### 2) Support Policy",
      "supported Node.js versions",
      "supported databases/drivers",
      "### 3) Release Cadence",
      "canary/preview",
      "stable",
      "LTS",
      "### 4) Backward Compatibility Policy",
      "CLI flags",
      "generated artifact shapes",
      "### 5) Public API Freeze",
      "`dist/index.js` exports",
      "documented CLI commands",
      "documented generator outputs",
    ];

    for (const snippet of requiredSnippets) {
      expect(plan).toContain(snippet);
    }
  });

  test("plan includes professional consumer docs and a zero-gap coverage program with the current baseline", () => {
    const plan = fs.readFileSync(planPath, "utf8");

    const requiredSnippets = [
      "### 6) Consumer Docs (Professional Package Docs)",
      "installation",
      "quick start",
      "configuration",
      "SQL usage",
      "Mongo usage",
      "CLI reference",
      "support policy",
      "### 7) Coverage Plan to 100% (No Gaps)",
      "Statements   : `100% (6290/6290)`",
      "Branches     : `100% (3326/3326)`",
      "Functions    : `100% (1031/1031)`",
      "Lines        : `100% (5954/5954)`",
      "Coverage target:",
      "Statements: `100%`",
      "Branches: `100%`",
      "Functions: `100%`",
      "Lines: `100%`",
      "no shipped runtime/CLI module is allowed to remain below target without an active tracked slice and matching regression",
      "`npm run test:coverage` must report `100%`",
    ];

    for (const snippet of requiredSnippets) {
      expect(plan).toContain(snippet);
    }
  });
});

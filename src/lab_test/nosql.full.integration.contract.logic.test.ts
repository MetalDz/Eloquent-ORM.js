import fs from "fs";
import path from "path";

describe("NoSQL full integration contract plan", () => {
  const rootDir = process.cwd();
  const planPath = path.resolve(
    rootDir,
    "validation tasks/NoSQL-Full-Integration-Plan.md"
  );

  test("plan doc exists and captures current scope/status", () => {
    const plan = fs.readFileSync(planPath, "utf8");

    const requiredSnippets = [
      "# NoSQL Full Integration Plan",
      "Status: DONE (Phase 5 Complete)",
      "Target driver family:",
      "`mongo`",
      "No attempt to force SQL migration semantics onto NoSQL.",
      "Plan is closed.",
    ];

    for (const snippet of requiredSnippets) {
      expect(plan).toContain(snippet);
    }
  });

  test("plan doc defines ordered phases and acceptance criteria", () => {
    const plan = fs.readFileSync(planPath, "utf8");

    const requiredSnippets = [
      "Phase 1: Contract Definition",
      "Phase 2: Runtime Parity Baseline",
      "Phase 3: CLI Integration Parity",
      "Phase 4: Validation and Quality Gates",
      "Phase 5: Documentation and Release Closure",
      "## Acceptance Criteria",
      "NoSQL driver is treated as a first-class documented runtime target.",
      "Unsupported SQL-only operations on NoSQL produce explicit, safe errors.",
    ];

    for (const snippet of requiredSnippets) {
      expect(plan).toContain(snippet);
    }
  });

  test("phase 1 is marked done with feature matrix and CLI targeting rules frozen", () => {
    const plan = fs.readFileSync(planPath, "utf8");

    const requiredSnippets = [
      "### Phase 1: Contract Definition",
      "- [x] Define ORM feature matrix for `mongo`:",
      "- [x] Freeze naming/targeting rules for NoSQL CLI usage:",
      "### Phase 1 Output: Mongo Feature Matrix (Contract Baseline)",
      "#### Supported",
      "#### Partial",
      "#### Unsupported (by contract)",
      "### Phase 1 Output: CLI Targeting Rules (Frozen)",
      "--mongo --test",
      "`--all-connections` semantics:",
    ];

    for (const snippet of requiredSnippets) {
      expect(plan).toContain(snippet);
    }
  });

  test("phase 2 is marked done with runtime parity output documented", () => {
    const plan = fs.readFileSync(planPath, "utf8");

    const requiredSnippets = [
      "### Phase 2: Runtime Parity Baseline",
      "- [x] Validate CRUD behavior parity expectations for NoSQL models.",
      "- [x] Validate relation mixin behavior and edge-case handling in NoSQL paths.",
      "- [x] Define transaction/session behavior policy for NoSQL operations.",
      "### Phase 2 Output: Runtime Parity Baseline",
      "Mongo primary-key resolution parity:",
      "Mongo connection routing parity:",
      "Relation mixin edge-case parity:",
      "Transaction/session policy (current contract):",
    ];

    for (const snippet of requiredSnippets) {
      expect(plan).toContain(snippet);
    }
  });

  test("phase 3 is marked done with CLI integration parity output documented", () => {
    const plan = fs.readFileSync(planPath, "utf8");

    const requiredSnippets = [
      "### Phase 3: CLI Integration Parity",
      "- [x] Add NoSQL-aware coverage for command families:",
      "- [x] Ensure unsupported SQL-only commands fail clearly for NoSQL with actionable messages.",
      "### Phase 3 Output: CLI Integration Parity",
      "src/lab_test/nosql.cli.phase3.parity.logic.test.ts",
      "`make:*`:",
      "`db:seed*`:",
      "`demo:scenario`:",
      "status/precheck:",
      "`migrate:run`",
      "`make:migration`",
    ];

    for (const snippet of requiredSnippets) {
      expect(plan).toContain(snippet);
    }
  });

  test("phase 4 is marked done with validation and quality gate output documented", () => {
    const plan = fs.readFileSync(planPath, "utf8");

    const requiredSnippets = [
      "### Phase 4: Validation and Quality Gates",
      "- [x] Add focused NoSQL integration tests for app + test environments.",
      "- [x] Add release gates to ensure NoSQL regressions fail CI.",
      "- [x] Confirm tarball smoke path does not regress NoSQL runtime wiring.",
      "### Phase 4 Output: Validation and Quality Gates",
      "src/lab_test/nosql.phase4.validation-and-gates.logic.test.ts",
      "new job: `nosql-regression` (`NoSQL Regression Gate`)",
      "scripts/pack-smoke.js",
      "`migrate:status`",
      "`migrate:rollback`",
    ];

    for (const snippet of requiredSnippets) {
      expect(plan).toContain(snippet);
    }
  });

  test("phase 5 is marked done with documentation and release closure output documented", () => {
    const plan = fs.readFileSync(planPath, "utf8");

    const requiredSnippets = [
      "### Phase 5: Documentation and Release Closure",
      "- [x] Publish NoSQL usage guide and limitation matrix.",
      "- [x] Add upgrade notes for projects enabling NoSQL after SQL-first setup.",
      "- [x] Close this plan only after CI and pack-smoke validation are green.",
      "### Phase 5 Output: Documentation and Release Closure",
      "src/documentation/nosql-usage-guide.md",
      "src/documentation/usage-guides.md",
      "src/documentation/upgrade-guide.md",
      "src/documentation/release-qualification-checklist.md",
      "npm run test:pack-smoke",
      "All phases (1 to 5) are complete and locked.",
      "Plan is closed.",
    ];

    for (const snippet of requiredSnippets) {
      expect(plan).toContain(snippet);
    }
  });
});

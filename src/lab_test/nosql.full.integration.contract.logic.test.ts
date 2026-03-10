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
      "Status: IN PROGRESS (Phase 3 Complete)",
      "Target driver family:",
      "`mongo`",
      "No attempt to force SQL migration semantics onto NoSQL.",
      "Next active implementation target is Phase 4 (validation and quality gates).",
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

  test.todo("implement phase 4: CI regression gates and pack-smoke NoSQL checks");
  test.todo("implement phase 5: documentation and release closure");
});

import fs from "fs";
import path from "path";

describe("NoSQL full integration contract plan", () => {
  const rootDir = process.cwd();
  const planPath = path.resolve(
    rootDir,
    "validation tasks/NoSQL-Full-Integration-Plan.md"
  );

  test("plan doc exists and captures planning-only scope", () => {
    const plan = fs.readFileSync(planPath, "utf8");

    const requiredSnippets = [
      "# NoSQL Full Integration Plan",
      "Status: IN PROGRESS (Phase 1 Complete)",
      "Target driver family:",
      "`mongo`",
      "No runtime refactor in this planning task.",
      "Runtime implementation proceeds phase-by-phase after explicit authorization.",
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

  test.todo("implement phase 2: runtime parity baseline for model and relation paths");
  test.todo("implement phase 3: CLI integration parity for make/seed/demo/status flows");
  test.todo("implement phase 4: CI regression gates and pack-smoke NoSQL checks");
  test.todo("implement phase 5: documentation and release closure");
});

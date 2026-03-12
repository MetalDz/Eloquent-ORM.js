import fs from "fs";
import path from "path";

describe("Instance persistence layer plan contract", () => {
  const rootDir = process.cwd();
  const planPath = path.resolve(
    rootDir,
    "validation tasks/Instance-Persistence-Layer-Plan.md"
  );

  test("plan doc exists and freezes the target instance API", () => {
    const plan = fs.readFileSync(planPath, "utf8");

    const requiredSnippets = [
      "# Instance Persistence Layer Plan",
      "Status: IN PROGRESS",
      "`model.fill(data)`",
      "`await model.save()`",
      "`await model.patch(data)`",
      "const user = new User();",
      "await user.save();",
      "await user.patch({ email: \"alice-2@example.com\" });",
    ];

    for (const snippet of requiredSnippets) {
      expect(plan).toContain(snippet);
    }
  });

  test("plan locks the safety model around schema-backed assignment and primary keys", () => {
    const plan = fs.readFileSync(planPath, "utf8");

    const requiredSnippets = [
      "## Safety Contract",
      "`fill()` only accepts schema-backed column fields.",
      "`save()` and `patch()` must persist through existing model `create()` / `update()` logic.",
      "SQL paths must keep placeholder binding and adapter-safe identifiers.",
      "Mongo paths must keep native filter/update objects.",
      "Primary key mutation on persisted models must fail fast.",
    ];

    for (const snippet of requiredSnippets) {
      expect(plan).toContain(snippet);
    }
  });

  test("plan defines phased rollout across state tracking, assignment safety, and runtime behavior", () => {
    const plan = fs.readFileSync(planPath, "utf8");

    const requiredSnippets = [
      "### Phase 1: Contract Freeze",
      "### Phase 2: Persistence State Tracking",
      "### Phase 3: Safe Assignment",
      "### Phase 4: Save/Patch Runtime",
      "### Phase 5: Coverage and Docs",
      "Dirty-field detection",
      "Track original persisted attribute snapshot",
      "`save()` updates only dirty fields",
      "`patch(data)` performs partial persisted updates only.",
    ];

    for (const snippet of requiredSnippets) {
      expect(plan).toContain(snippet);
    }
  });

  test("plan locks acceptance criteria and keeps the scope away from raw SQL", () => {
    const plan = fs.readFileSync(planPath, "utf8");

    const requiredSnippets = [
      "## Acceptance Criteria",
      "Default models expose `fill()`, `save()`, and `patch()`.",
      "`fill()` only accepts schema-backed column fields.",
      "SQL and `mongo` execution remain driver-safe.",
      "Existing CRUD APIs remain intact.",
      "## Non-Goals",
      "No raw SQL update surface.",
      "No mass-assignment of relation or unknown fields.",
      "Runtime implementation is active; end-to-end coverage is still expanding.",
    ];

    for (const snippet of requiredSnippets) {
      expect(plan).toContain(snippet);
    }
  });
});

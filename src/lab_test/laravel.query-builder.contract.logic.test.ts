import fs from "fs";
import path from "path";

describe("Laravel-style query builder plan contract", () => {
  const rootDir = process.cwd();
  const planPath = path.resolve(
    rootDir,
    "validation tasks/Laravel-Style-Query-Builder-Plan.md"
  );

  test("plan doc exists and captures planned status plus target API", () => {
    const plan = fs.readFileSync(planPath, "utf8");

    const requiredSnippets = [
      "# Laravel-Style Query Builder Plan",
      "Status: PLANNED",
      "## Target API",
      "`User.query()`",
      '`.where("status", "active")`',
      '`.with("posts")`',
      "`.first()`",
      "`.get()`",
      "`user.toJSON()`",
      "`user.toObject()`",
    ];

    for (const snippet of requiredSnippets) {
      expect(plan).toContain(snippet);
    }
  });

  test("plan freezes the Laravel-style example contract and current runtime gap", () => {
    const plan = fs.readFileSync(planPath, "utf8");

    const requiredSnippets = [
      "## Example Contract",
      'const user = await User.query()',
      '.where("status", "active")',
      '.with("posts")',
      ".first();",
      "console.log(user?.toJSON());",
      "## Current Gap",
      "`BaseModel` composes `EagerLoadingMixin`, but not `SerializeMixin`.",
      "`CoreModel` exposes `find()` and `all()`, but no generic static `query()` builder.",
      "`MorphableMixin` assumes an ORM query contract",
    ];

    for (const snippet of requiredSnippets) {
      expect(plan).toContain(snippet);
    }
  });

  test("plan defines ordered implementation phases across SQL, mongo, eager loading, and serialization", () => {
    const plan = fs.readFileSync(planPath, "utf8");

    const requiredSnippets = [
      "### Phase 1: Contract Freeze",
      "### Phase 2: Query Builder Core",
      "### Phase 3: SQL Driver Execution",
      "### Phase 4: Mongo Driver Execution",
      "### Phase 5: Eager Loading and Serialization Integration",
      "### Phase 6: Validation, Coverage, and Docs",
      "`mysql`",
      "`pg`",
      "`sqlite`",
      "`mongo`",
      "`SerializeMixin`",
      "`with(...)`",
    ];

    for (const snippet of requiredSnippets) {
      expect(plan).toContain(snippet);
    }
  });

  test("plan locks acceptance criteria and validation strategy for additive rollout", () => {
    const plan = fs.readFileSync(planPath, "utf8");

    const requiredSnippets = [
      "## Acceptance Criteria",
      "Models support `Model.query().where(...).first()` and `Model.query().where(...).get()`.",
      "`toObject()` and `toJSON()` are available on default `BaseModel` instances.",
      "SQL and mongo targets both execute through real driver-aware paths.",
      "Existing `find()` and `all()` behavior remains intact.",
      "## Validation Strategy",
      "Contract test for this plan doc.",
      "Focused logic tests for query-builder runtime.",
      "Cross-driver integration checks for SQL and mongo targets.",
      "## Notes",
      "Runtime implementation is not complete yet.",
    ];

    for (const snippet of requiredSnippets) {
      expect(plan).toContain(snippet);
    }
  });
});

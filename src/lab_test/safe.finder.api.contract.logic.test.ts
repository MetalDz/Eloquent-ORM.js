import fs from "fs";
import path from "path";

describe("Safe finder API plan contract", () => {
  const rootDir = process.cwd();
  const planPath = path.resolve(rootDir, "validation tasks/Safe-Finder-API-Plan.md");

  test("plan doc exists and freezes the allowed safe finder API surface", () => {
    const plan = fs.readFileSync(planPath, "utf8");

    const requiredSnippets = [
      "# Safe Finder API Plan",
      "Status: PLANNED",
      "## Target API",
      "`where(field, value)`",
      "`with(...relations)`",
      "`active()`",
      "`first()`",
      "`get()`",
      "`limit(count)`",
      "`orderBy(field, direction)`",
      "`findBy(field, value)`",
      "`findOneBy(field, value)`",
      "`findAllBy(filters)`",
      "`existsBy(filters)`",
    ];

    for (const snippet of requiredSnippets) {
      expect(plan).toContain(snippet);
    }
  });

  test("plan locks the schema-validation and safe execution contract", () => {
    const plan = fs.readFileSync(planPath, "utf8");

    const requiredSnippets = [
      "## Safety Contract",
      "All filterable fields must be validated against model schema.",
      "All SQL values must use adapter placeholders and bound params.",
      "Identifier handling must use adapter-safe wrapping, never raw concatenation.",
      "Unsupported fields or operators must fail fast.",
      "Raw SQL is out of scope.",
      "## Current Gap",
      "`ScopeMixin` is currently an in-memory post-fetch filter",
    ];

    for (const snippet of requiredSnippets) {
      expect(plan).toContain(snippet);
    }
  });

  test("plan defines phased rollout across schema validation, SQL, mongo, and helpers", () => {
    const plan = fs.readFileSync(planPath, "utf8");

    const requiredSnippets = [
      "### Phase 1: Contract Freeze",
      "### Phase 2: Schema Validation Layer",
      "### Phase 3: SQL Execution Path",
      "### Phase 4: Mongo Execution Path",
      "### Phase 5: Runtime Coverage and Docs",
      "`mongo`",
      "`first()` returns one model or `null`",
      "`get()` returns hydrated model arrays",
      "`with(...relations)` on finder results",
      "`.active()` local-scope behavior",
      "`findOneBy`",
      "`existsBy`",
    ];

    for (const snippet of requiredSnippets) {
      expect(plan).toContain(snippet);
    }
  });

  test("plan locks acceptance criteria and narrower scope against a broad query builder", () => {
    const plan = fs.readFileSync(planPath, "utf8");

    const requiredSnippets = [
      "## Acceptance Criteria",
      "Unknown filter fields are rejected before execution.",
      "SQL execution always uses adapter-safe placeholders and wrapped identifiers.",
      "Mongo execution uses native filter objects.",
      "Existing `find()` and `all()` behavior remains intact.",
      "## Non-Goals",
      "No raw SQL builder API.",
      "No full Laravel-style fluent query builder parity.",
      "## Notes",
      "Runtime implementation is not complete yet.",
    ];

    for (const snippet of requiredSnippets) {
      expect(plan).toContain(snippet);
    }
  });
});

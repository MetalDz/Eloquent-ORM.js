import fs from "fs";
import path from "path";

describe("ORM hardening phase 4 plan contract", () => {
  const rootDir = process.cwd();
  const planPath = path.resolve(
    rootDir,
    "validation tasks/ORM-Hardening-Phase4-Read-Path-And-Persistence-Plan.md"
  );

  test("phase 4 plan covers safe finder, serialization, and instance persistence", () => {
    const plan = fs.readFileSync(planPath, "utf8");

    const requiredSnippets = [
      "# ORM Hardening Phase 4: Read Path and Persistence Plan",
      "Status: PLANNED",
      "`SafeFinder`",
      "`fill()`",
      "`save()`",
      "`patch()`",
      "`delete()` / `restore()` consistency",
      "`src/core/model/SafeFinder.ts` (`301` lines)",
      "`src/core/model/CoreModel.ts` still owns a large share of persistence behavior.",
    ];

    for (const snippet of requiredSnippets) {
      expect(plan).toContain(snippet);
    }
  });

  test("phase 4 plan keeps query safety narrow and locks runtime acceptance", () => {
    const plan = fs.readFileSync(planPath, "utf8");

    const requiredSnippets = [
      "## Non-Goals",
      "No open-ended raw query builder.",
      "No weakening of schema validation or SQL placeholder safety.",
      "## Proposed Work Slices",
      "Keep safe finder restricted to schema-validated fields.",
      "Ensure eager-loaded results serialize correctly through `toObject()` / `toJSON()`.",
      "## Acceptance Criteria",
      "`where`, `first`, `get`, `limit`, `orderBy`, `with`, `active`, `inactive`, and `published` remain safe and deterministic.",
      "`toObject()` / `toJSON()` are available on normal `BaseModel` descendants.",
      "`fill()`, `save()`, and `patch()` work on real SQL and Mongo-backed models.",
      "## Validation Strategy",
      "Real-model SQL and Mongo integration tests.",
    ];

    for (const snippet of requiredSnippets) {
      expect(plan).toContain(snippet);
    }
  });
});

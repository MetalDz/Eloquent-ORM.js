import fs from "fs";
import path from "path";

describe("ORM hardening phase 1 plan contract", () => {
  const rootDir = process.cwd();
  const planPath = path.resolve(
    rootDir,
    "validation tasks/ORM-Hardening-Phase1-Architecture-And-Boundaries-Plan.md"
  );

  test("phase 1 plan freezes architecture goals and boundary hotspots", () => {
    const plan = fs.readFileSync(planPath, "utf8");

    const requiredSnippets = [
      "# ORM Hardening Phase 1: Architecture and Public Boundaries Plan",
      "Status: COMPLETED",
      "## Goal",
      "`CoreModel`",
      "`BaseModel`",
      "`SafeFinder`",
      "`BaseModel`",
      "`SqlModel`",
      "`MongoModel`",
      "`src/core/model/CoreModel.ts` (`688` lines)",
      "`src/core/model/BaseModel.ts` (`305` lines)",
      "`src/cli/eloquent.ts` (`230` lines)",
      "`validation tasks/ORM-Hardening-Phase1-Implementation-Notes.md`",
    ];

    for (const snippet of requiredSnippets) {
      expect(plan).toContain(snippet);
    }
  });

  test("phase 1 plan includes non-goals, extraction work, and acceptance criteria", () => {
    const plan = fs.readFileSync(planPath, "utf8");

    const requiredSnippets = [
      "## Non-Goals",
      "No mass rewrite of model inheritance.",
      "No breaking rename of public model exports.",
      "## Proposed Work Slices",
      "Add a model/export boundary matrix",
      "Lock tests around the default runtime stack used by generated models.",
      "\"core persistence behavior\"",
      "\"composed convenience surface\"",
      "## Acceptance Criteria",
      "The role of `CoreModel`, `BaseModel`, and public exports is explicit and testable.",
      "`BaseModel`, `SqlModel`, and `MongoModel` resolve to the intended default runtime stack.",
      "## Validation Strategy",
      "`npm run typecheck`",
      "ORM-Hardening-Phase1-Completion-Review.md",
    ];

    for (const snippet of requiredSnippets) {
      expect(plan).toContain(snippet);
    }
  });

  test("phase 1 implementation notes file exists", () => {
    const notesPath = path.resolve(
      rootDir,
      "validation tasks/ORM-Hardening-Phase1-Implementation-Notes.md"
    );

    expect(fs.existsSync(notesPath)).toBe(true);
  });

  test("phase 1 completion review file exists", () => {
    const reviewPath = path.resolve(
      rootDir,
      "validation tasks/ORM-Hardening-Phase1-Completion-Review.md",
    );

    expect(fs.existsSync(reviewPath)).toBe(true);
  });
});

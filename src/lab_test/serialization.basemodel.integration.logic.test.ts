import fs from "fs";
import path from "path";

describe("Serialization BaseModel integration plan contract", () => {
  const rootDir = process.cwd();
  const planPath = path.resolve(
    rootDir,
    "validation tasks/Serialization-BaseModel-Integration-Plan.md"
  );

  test("plan doc exists and captures the default serialization target API", () => {
    const plan = fs.readFileSync(planPath, "utf8");

    const requiredSnippets = [
      "# Serialization BaseModel Integration Plan",
      "Status: PLANNED",
      "## Goal",
      "`toObject()`",
      "`toJSON()`",
      'const user = await new User().with("posts").find(1);',
      "console.log(user?.toJSON());",
    ];

    for (const snippet of requiredSnippets) {
      expect(plan).toContain(snippet);
    }
  });

  test("plan freezes current composition gap and serialization-only scope", () => {
    const plan = fs.readFileSync(planPath, "utf8");

    const requiredSnippets = [
      "## Current Gap",
      "`SerializeMixin` already exists",
      "`BaseModel` does not currently compose `SerializeMixin`.",
      "## Scope",
      "Default `BaseModel` composition",
      "Nested relation serialization",
      "SQL and mongo model parity",
      "## Non-Goals",
      "No full Laravel-style `query().where().first()` builder in this work.",
    ];

    for (const snippet of requiredSnippets) {
      expect(plan).toContain(snippet);
    }
  });

  test("plan defines additive rollout phases for composition, semantics, and parity", () => {
    const plan = fs.readFileSync(planPath, "utf8");

    const requiredSnippets = [
      "### Phase 1: Contract Freeze",
      "### Phase 2: BaseModel Composition",
      "### Phase 3: Runtime Serialization Semantics",
      "### Phase 4: Cross-Driver Validation",
      "### Phase 5: Coverage and Docs",
      "`hidden`",
      "`appends`",
      "`mongo`",
      "`with()`",
    ];

    for (const snippet of requiredSnippets) {
      expect(plan).toContain(snippet);
    }
  });

  test("plan locks acceptance criteria and validation strategy for default model serialization", () => {
    const plan = fs.readFileSync(planPath, "utf8");

    const requiredSnippets = [
      "## Acceptance Criteria",
      "Any normal model extending `BaseModel` exposes `toObject()` and `toJSON()`.",
      '`new User().with("posts").find(1)` returns a model that can be serialized directly.',
      "Nested eager-loaded relations serialize recursively.",
      "No query-builder API is introduced as part of this change.",
      "## Validation Strategy",
      "Contract test for this plan doc.",
      "Focused runtime tests around `BaseModel` serialization.",
      "Typecheck pass after mixin integration.",
      "Runtime implementation is not complete yet.",
    ];

    for (const snippet of requiredSnippets) {
      expect(plan).toContain(snippet);
    }
  });
});

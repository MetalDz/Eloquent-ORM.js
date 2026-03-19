import fs from "fs";
import path from "path";

describe("Hot Fix base code step 03 runtime CRUD contract and coverage", () => {
  const rootDir = process.cwd();
  const stepPath = path.resolve(
    rootDir,
    "validation tasks/Hot-Fix-Base-Code-Step-03-Runtime-CRUD-Contract-Tests.md"
  );
  const coveragePath = path.resolve(
    rootDir,
    "validation tasks/Hot-Fix-Base-Code-Step-03-Runtime-CRUD-Coverage.md"
  );

  test("step 03 freezes the first runtime suites and loaded-instance CRUD assertions", () => {
    const step = fs.readFileSync(stepPath, "utf8");

    const requiredSnippets = [
      "# Hot Fix Base Code Step 03 - Runtime CRUD Contract Tests",
      "Status: READY",
      "## Existing suites that will change first",
      "src/lab_test/instance.persistence.layer.runtime.logic.test.ts",
      "src/lab_test/real.model.instance.persistence.integration.logic.test.ts",
      "src/lab_test/generated.model.instance.persistence.cli.logic.test.ts",
      "src/lab_test/scenario.generated.model.instance.persistence.logic.test.ts",
      "## Required runtime assertions",
      "await User.create({ ... })",
      "await User.find(id)",
      "found.update({ ... });",
      "await found.save();",
      "await found.patch({ ... })",
      "await found.delete();",
      "await found.restore();",
      "## Generated artifact alignment in this slice",
      "## Compatibility rules",
      "this slice is additive first",
      "## Exit criteria",
    ];

    for (const snippet of requiredSnippets) {
      expect(step).toContain(snippet);
    }
  });

  test("step 03 coverage file freezes the first runtime CRUD regression branches", () => {
    const coverage = fs.readFileSync(coveragePath, "utf8");

    const requiredSnippets = [
      "# Hot Fix Base Code Step 03 - Runtime CRUD Coverage",
      "Status: READY",
      "## Coverage branches for the first runtime slice",
      "loaded-instance SQL create through `fill(...) + save()`",
      "loaded-instance Mongo create through `fill(...) + save()`",
      "loaded-instance SQL update through `update({...}) + save()`",
      "loaded-instance Mongo update through `update({...}) + save()`",
      "loaded-instance SQL delete through `delete()`",
      "loaded-instance Mongo delete through `delete()`",
      "loaded-instance SQL soft-delete restore through `restore()`",
      "loaded-instance Mongo soft-delete restore through `restore()`",
      "generated SQL model runtime examples matching the new update contract",
      "generated Mongo model runtime examples matching the new update contract",
      "## Suites expected to carry the first coverage changes",
      "## Guard rules",
      "preserve 100% statement, branch, function, and line coverage",
      "## Exit criteria",
    ];

    for (const snippet of requiredSnippets) {
      expect(coverage).toContain(snippet);
    }
  });
});

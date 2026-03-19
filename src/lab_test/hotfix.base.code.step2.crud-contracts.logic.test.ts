import fs from "fs";
import path from "path";

describe("Hot Fix base code step 02 CRUD contract and coverage targets", () => {
  const rootDir = process.cwd();
  const stepPath = path.resolve(
    rootDir,
    "validation tasks/Hot-Fix-Base-Code-Step-02-CRUD-Contract-Tests.md"
  );
  const coveragePath = path.resolve(
    rootDir,
    "validation tasks/Hot-Fix-Base-Code-Step-02-CRUD-Coverage.md"
  );

  test("step 02 freezes the contract-test inventory and public CRUD assertions", () => {
    const step = fs.readFileSync(stepPath, "utf8");

    const requiredSnippets = [
      "# Hot Fix Base Code Step 02 - CRUD Contract Tests",
      "Status: READY",
      "## Existing tests that this slice governs",
      "src/lab_test/instance.persistence.layer.contract.logic.test.ts",
      "src/lab_test/instance.persistence.layer.runtime.logic.test.ts",
      "src/lab_test/real.model.instance.persistence.integration.logic.test.ts",
      "src/lab_test/generated.model.instance.persistence.cli.logic.test.ts",
      "src/lab_test/scenario.generated.model.instance.persistence.logic.test.ts",
      "## Contract assertions to add or update",
      "keep `new User(); user.fill(...); await user.save();` as a public creation path",
      "add the Laravel-like static target: `await User.create({ ... })`",
      "keep `await User.find(1)` as the public primary-key read path",
      "found.update({ ... });",
      "await found.save();",
      "keep `patch()` as the partial persisted update path",
      "await found.delete();",
      "await found.restore();",
      "`updateById`",
      "`deleteById`",
      "`restoreById`",
      "track, but do not silently imply implementation of:",
      "`createMany`",
      "`updateMany`",
      "`patchMany`",
      "`deleteMany`",
      "`restoreMany`",
      "## Generated artifact contract follow-up",
      "## Documentation alignment required by this slice",
    ];

    for (const snippet of requiredSnippets) {
      expect(step).toContain(snippet);
    }
  });

  test("step 02 coverage file freezes the regression branches and baseline floor", () => {
    const coverage = fs.readFileSync(coveragePath, "utf8");

    const requiredSnippets = [
      "# Hot Fix Base Code Step 02 - CRUD Coverage Targets",
      "Status: READY",
      "## Required regression targets",
      "SQL loaded-instance create through `fill(...) + save()`",
      "Mongo loaded-instance create through `fill(...) + save()`",
      "static `User.create(...)` contract path once introduced",
      "loaded-instance `found.update({...}); await found.save();`",
      "persisted-instance `await found.patch({...});`",
      "loaded-instance `await found.delete();`",
      "loaded soft-delete `await found.restore();`",
      "## Files expected to carry new or updated coverage",
      "src/lab_test/instance.persistence.layer.runtime.logic.test.ts",
      "src/lab_test/real.model.instance.persistence.integration.logic.test.ts",
      "src/lab_test/generated.model.instance.persistence.cli.logic.test.ts",
      "## Guard rules",
      "statement, branch, function, and line coverage must stay at the captured Step-01 baseline",
      "## Exit criteria",
      "Statements   : 100% (6290/6290)",
      "Branches     : 100% (3326/3326)",
      "Functions    : 100% (1031/1031)",
      "Lines        : 100% (5954/5954)",
    ];

    for (const snippet of requiredSnippets) {
      expect(coverage).toContain(snippet);
    }
  });
});

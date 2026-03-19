import fs from "fs";
import path from "path";

describe("Hot Fix base code step 06 by-id helpers runtime", () => {
  const rootDir = process.cwd();
  const stepPath = path.resolve(
    rootDir,
    "validation tasks/Hot-Fix-Base-Code-Step-06-ById-Helpers-Runtime.md"
  );
  const coveragePath = path.resolve(
    rootDir,
    "validation tasks/Hot-Fix-Base-Code-Step-06-ById-Helpers-Coverage.md"
  );

  test("step 06 freezes the explicit by-id helper scope", () => {
    const step = fs.readFileSync(stepPath, "utf8");

    const requiredSnippets = [
      "# Hot Fix Base Code Step 06 - ById Helpers Runtime",
      "Status: IN PROGRESS",
      "add static `Model.updateById(id, data, pk?)`",
      "add static `Model.deleteById(id, pk?)`",
      "add static `Model.restoreById(id, pk?)`",
      "keep existing instance by-id compatibility paths during the hot-fix phase",
    ];

    for (const snippet of requiredSnippets) {
      expect(step).toContain(snippet);
    }
  });

  test("step 06 coverage file freezes the helper regression targets", () => {
    const coverage = fs.readFileSync(coveragePath, "utf8");

    const requiredSnippets = [
      "# Hot Fix Base Code Step 06 - ById Helpers Coverage",
      "Status: IN PROGRESS",
      "SQL `Model.updateById(...)`",
      "Mongo `Model.updateById(...)`",
      "SQL `Model.deleteById(...)`",
      "Mongo `Model.deleteById(...)`",
      "SQL `Model.restoreById(...)`",
      "Mongo `Model.restoreById(...)`",
    ];

    for (const snippet of requiredSnippets) {
      expect(coverage).toContain(snippet);
    }
  });
});

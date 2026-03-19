import fs from "fs";
import path from "path";

describe("Hot Fix base code step 08 controller and scenario docs", () => {
  const rootDir = process.cwd();
  const stepPath = path.resolve(
    rootDir,
    "validation tasks/Hot-Fix-Base-Code-Step-08-Controller-And-Scenario-Docs.md",
  );
  const coveragePath = path.resolve(
    rootDir,
    "validation tasks/Hot-Fix-Base-Code-Step-08-Controller-And-Scenario-Coverage.md",
  );

  test("step 08 freezes controller and scenario docs alignment", () => {
    const step = fs.readFileSync(stepPath, "utf8");

    const requiredSnippets = [
      "# Hot Fix Base Code Step 08 - Controller and Scenario Docs",
      "Status: IN PROGRESS",
      "`User.find(...)`",
      "`User.create(...)`",
      "`update(...); save()`",
      "`User.deleteById(...)`",
      "`User.restoreById(...)`",
    ];

    for (const snippet of requiredSnippets) {
      expect(step).toContain(snippet);
    }
  });

  test("step 08 coverage file freezes controller and scenario doc surface", () => {
    const coverage = fs.readFileSync(coveragePath, "utf8");

    const requiredSnippets = [
      "# Hot Fix Base Code Step 08 - Controller and Scenario Coverage",
      "Status: IN PROGRESS",
      "docs/getting-started/controllers.mdx",
      "src/documentation/usage-guides-controller.md",
      "docs/getting-started/common-scenarios.mdx",
      "src/documentation/common-scenarios.md",
      "src/lab_test/documentation.usage.gaps.logic.test.ts",
    ];

    for (const snippet of requiredSnippets) {
      expect(coverage).toContain(snippet);
    }
  });
});

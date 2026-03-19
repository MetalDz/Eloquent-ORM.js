import fs from "fs";
import path from "path";

describe("Hot Fix base code step 01 freeze and baseline", () => {
  const rootDir = process.cwd();
  const checklistPath = path.resolve(rootDir, "validation tasks/Hot-Fix-Base-Code-Checklist.md");
  const stepPath = path.resolve(
    rootDir,
    "validation tasks/Hot-Fix-Base-Code-Step-01-Freeze-And-Baseline.md"
  );
  const baselinePath = path.resolve(rootDir, "validation tasks/Hot-Fix-Base-Code-Baseline.md");

  test("checklist status and pre-change gates move from planned to in-progress with captured baselines", () => {
    const checklist = fs.readFileSync(checklistPath, "utf8");

    expect(checklist).toContain("Status: IN PROGRESS");
    expect(checklist).toContain(
      "- [x] Capture the current `npm run test:coverage` baseline before the first API hot-fix change."
    );
    expect(checklist).toContain(
      "- [x] Capture the current `npm run test:pack-smoke` baseline before the first API hot-fix change."
    );
    expect(checklist).toContain(
      "- [x] List the exact public methods, aliases, and examples that will change."
    );
    expect(checklist).toContain(
      "- [x] Mark the change as additive, deprecating, or breaking before implementation starts."
    );
  });

  test("step 01 file freezes the public CRUD target and change classification", () => {
    const step = fs.readFileSync(stepPath, "utf8");

    const requiredSnippets = [
      "# Hot Fix Base Code Step 01 - Freeze And Baseline",
      "Status: COMPLETED",
      "## Change classification",
      "Additive:",
      "Deprecating:",
      "Breaking:",
      "static `create(...)` public path",
      "`updateById`",
      "`deleteById`",
      "`restoreById`",
      "const created = await User.create({ name: \"Alice\", email: \"alice@example.com\" });",
      "found.update({ name: \"Alice Updated\" });",
      "await found.save();",
      "await found.patch({ name: \"Alice Patch\" });",
      "await found.delete();",
      "await foundToRestore.restore();",
      "## Exact public paths that will change",
      "## Docs and examples that must move with the code",
      "docs/api/querying.mdx",
      "docs/api/models.mdx",
    ];

    for (const snippet of requiredSnippets) {
      expect(step).toContain(snippet);
    }
  });

  test("baseline file records the current coverage floor and pack-smoke result", () => {
    const baseline = fs.readFileSync(baselinePath, "utf8");

    const requiredSnippets = [
      "# Hot Fix Base Code Baseline",
      "Status: CAPTURED",
      "## Coverage baseline",
      "npm run test:coverage",
      "Statements   : 100% (6290/6290)",
      "Branches     : 100% (3326/3326)",
      "Functions    : 100% (1031/1031)",
      "Lines        : 100% (5954/5954)",
      "## Pack-smoke baseline",
      "npm run test:pack-smoke",
      "Tarball smoke passed.",
      "Mongo live runtime smoke remains optional and environment-gated for pack-smoke.",
    ];

    for (const snippet of requiredSnippets) {
      expect(baseline).toContain(snippet);
    }
  });
});

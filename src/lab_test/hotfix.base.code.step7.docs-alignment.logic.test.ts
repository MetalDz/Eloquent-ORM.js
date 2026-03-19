import fs from "fs";
import path from "path";

describe("Hot Fix base code step 07 docs alignment", () => {
  const rootDir = process.cwd();
  const stepPath = path.resolve(rootDir, "validation tasks/Hot-Fix-Base-Code-Step-07-Docs-Alignment.md");
  const coveragePath = path.resolve(rootDir, "validation tasks/Hot-Fix-Base-Code-Step-07-Docs-Coverage.md");

  test("step 07 freezes the docs-alignment purpose and new public recommendation", () => {
    const step = fs.readFileSync(stepPath, "utf8");

    const requiredSnippets = [
      "# Hot Fix Base Code Step 07 - Docs Alignment",
      "Status: IN PROGRESS",
      "`User.create(...)`",
      "`User.find(...)`",
      "`found.update(...); await found.save()`",
      "`await found.delete()`",
      "`await found.restore()`",
      "`User.updateById(...)`",
      "`User.deleteById(...)`",
      "`User.restoreById(...)`",
    ];

    for (const snippet of requiredSnippets) {
      expect(step).toContain(snippet);
    }
  });

  test("step 07 coverage file freezes the docs and smoke-test surface", () => {
    const coverage = fs.readFileSync(coveragePath, "utf8");

    const requiredSnippets = [
      "# Hot Fix Base Code Step 07 - Docs Coverage",
      "Status: IN PROGRESS",
      "docs/getting-started/usage-guides.mdx",
      "docs/getting-started/services.mdx",
      "docs/getting-started/controllers.mdx",
      "docs/getting-started/cookbook.mdx",
      "docs/orm/soft-deletes.mdx",
      "src/lab_test/documentation.usage.gaps.logic.test.ts",
    ];

    for (const snippet of requiredSnippets) {
      expect(coverage).toContain(snippet);
    }
  });
});

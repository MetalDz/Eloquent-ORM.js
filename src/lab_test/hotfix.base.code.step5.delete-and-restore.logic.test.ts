import fs from "fs";
import path from "path";

describe("Hot Fix base code step 05 delete and restore runtime", () => {
  const rootDir = process.cwd();
  const stepPath = path.resolve(
    rootDir,
    "validation tasks/Hot-Fix-Base-Code-Step-05-Delete-And-Restore-Runtime.md"
  );
  const coveragePath = path.resolve(
    rootDir,
    "validation tasks/Hot-Fix-Base-Code-Step-05-Delete-And-Restore-Coverage.md"
  );

  test("step 05 freezes additive loaded-instance delete and restore scope", () => {
    const step = fs.readFileSync(stepPath, "utf8");

    const requiredSnippets = [
      "# Hot Fix Base Code Step 05 - Delete And Restore Runtime",
      "Status: IN PROGRESS",
      "add loaded-instance `await model.delete()`",
      "add loaded soft-delete `await model.restore()`",
      "keep `delete(id, pk?)` compatibility",
      "keep `restore(id, pk?)` compatibility",
      "`withTrashed().find(...)` chaining",
      "`deleteById` and `restoreById`",
    ];

    for (const snippet of requiredSnippets) {
      expect(step).toContain(snippet);
    }
  });

  test("step 05 coverage file freezes the delete/restore regression targets", () => {
    const coverage = fs.readFileSync(coveragePath, "utf8");

    const requiredSnippets = [
      "# Hot Fix Base Code Step 05 - Delete And Restore Coverage",
      "Status: IN PROGRESS",
      "loaded-instance SQL `delete()`",
      "loaded-instance Mongo `delete()`",
      "loaded-instance SQL `restore()`",
      "loaded-instance Mongo `restore()`",
      "by-id SQL `delete(id, pk?)`",
      "by-id Mongo `delete(id, pk?)`",
      "by-id SQL `restore(id, pk?)`",
      "by-id Mongo `restore(id, pk?)`",
      "persisted instance soft-delete state synchronization after delete and restore",
      "keep 100% statements, branches, functions, and lines",
    ];

    for (const snippet of requiredSnippets) {
      expect(coverage).toContain(snippet);
    }
  });
});

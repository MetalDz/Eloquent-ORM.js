import fs from "fs";
import path from "path";

describe("Hot Fix base code step 04 create and update runtime", () => {
  const rootDir = process.cwd();
  const stepPath = path.resolve(
    rootDir,
    "validation tasks/Hot-Fix-Base-Code-Step-04-Create-And-Update-Runtime.md"
  );
  const coveragePath = path.resolve(
    rootDir,
    "validation tasks/Hot-Fix-Base-Code-Step-04-Create-And-Update-Coverage.md"
  );

  test("step 04 freezes the additive runtime scope", () => {
    const step = fs.readFileSync(stepPath, "utf8");

    const requiredSnippets = [
      "# Hot Fix Base Code Step 04 - Create And Update Runtime",
      "Status: IN PROGRESS",
      "add static `Model.create(data)`",
      "add static `Model.find(id, pk?)`",
      "add loaded-instance `model.update(data)` as an in-memory persisted-model update helper",
      "keep low-level `model.update(id, data, pk?)` compatibility intact",
      "update generated model examples so they teach `update({...}); save()` for normal updates",
      "loaded-instance `delete()` without id",
      "loaded-instance `restore()` without id",
    ];

    for (const snippet of requiredSnippets) {
      expect(step).toContain(snippet);
    }
  });

  test("step 04 coverage file freezes the first additive CRUD runtime branches", () => {
    const coverage = fs.readFileSync(coveragePath, "utf8");

    const requiredSnippets = [
      "# Hot Fix Base Code Step 04 - Create And Update Coverage",
      "Status: IN PROGRESS",
      "static SQL `Model.create(data)`",
      "static Mongo `Model.create(data)`",
      "static SQL `Model.find(id)`",
      "static Mongo `Model.find(id)`",
      "loaded-instance SQL `model.update({...}); await model.save()`",
      "loaded-instance Mongo `model.update({...}); await model.save()`",
      "low-level compatibility `model.update(id, data, pk?)`",
      "generated SQL model example updated to `update({...}); save()`",
      "generated Mongo model example updated to `update({...}); save()`",
      "keep 100% statements, branches, functions, and lines",
    ];

    for (const snippet of requiredSnippets) {
      expect(coverage).toContain(snippet);
    }
  });
});

import fs from "fs";
import path from "path";

describe("Hot Fix base code checklist", () => {
  const rootDir = process.cwd();
  const checklistPath = path.resolve(rootDir, "validation tasks/Hot-Fix-Base-Code-Checklist.md");

  test("checklist locks the hot-fix goal and Laravel-like CRUD direction", () => {
    const checklist = fs.readFileSync(checklistPath, "utf8");

    const requiredSnippets = [
      "# Hot Fix Base Code Checklist",
      "Status: IN PROGRESS",
      "consistent Laravel-like design",
      "This phase is planning and guard-rail setup only.",
      "Keep query reads Laravel-like",
      "Lock the public CRUD shape before implementation:",
      "loaded-instance update with `found.update({...}); await found.save();`",
      "persisted-instance partial update with `await found.patch({...});`",
      "loaded-instance delete with `await found.delete();`",
      "loaded soft-delete restore with `await found.restore();`",
      "createMany",
      "updateMany",
      "patchMany",
      "deleteMany",
      "restoreMany",
      "`updateById`",
      "`deleteById`",
      "`restoreById`",
      "## Public target API snapshot",
      "const created = await User.create({ name: \"Alice\", email: \"alice@example.com\" });",
      "foundToUpdate.update({ name: \"Alice Updated\" });",
      "await foundToDelete.delete();",
      "await foundToRestore.restore();",
    ];

    for (const snippet of requiredSnippets) {
      expect(checklist).toContain(snippet);
    }
  });

  test("checklist captures required previous tests, docs, and coverage gates", () => {
    const checklist = fs.readFileSync(checklistPath, "utf8");

    const requiredSnippets = [
      "## Previous tests that must stay green or be updated intentionally",
      "src/lab_test/instance.persistence.layer.contract.logic.test.ts",
      "src/lab_test/instance.persistence.layer.runtime.logic.test.ts",
      "src/lab_test/safe.finder.api.contract.logic.test.ts",
      "src/lab_test/laravel.query-builder.contract.logic.test.ts",
      "src/lab_test/documentation.usage.gaps.logic.test.ts",
      "npm run test:pack-smoke",
      "## Documentation files that must be reviewed together",
      "docs/getting-started/usage-guides.mdx",
      "docs/api/querying.mdx",
      "docs/api/models.mdx",
      "src/documentation/usage-guides.md",
      "## Runtime section to publish during the hot fix",
      "Add a dedicated `Runtime CRUD patterns` section",
      "Add a dedicated `Runtime querying patterns` section alongside CRUD",
      "Under `Querying`, explain:",
      "`find(id)` vs `findOneBy(field, value)`",
      "safe-finder chaining with `where(...)`, `orderBy(...)`, and `limit(...)`",
      "eager loading with `with(...)` / `load(...)`",
      "scope-based querying",
      "Under `Create`, explain:",
      "when to use `createMany(...)`",
      "Under `Update`, explain:",
      "loaded-instance updates with `update(...) + save()`",
      "direct by-id update via `updateById(...)`",
      "bulk updates via `updateMany(...)`",
      "Under `Delete`, explain:",
      "loaded-instance delete semantics",
      "direct delete by primary key via `deleteById(...)`",
      "bulk deletes via `deleteMany(...)`",
      "Under `Restore`, explain:",
      "direct restore by primary key via `restoreById(...)`",
      "bulk restore via `restoreMany(...)`",
      "## Model section to publish during the hot fix",
      "Separate SQL and Mongo model guidance clearly.",
      "### SQL model documentation scope",
      "Explain MySQL use cases:",
      "Explain PostgreSQL use cases:",
      "Explain SQLite use cases:",
      "`belongsTo`",
      "`hasOne`",
      "`hasMany`",
      "`belongsToMany`",
      "`morphOne`",
      "`morphMany`",
      "`morphTo`",
      "### Mongo model documentation scope",
      "Explain Mongo use cases:",
      "Explain Mongo-specific caveats:",
      "## Coverage guard",
      "No public CRUD hot fix merges with lower statement, branch, function, or line coverage than the captured baseline.",
      "Every added alias or behavior branch gets a matching runtime regression.",
      "npm run test:coverage",
      "npm run docs:lint",
      "npm run docs:build",
    ];

    for (const snippet of requiredSnippets) {
      expect(checklist).toContain(snippet);
    }
  });

  test("checklist defines ordered execution and exit criteria before implementation starts", () => {
    const checklist = fs.readFileSync(checklistPath, "utf8");

    const requiredSnippets = [
      "## Execution order",
      "1. Freeze the public CRUD target and alias strategy.",
      "2. Update contract tests first.",
      "5. Update docs and examples.",
      "7. Only then start implementation or refactor slices if the checklist remains green.",
      "## Exit criteria",
      "One clear Laravel-like CRUD recommendation is documented.",
      "The public target API snapshot is either implemented or explicitly broken into tracked follow-up slices with no undocumented drift.",
      "No conflicting CRUD examples remain in docs.",
      "Runtime CRUD patterns are documented in a way that explains creation, update, delete, and restore precisely.",
      "Runtime querying patterns are documented in a way that explains single-record reads, collection reads, eager loading, scopes, and service-layer query composition.",
      "Model documentation clearly separates SQL and Mongo and explains each relation type with use-case guidance.",
      "Coverage is equal to or higher than the captured baseline.",
      "Pack smoke and docs validation pass.",
    ];

    for (const snippet of requiredSnippets) {
      expect(checklist).toContain(snippet);
    }
  });
});

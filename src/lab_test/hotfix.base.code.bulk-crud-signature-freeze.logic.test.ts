import fs from "fs";
import path from "path";

describe("Hot Fix base code bulk CRUD signature freeze", () => {
  const rootDir = process.cwd();
  const taskPath = path.resolve(
    rootDir,
    "validation tasks/Hot-Fix-Base-Code-Bulk-CRUD-Signature-Freeze.md"
  );
  const checklistPath = path.resolve(
    rootDir,
    "validation tasks/Hot-Fix-Base-Code-Checklist.md"
  );
  const step2Path = path.resolve(
    rootDir,
    "validation tasks/Hot-Fix-Base-Code-Step-02-CRUD-Contract-Tests.md"
  );
  const step3Path = path.resolve(
    rootDir,
    "validation tasks/Hot-Fix-Base-Code-Step-03-Runtime-CRUD-Contract-Tests.md"
  );

  test("bulk CRUD signature task freezes one public shape", () => {
    const task = fs.readFileSync(taskPath, "utf8");

    const requiredSnippets = [
      "# Hot Fix Base Code - Bulk CRUD Signature Freeze",
      "Status: IN PROGRESS",
      "`await User.createMany([{ ... }, { ... }])`",
      "`await User.updateMany([1, 2], { status: \"inactive\" })`",
      "`await User.patchMany([{ id: 1, email: \"a@example.com\" }, { id: 2, email: \"b@example.com\" }])`",
      "`await User.deleteMany([1, 2])`",
      "`await User.restoreMany([1, 2])`",
      "`createMany(...)` returns hydrated model instances in the same order as input rows.",
      "`patchMany(...)` applies per-row partial payloads and each item must include the primary key.",
      "No alternate overloads ship during the hot fix.",
    ];

    for (const snippet of requiredSnippets) {
      expect(task).toContain(snippet);
    }
  });

  test("checklist and step docs stay aligned on bulk CRUD signatures", () => {
    const checklist = fs.readFileSync(checklistPath, "utf8");
    const step2 = fs.readFileSync(step2Path, "utf8");
    const step3 = fs.readFileSync(step3Path, "utf8");

    const exactAlignedSnippets = [
      "await User.createMany([{ ... }, { ... }])",
      'await User.updateMany([1, 2], { status: "inactive" })',
      "await User.deleteMany([1, 2])",
      "await User.restoreMany([1, 2])",
    ];

    for (const snippet of exactAlignedSnippets) {
      expect(checklist).toContain(snippet);
      expect(step2).toContain(snippet);
      expect(step3).toContain(snippet);
    }

    expect(checklist).toContain(
      'await User.patchMany([\n  { id: 1, email: "alice+1@example.com" },\n  { id: 2, email: "bob+1@example.com" },\n]);'
    );
    expect(step2).toContain("await User.patchMany([{ id: 1, ... }, { id: 2, ... }])");
    expect(step3).toContain("await User.patchMany([{ id: 1, ... }, { id: 2, ... }])");
  });
});

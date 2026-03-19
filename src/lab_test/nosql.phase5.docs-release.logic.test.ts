import fs from "fs";
import path from "path";

describe("NoSQL phase 5 documentation and release closure", () => {
  const root = process.cwd();

  test("publishes NoSQL usage guide with compatibility matrix", () => {
    const guide = fs.readFileSync(
      path.resolve(root, "src/documentation/nosql-usage-guide.md"),
      "utf8"
    );

    const requiredSnippets = [
      "# NoSQL (Mongo) Usage Guide",
      "## Command Compatibility Matrix",
      "### Supported",
      "### Partial",
      "### Unsupported (by design)",
      "make:migration",
      "migrate:run",
      "migrate:rollback",
      "--mongo --test",
      "--all-connections",
      "SQL adapter API surface on mongo",
      "nosql-regression",
      "test:pack-smoke",
    ];

    for (const snippet of requiredSnippets) {
      expect(guide).toContain(snippet);
    }
  });

  test("usage and upgrade docs contain NoSQL workflow and SQL-first migration guidance", () => {
    const usage = fs.readFileSync(
      path.resolve(root, "src/documentation/usage-guides.md"),
      "utf8"
    );
    const upgrade = fs.readFileSync(
      path.resolve(root, "src/documentation/upgrade-guide.md"),
      "utf8"
    );

    expect(usage).toContain("## 10) NoSQL Workflow (Mongo)");
    expect(usage).toContain("Detailed matrix and contract:");
    expect(usage).toContain("src/documentation/nosql-usage-guide.md");

    expect(upgrade).toContain("### NoSQL Enablement (SQL-first to mixed SQL + Mongo)");
    expect(upgrade).toContain("MONGO_URI");
    expect(upgrade).toContain("db:seed --mongo");
    expect(upgrade).toContain("db:seed:precheck --mongo");
  });

  test("release checklist and CI workflow include NoSQL release closure gates", () => {
    const checklist = fs.readFileSync(
      path.resolve(root, "src/documentation/release-qualification-checklist.md"),
      "utf8"
    );
    const workflow = fs.readFileSync(
      path.resolve(root, ".github/workflows/ci.yml"),
      "utf8"
    );

    expect(checklist).toContain("### 6) NoSQL Regression Gate");
    expect(checklist).toContain("### 7) NoSQL Documentation Closure");
    expect(checklist).toContain("src/documentation/nosql-usage-guide.md");
    expect(workflow).toContain("nosql-regression:");
    expect(workflow).toContain("NoSQL Regression Gate");
    expect(workflow).toContain("src/lab_test/nosql.phase4.validation-and-gates.logic.test.ts");
  });
});

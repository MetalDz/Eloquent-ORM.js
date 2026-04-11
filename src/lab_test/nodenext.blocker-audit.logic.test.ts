import fs from "fs";
import path from "path";

describe("NodeNext blocker audit", () => {
  test("audit records the current post-migration NodeNext snapshot", () => {
    const auditPath = path.resolve(
      process.cwd(),
      "validation tasks/NodeNext-Blocker-Audit.md",
    );
    const content = fs.readFileSync(auditPath, "utf8");

    expect(content).toContain("# NodeNext Blocker Audit");
    expect(content).toContain("Status: UPDATED SNAPSHOT");
    expect(content).toContain('Snapshot date: `2026-04-10`');
    expect(content).toContain('local relative import/require matches in `src` and `bin`: `1348`');
    expect(content).toContain('unique TypeScript files affected: `322`');
    expect(content).toContain('runtime-qualified import/export local specifiers: `1024`');
    expect(content).toContain('runtime-qualified dynamic local specifiers: `195`');
    expect(content).toContain('local `require()` calls: `129`');
    expect(content).toContain('unresolved extensionless local ESM specifiers in actual source scan: `0`');
    expect(content).toContain('`src/lab_test`: `227 files / 1009 matches`');
    expect(content).toContain('`src/cli`: `50 files / 213 matches`');
    expect(content).toContain("The source scan is now AST-based for TypeScript files.");
    expect(content).toContain("Generator and template output");
    expect(content).toContain("CLI TypeScript runtime behavior");
  });
});

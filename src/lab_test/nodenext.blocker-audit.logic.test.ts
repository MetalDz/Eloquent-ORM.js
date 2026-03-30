import fs from "fs";
import path from "path";

describe("NodeNext blocker audit", () => {
  test("audit records the current migration blocker snapshot", () => {
    const auditPath = path.resolve(
      process.cwd(),
      "validation tasks/NodeNext-Blocker-Audit.md",
    );
    const content = fs.readFileSync(auditPath, "utf8");

    expect(content).toContain("# NodeNext Blocker Audit");
    expect(content).toContain("Status: SNAPSHOT LOCKED");
    expect(content).toContain('Snapshot date: `2026-03-30`');
    expect(content).toContain('local relative import/require matches in `src` and `bin`: `1282`');
    expect(content).toContain('unique TypeScript files affected: `340`');
    expect(content).toContain('import/export local specifiers: `1160`');
    expect(content).toContain('local `require()` calls: `122`');
    expect(content).toContain('`src/lab_test`: `214 files / 886 matches`');
    expect(content).toContain('`src/cli`: `48 files / 214 matches`');
    expect(content).toContain("this is not a one-line `tsconfig` change");
    expect(content).toContain("repo-wide module-surface migration");
    expect(content).toContain("Generator and template output");
    expect(content).toContain("CLI TypeScript runtime behavior");
  });
});

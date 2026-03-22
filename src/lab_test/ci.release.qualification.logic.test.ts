import fs from "fs";
import path from "path";

describe("CI release qualification gates", () => {
  const rootDir = process.cwd();

  test("workflow enforces matrix + dependency security policy", () => {
    const workflow = fs.readFileSync(
      path.resolve(rootDir, ".github/workflows/ci.yml"),
      "utf8"
    );

    const requiredSnippets = [
      "typecheck:",
      "build:",
      "test-mysql-smoke:",
      "test-docker-coverage:",
      "critical-stability:",
      "package-smoke:",
      "docs-lint:",
      "docs-build:",
      "package-smoke-windows:",
      "scenario-matrix:",
      "driver: mysql",
      "driver: pg",
      "driver: sqlite",
      "nosql-regression:",
      "NoSQL Regression Gate",
      "Run NoSQL focused regressions",
      "src/lab_test/nosql.phase4.validation-and-gates.logic.test.ts",
      "src/lab_test/nosql.phase15.cli-scenario-runtime.logic.test.ts",
      'ELOQUENT_PACK_SMOKE_ENABLE_MONGO_RUNTIME: "1"',
      "dependency-security:",
      "Ensure lockfile exists",
      "test -f package-lock.json",
      "Install from lockfile (policy)",
      "npm ci --ignore-scripts",
      "Audit production dependencies (high+)",
      "npm audit --omit=dev --audit-level=high",
    ];

    for (const snippet of requiredSnippets) {
      expect(workflow).toContain(snippet);
    }

    expect(workflow).toMatch(
      /test-mysql-smoke:\s+name:\s+Test \(MySQL Smoke\)\s+runs-on:\s+ubuntu-latest\s+timeout-minutes:\s+15/s
    );
    expect(workflow).toMatch(
      /test-docker-coverage:\s+name:\s+Test \(Docker Coverage\)\s+runs-on:\s+ubuntu-latest\s+timeout-minutes:\s+30/s
    );
    expect(workflow).toMatch(
      /critical-stability:\s+name:\s+Critical Stability Re-runs \(MySQL\)\s+runs-on:\s+ubuntu-latest\s+timeout-minutes:\s+25/s
    );
    expect(workflow).toMatch(
      /package-smoke-windows:\s+name:\s+Package Smoke \(Windows Tarball\)\s+runs-on:\s+windows-latest/s
    );
    expect(workflow).toMatch(
      /- name:\s+Repeat critical suites\s+timeout-minutes:\s+15/s
    );
  });

  test("release checklist defines explicit pass/fail criteria", () => {
    const checklist = fs.readFileSync(
      path.resolve(rootDir, "src/documentation/release-qualification-checklist.md"),
      "utf8"
    );

    const requiredChecklistContent = [
      "# Release Qualification Checklist",
      "## Hard Gates",
      "Typecheck + Build + Test",
      "Critical Stability Re-runs",
      "Multi-Driver Scenario Matrix",
      "Package Smoke Validation",
      "Dependency Security and Lockfile Policy",
      "NoSQL Regression Gate",
      "NoSQL Documentation Closure",
      "Pass Criteria",
      "Fail Criteria",
      "Release is allowed only when all hard gates pass",
      "release is blocked",
    ];

    for (const snippet of requiredChecklistContent) {
      expect(checklist).toContain(snippet);
    }
  });
});

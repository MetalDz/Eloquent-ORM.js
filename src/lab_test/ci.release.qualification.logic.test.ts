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
      "quality-gate:",
      "critical-stability:",
      "scenario-matrix:",
      "driver: mysql",
      "driver: pg",
      "driver: sqlite",
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

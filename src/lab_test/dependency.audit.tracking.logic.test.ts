import fs from "fs";
import path from "path";

describe("dependency audit tracking gates", () => {
  const rootDir = process.cwd();

  test("tracking plan captures the remediation decision and closure evidence", () => {
    const plan = fs.readFileSync(
      path.resolve(
        rootDir,
        "validation tasks/Dependency-Security-Audit-Tracking-Plan.md"
      ),
      "utf8"
    );

    const requiredSnippets = [
      "# Dependency Security Audit Tracking Plan",
      "npm audit --omit=dev --audit-level=high",
      "@tootallnate/once <3.0.1",
      "http-proxy-agent",
      "make-fetch-happen",
      "node-gyp",
      "sqlite3",
      "minimatch <=3.1.3",
      "release blocker",
      "sqlite3@5.1.7",
      "node-gyp@8.4.1",
      "make-fetch-happen@9.1.0",
      "http-proxy-agent@4.0.1",
      "@tootallnate/once@1.1.2",
      "glob@7.2.3",
      "minimatch@3.1.2",
      "under `--omit=dev`, the advisory set is rooted in `sqlite3` only",
      "Phase 2: Ordered Remediation Plan",
      "Use `overrides` only as a temporary fallback, not the primary fix.",
      "Avoid as primary strategy: forcing deep transitive overrides for `@tootallnate/once`.",
      "Direct `sqlite3` upgrade path is blocked.",
      "Latest published `sqlite3` remains `5.1.7`",
      "Replaced runtime SQLite integration with `better-sqlite3@12.2.0`.",
      "removed `sqlite3`",
      "removed `sqlite`",
      "added `better-sqlite3`",
      "found 0 vulnerabilities",
      "src/lab_test/sqlite.driver.replacement.logic.test.ts",
    ];

    for (const snippet of requiredSnippets) {
      expect(plan).toContain(snippet);
    }
  });

  test("release readiness docs keep dependency audit policy active", () => {
    const workflow = fs.readFileSync(
      path.resolve(rootDir, ".github/workflows/ci.yml"),
      "utf8"
    );
    const assessment = fs.readFileSync(
      path.resolve(rootDir, "validation tasks/Production-Readiness-Assessment.md"),
      "utf8"
    );
    const checklist = fs.readFileSync(
      path.resolve(rootDir, "src/documentation/release-qualification-checklist.md"),
      "utf8"
    );

    expect(workflow).toContain("dependency-security:");
    expect(workflow).toContain("npm audit --omit=dev --audit-level=high");

    expect(assessment).toContain(
      "validation tasks/Dependency-Security-Audit-Tracking-Plan.md"
    );
    expect(assessment).toContain(
      "src/lab_test/dependency.audit.tracking.logic.test.ts"
    );

    expect(checklist).toContain("Dependency Security and Lockfile Policy");
    expect(checklist).toContain(
      "Production dependency audit reports high/critical vulnerabilities."
    );
  });

  test("runtime and package contract point at the replacement driver", () => {
    const runtimeConnection = fs.readFileSync(
      path.resolve(rootDir, "src/core/connection/DatabaseConnection.ts"),
      "utf8"
    );
    const packageJson = fs.readFileSync(
      path.resolve(rootDir, "package.json"),
      "utf8"
    );

    expect(runtimeConnection).toContain("BetterSqliteConnection");
    expect(runtimeConnection).not.toContain('import * as sqlite3 from "sqlite3";');
    expect(runtimeConnection).not.toContain("driver: sqlite3.Database");
    expect(packageJson).toContain('"better-sqlite3": "12.2.0"');
    expect(packageJson).not.toContain('"sqlite3"');
  });
});

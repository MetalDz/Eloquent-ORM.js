import fs from "fs";
import path from "path";

describe("Coverage source scope", () => {
  const rootDir = process.cwd();
  const configPath = path.resolve(rootDir, "jest.config.cjs");
  const planPath = path.resolve(
    rootDir,
    "validation tasks/Coverage-Source-Scope-Plan.md",
  );

  test("jest coverage excludes dist output and repo fixture trees", () => {
    const config = fs.readFileSync(configPath, "utf8");

    expect(config).toContain('modulePathIgnorePatterns: ["<rootDir>/dist/"]');
    expect(config).toContain('coveragePathIgnorePatterns: ["<rootDir>/dist/"]');
    expect(config).toContain('collectCoverageFrom: [');
    expect(config).toContain('"!src/app/**/*.ts"');
    expect(config).toContain('"!src/test/**/*.ts"');
    expect(config).toContain('"!src/lab_test/**/*.ts"');
    expect(config).toContain('"!src/**/*.d.ts"');
    expect(config).toContain("coverageThreshold: {");
    expect(config).toContain("lines: 100");
    expect(config).toContain("statements: 100");
    expect(config).toContain("functions: 100");
    expect(config).toContain("branches: 100");
  });

  test("the coverage scope fix is tracked", () => {
    const plan = fs.readFileSync(planPath, "utf8");

    expect(plan).toContain("# Coverage Source Scope Plan");
    expect(plan).toContain("Status: COMPLETED");
    expect(plan).toContain("jest.config.cjs");
    expect(plan).toContain("dist/**");
    expect(plan).toContain("src/app/**/*.ts");
    expect(plan).toContain("src/test/**/*.ts");
    expect(plan).toContain("src/lab_test/**/*.ts");
    expect(plan).toContain("src/lab_test/coverage.source-scope.logic.test.ts");
  });
});

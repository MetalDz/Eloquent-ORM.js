import fs from "fs";
import path from "path";

describe("migrate reset CLI banner contract", () => {
  test("plan tracks the updated migrate reset CLI banner expectation", () => {
    const planPath = path.resolve(
      process.cwd(),
      "validation tasks/MigrateReset-CLI-Banner-Contract-Plan.md",
    );
    const content = fs.readFileSync(planPath, "utf8");

    expect(content).toContain("# MigrateReset CLI Banner Contract Plan");
    expect(content).toContain("Status: COMPLETED");
    expect(content).toContain("src/lab_test/cli.integration.migrate.targeting.test.ts");
  });

  test("sqlite integration expectations use the normalized RESET banner", () => {
    const testPath = path.resolve(
      process.cwd(),
      "src/lab_test/cli.integration.migrate.targeting.test.ts",
    );
    const content = fs.readFileSync(testPath, "utf8");

    expect(content).toContain('expect(result.combined).toContain("RESET: development database")');
    expect(content).toContain('expect(result.combined).toContain("RESET: test database")');
    expect(content).not.toContain('expect(result.combined).toContain("Resetting development database")');
    expect(content).not.toContain('expect(result.combined).toContain("Resetting test database")');
  });
});

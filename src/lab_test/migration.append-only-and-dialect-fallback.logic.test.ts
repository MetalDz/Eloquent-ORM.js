import fs from "fs";
import path from "path";

describe("migration append-only and dialect fallback stabilization", () => {
  test("plan tracks the append-only and schema-dialect stabilization slice", () => {
    const planPath = path.resolve(
      process.cwd(),
      "validation tasks/Migration-Append-Only-And-Dialect-Fallback-Plan.md",
    );
    const content = fs.readFileSync(planPath, "utf8");

    expect(content).toContain("# Migration Append-Only And Dialect Fallback Plan");
    expect(content).toContain("Status: COMPLETED");
    expect(content).toContain("src/cli/commands/makeMigration.ts");
    expect(content).toContain("src/lab_test/make.migration.append.only.logic.test.ts");
    expect(content).toContain("src/lab_test/migration.schema.ascii-normalization.logic.test.ts");
    expect(content).toContain(
      "src/lab_test/migration.append-only-and-dialect-fallback.logic.test.ts",
    );
  });
});

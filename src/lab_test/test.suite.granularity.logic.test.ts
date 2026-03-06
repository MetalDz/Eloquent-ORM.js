import fs from "fs";
import path from "path";

describe("test suite granularity", () => {
  const rootDir = process.cwd();

  test("legacy and transitional monolithic CLI integration tests are removed", () => {
    const legacyFile = path.resolve(rootDir, "src/lab_test/cli.integration.test.ts");
    const transitionalFile = path.resolve(
      rootDir,
      "src/lab_test/cli.integration.connection.targeting.test.ts"
    );
    expect(fs.existsSync(legacyFile)).toBe(false);
    expect(fs.existsSync(transitionalFile)).toBe(false);
  });

  test("split CLI integration suites exist and keep one top-level purpose each", () => {
    const splitFiles = [
      "src/lab_test/cli.integration.scenario.lifecycle.test.ts",
      "src/lab_test/cli.integration.make-migration.targeting.test.ts",
      "src/lab_test/cli.integration.migrate.targeting.test.ts",
      "src/lab_test/cli.integration.seed-and-demo.targeting.test.ts",
      "src/lab_test/cli.integration.factory-status.targeting.test.ts",
    ];

    for (const relPath of splitFiles) {
      const abs = path.resolve(rootDir, relPath);
      expect(fs.existsSync(abs)).toBe(true);

      const source = fs.readFileSync(abs, "utf8");
      const describeCount =
        (source.match(/\bdescribeIf\w*\(/g) ?? []).length +
        (source.match(/\bdescribe\(/g) ?? []).length;

      expect(describeCount).toBe(1);
    }
  });
});

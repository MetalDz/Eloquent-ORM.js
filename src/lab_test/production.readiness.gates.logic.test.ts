import fs from "fs";
import path from "path";

describe("production readiness gates", () => {
  test("critical hardening tests exist", () => {
    const requiredTests = [
      "src/lab_test/connection.factory.race.logic.test.ts",
      "src/lab_test/factory.createMany.concurrency.logic.test.ts",
      "src/lab_test/make.model.rollback.logic.test.ts",
      "src/lab_test/migrate.run.empty.detection.logic.test.ts",
      "src/lab_test/migrate.rollback.logic.test.ts",
      "src/lab_test/migration.files.integrity.logic.test.ts",
      "src/lab_test/make.migration.append.only.logic.test.ts",
      "src/lab_test/schema.default.string.escape.logic.test.ts",
      "src/lab_test/cli.production.safety.logic.test.ts",
      "src/lab_test/cli.bootstrap.precheck.logic.test.ts",
    ];

    const missing = requiredTests.filter((relPath) =>
      !fs.existsSync(path.resolve(process.cwd(), relPath))
    );
    expect(missing).toEqual([]);
  });

  test("critical validation task docs exist", () => {
    const requiredDocs = [
      "validation tasks/Factory-CreateMany-Concurrency-Hardening-Plan.md",
      "validation tasks/MigrateRun-Empty-Migration-Detection-Robustness-Plan.md",
      "validation tasks/ConnectionFactory-Cold-Start-Race-Protection-Plan.md",
      "validation tasks/SchemaBuilder-Default-String-Escaping-Hardening-Plan.md",
      "validation tasks/Migration-Append-Only-Tracking-Hardening-Plan.md",
      "validation tasks/Migration-Fixture-Baseline-Integrity-Recovery-Plan.md",
      "validation tasks/ORM-Real-Scenario-CLI-Validation-Plan.md",
      "validation tasks/CLI-Production-Safety-Controls-Plan.md",
    ];

    const missing = requiredDocs.filter((relPath) =>
      !fs.existsSync(path.resolve(process.cwd(), relPath))
    );
    expect(missing).toEqual([]);
  });
});

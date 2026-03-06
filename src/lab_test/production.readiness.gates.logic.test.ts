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
      "src/lab_test/migrate.rollback.partial.recovery.logic.test.ts",
      "src/lab_test/cli.secret.redaction.logic.test.ts",
      "src/lab_test/db.user.role.separation.logic.test.ts",
      "src/lab_test/cli.audit.trail.logic.test.ts",
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
      "validation tasks/MigrateRollback-Partial-Recovery-Workflow-Plan.md",
      "src/documentation/migration-rollback-recovery-runbook.md",
      "validation tasks/Secrets-Access-Hardening-Plan.md",
      "src/documentation/db-least-privilege-env-contract.md",
      "validation tasks/Observability-Audit-Trail-Plan.md",
    ];

    const missing = requiredDocs.filter((relPath) =>
      !fs.existsSync(path.resolve(process.cwd(), relPath))
    );
    expect(missing).toEqual([]);
  });
});

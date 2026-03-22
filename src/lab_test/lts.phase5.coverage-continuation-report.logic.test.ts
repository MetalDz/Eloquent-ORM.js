import fs from "fs";
import path from "path";

describe("LTS phase 5 coverage continuation report", () => {
  const reportPath = path.resolve(
    process.cwd(),
    "validation tasks/LTS-Phase5-Coverage-Continuation-Report.md",
  );

  test("report captures the current Docker v8 baseline and ordered remaining files", () => {
    const report = fs.readFileSync(reportPath, "utf8");

    const requiredSnippets = [
      "# LTS Phase 5 Coverage Continuation Report",
      "Status: COMPLETED",
      "coverage/final-gap-summary-6.json",
      "coverage/final-gap-final-6.json",
      "Statements: `90.9% (1958/2154)`",
      "Branches: `88.15% (387/439)`",
      "Functions: `90.32% (84/93)`",
      "Lines: `90.9% (1958/2154)`",
      "`src/cli/utils/migrations/MigrationLockStrategy.ts` reached `100%`",
      "`src/cli/utils/migrations/MongoMigrationTracker.ts` reached `100%`",
      "`src/cli/commands/migrateStatus.ts` reached `100%`",
      "`src/cli/commands/migrateRun.ts` reached `100%`",
      "`src/cli/commands/migrateRollback.ts` reached `100%`",
      "`src/cli/commands/migrateFresh.ts` reached `100%`",
      "- none; the focused residual subset is closed",
      "- [x] close the `MigrationLockStrategy.ts` residual first",
      "- [x] take `MongoMigrationTracker.ts` to `100%` next",
      "- [x] close `migrateStatus.ts` cleanup and unsupported-path branches",
      "- [x] close `migrateRun.ts` model-filter, no-dir, no-op, dry-run, audit, and exit branches",
      "- [x] close `migrateRollback.ts` remaining Mongo/SQL rollback branches",
      "- [x] close `migrateFresh.ts` remaining cleanup and unsupported-driver branches",
      "- [x] rerun full Docker `v8` coverage only after the focused subset reaches `100%`",
      "`src/lab_test/lts.phase5.coverage-continuation-report.logic.test.ts`",
    ];

    for (const snippet of requiredSnippets) {
      expect(report).toContain(snippet);
    }
  });
});

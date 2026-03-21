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
      "Status: IN PROGRESS",
      "coverage/final-gap-summary-6.json",
      "coverage/final-gap-final-6.json",
      "Statements: `90.9% (1958/2154)`",
      "Branches: `88.15% (387/439)`",
      "Functions: `90.32% (84/93)`",
      "Lines: `90.9% (1958/2154)`",
      "1. `src/cli/utils/migrations/MigrationLockStrategy.ts`",
      "2. `src/cli/utils/migrations/MongoMigrationTracker.ts`",
      "3. `src/cli/commands/migrateStatus.ts`",
      "4. `src/cli/commands/migrateRun.ts`",
      "5. `src/cli/commands/migrateRollback.ts`",
      "6. `src/cli/commands/migrateFresh.ts`",
      "- remaining branch lines: `108`, `120`, `139`",
      "- remaining branch lines: `70`, `100`, `108`, `116`, `142`, `183`, `224`, `333`, `360`, `387`",
      "- remaining branch lines: `104`, `118`, `128`, `138`, `139`, `140`, `144`, `153`, `158`",
      "- remaining branch lines: `148`, `155`, `251`, `286`, `289`, `303`, `321`, `329`, `331`, `340`, `366`, `381`, `398`",
      "- remaining branch lines: `121`, `231`, `280`, `294`, `338`, `345`, `360`",
      "- remaining branch lines: `28`, `64`, `74`, `85`, `131`, `133`, `134`, `143`, `156`",
      "- [ ] close the 3 remaining `MigrationLockStrategy.ts` branches first",
      "- [ ] rerun full Docker `v8` coverage only after the focused subset reaches `100%`",
      "`src/lab_test/lts.phase5.coverage-continuation-report.logic.test.ts`",
    ];

    for (const snippet of requiredSnippets) {
      expect(report).toContain(snippet);
    }
  });
});

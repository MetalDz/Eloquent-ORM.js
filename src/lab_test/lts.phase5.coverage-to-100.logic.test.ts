import fs from "fs";
import path from "path";

describe("LTS phase 5 coverage to 100", () => {
  const rootDir = process.cwd();
  const phasePlanPath = path.resolve(
    rootDir,
    "validation tasks/LTS-Phase5-Coverage-To-100-Plan.md",
  );
  const masterPlanPath = path.resolve(
    rootDir,
    "validation tasks/LTS-Trust-Building-Plan.md",
  );

  test("phase plan records the refreshed baseline and ordered hotspot inventory", () => {
    const plan = fs.readFileSync(phasePlanPath, "utf8");

    const requiredSnippets = [
      "# LTS Phase 5: Coverage To 100 Plan",
      "Status: IN PROGRESS",
      "Statements   : `93.71% (5751/6137)`",
      "Branches     : `87.85% (2980/3392)`",
      "Functions    : `93.48% (933/998)`",
      "Lines        : `94.09% (5454/5796)`",
      "src/cli/utils/migrations/MongoMigrationTracker.ts",
      "src/cli/utils/ModelIntrospector.ts",
      "src/cli/commands/makeController.ts",
      "src/cli/commands/makeService.ts",
      "src/cli/commands/migrateRollback.ts",
      "src/cli/commands/migrateRun.ts",
      "LTS-Phase5-MigrateRun-Coverage-Plan.md",
      "src/cli/commands/demoScenario.ts",
      "LTS-Phase5-MigrateRollback-Coverage-Plan.md",
      "Global `npm run test:coverage` remains the LTS release gate.",
    ];

    for (const snippet of requiredSnippets) {
      expect(plan).toContain(snippet);
    }
  });

  test("master LTS plan remains in progress and shows Phase 5 kickoff progress", () => {
    const masterPlan = fs.readFileSync(masterPlanPath, "utf8");

    const requiredSnippets = [
      "Status: IN PROGRESS",
      "Statements   : `93.71% (5751/6137)`",
      "Branches     : `87.85% (2980/3392)`",
      "Functions    : `93.48% (933/998)`",
      "Lines        : `94.09% (5454/5796)`",
      "### Phase 5: Coverage to 100%",
      "- [x] Refresh the real coverage baseline from `npm run test:coverage`",
      "- [x] Record hotspot order and execution rules in `LTS-Phase5-Coverage-To-100-Plan.md`",
      "- [ ] Use tracked slices to eliminate all remaining runtime/CLI/helper gaps",
      "- [ ] make `100%` coverage a release-blocking LTS gate",
    ];

    for (const snippet of requiredSnippets) {
      expect(masterPlan).toContain(snippet);
    }
  });
});

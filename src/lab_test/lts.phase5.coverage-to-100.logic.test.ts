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
      "Statements   : `96.47% (5885/6100)`",
      "Branches     : `91.13% (3065/3363)`",
      "Functions    : `95.78% (954/996)`",
      "Lines        : `96.82% (5579/5762)`",
      "src/cli/commands/factoryStatus.ts",
      "src/cli/utils/factories/FactoryGraph.ts",
      "src/cli/utils/factories/FactoryRegistry.ts",
      "src/cli/utils/factories/FactoryLoader.ts",
      "LTS-Phase5-Factory-Runtime-Coverage-Plan.md",
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
      "Statements   : `96.47% (5885/6100)`",
      "Branches     : `91.13% (3065/3363)`",
      "Functions    : `95.78% (954/996)`",
      "Lines        : `96.82% (5579/5762)`",
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

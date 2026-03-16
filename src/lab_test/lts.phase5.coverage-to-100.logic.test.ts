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
      "Statements   : `98.71% (6014/6092)`",
      "Branches     : `96.66% (3217/3328)`",
      "Functions    : `97.69% (973/996)`",
      "Lines        : `98.97% (5704/5763)`",
      "src/cli/utils/ImportResolver.ts",
      "LTS-Phase5-ImportResolver-Coverage-Plan.md",
      "src/cli/utils/CliCommandTargets.ts",
      "LTS-Phase5-CliCommandTargets-Coverage-Plan.md",
      "src/cli/utils/ArtifactStorage.ts",
      "LTS-Phase5-ArtifactStorage-Coverage-Plan.md",
      "src/cli/utils/ArtifactRoutingReport.ts",
      "LTS-Phase5-ArtifactRoutingReport-Coverage-Plan.md",
      "src/cli/commands/factoryStatus.ts",
      "src/cli/utils/factories/FactoryGraph.ts",
      "src/cli/utils/factories/FactoryRegistry.ts",
      "src/cli/utils/factories/FactoryLoader.ts",
      "LTS-Phase5-Factory-Runtime-Coverage-Plan.md",
      "LTS-Phase5-Factory-Runtime-Residual-Coverage-Plan.md",
      "src/cli/utils/migrations/MongoMigrationTracker.ts",
      "LTS-Phase5-MongoMigrationTracker-Coverage-Plan.md",
      "src/cli/utils/ModelIntrospector.ts",
      "LTS-Phase5-ModelIntrospector-Coverage-Plan.md",
      "src/cli/commands/makeController.ts",
      "LTS-Phase5-MakeController-Coverage-Plan.md",
      "src/cli/commands/makeService.ts",
      "LTS-Phase5-MakeService-Coverage-Plan.md",
      "src/cli/commands/makeRegistry.ts",
      "LTS-Phase5-MakeRegistry-Coverage-Plan.md",
      "src/cli/utils/fileWriter.ts",
      "LTS-Phase5-FileWriter-Coverage-Plan.md",
      "src/cli/commands/migrateReset.ts",
      "LTS-Phase5-MigrateReset-Coverage-And-ASCII-Plan.md",
      "src/cli/commands/migrateRollback.ts",
      "src/cli/commands/migrateRun.ts",
      "LTS-Phase5-MigrateRun-Coverage-Plan.md",
      "src/core/connection/DatabaseConnection.ts",
      "LTS-Phase5-DatabaseConnection-Coverage-And-ASCII-Plan.md",
      "src/cli/commands/demoScenario.ts",
      "LTS-Phase5-DemoScenario-Coverage-Plan.md",
      "src/cli/commands/makeFactory.ts",
      "LTS-Phase5-MakeFactory-Coverage-And-ASCII-Plan.md",
      "src/cli/commands/makeMigration.ts",
      "LTS-Phase5-MakeMigration-Coverage-Plan.md",
      "src/cli/commands/makeScenario.ts",
      "LTS-Phase5-MakeScenario-Coverage-Plan.md",
      "src/core/model/BaseModel.ts",
      "LTS-Phase5-BaseModel-Coverage-Plan.md",
      "src/core/model/SafeFinder.ts",
      "LTS-Phase5-SafeFinder-Coverage-Plan.md",
      "src/core/orm/mixins/MorphableMixin.ts",
      "LTS-Phase5-MorphableMixin-Coverage-And-ASCII-Plan.md",
      "src/core/cache/CacheFallbackManager.ts",
      "src/core/cache/drivers/FileCacheDriver.ts",
      "LTS-Phase5-Cache-Runtime-Coverage-Plan.md",
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
      "Statements   : `98.71% (6014/6092)`",
      "Branches     : `96.66% (3217/3328)`",
      "Functions    : `97.69% (973/996)`",
      "Lines        : `98.97% (5704/5763)`",
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

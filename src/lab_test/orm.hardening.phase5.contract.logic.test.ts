import fs from "fs";
import path from "path";

describe("ORM hardening phase 5 plan contract", () => {
  const rootDir = process.cwd();
  const planPath = path.resolve(
    rootDir,
    "validation tasks/ORM-Hardening-Phase5-CLI-Decomposition-And-Operations-Plan.md"
  );

  test("phase 5 plan targets CLI decomposition and the weakest operational modules", () => {
    const plan = fs.readFileSync(planPath, "utf8");

    const requiredSnippets = [
      "# ORM Hardening Phase 5: CLI Decomposition and Operations Plan",
      "Status: COMPLETED",
      "`src/cli/eloquent.ts`",
      "`src/cli/commands/demoScenario.ts`",
      "`src/cli/commands/makeController.ts`",
      "`src/cli/commands/makeService.ts`",
      "`src/cli/utils/ModelIntrospector.ts`",
      "`src/cli/utils/fileWriter.ts`",
      "`src/cli/utils/migrations/MongoMigrationTracker.ts`",
      "`src/cli/eloquent.ts` (`1042` lines)",
      "`src/cli/commands/demoScenario.ts`: branches `25%`",
      "`src/cli/commands/makeController.ts`: branches `0%`",
      "`src/cli/commands/makeService.ts`: branches `0%`",
      "`src/cli/utils/ModelIntrospector.ts`: branches `0%`",
      "`src/cli/utils/fileWriter.ts`: branches `30%`",
    ];

    for (const snippet of requiredSnippets) {
      expect(plan).toContain(snippet);
    }
  });

  test("phase 5 plan preserves production safety while driving coverage into command hotspots", () => {
    const plan = fs.readFileSync(planPath, "utf8");

    const requiredSnippets = [
      "## Non-Goals",
      "No breaking CLI flag removals without a migration plan.",
      "No hidden production bypass for `make:factory`, `make:seed`, `make:scenario`, or `db:seed`.",
      "## Proposed Work Slices",
      "Isolate command registration concerns from command implementation concerns.",
      "Keep built CLI and pack-smoke coverage aligned with direct command tests.",
      "Start with `fileWriter` create/skip/overwrite/error branch coverage and deterministic console reporting.",
      "## Acceptance Criteria",
      "`eloquent.ts` has a clearer operational boundary and less direct responsibility concentration.",
      "The current lowest-coverage CLI/helper files have dedicated tests and materially better coverage.",
      "Production safety behavior remains explicit and testable across drivers.",
      "## Validation Strategy",
      "`npm run build`",
      "`npm run test:pack-smoke`",
    ];

    for (const snippet of requiredSnippets) {
      expect(plan).toContain(snippet);
    }
  });
});

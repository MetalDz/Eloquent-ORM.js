import fs from "fs";
import path from "path";

describe("ORM hardening phase 2 plan contract", () => {
  const rootDir = process.cwd();
  const planPath = path.resolve(
    rootDir,
    "validation tasks/ORM-Hardening-Phase2-Driver-Parity-And-Artifact-Routing-Plan.md"
  );

  test("phase 2 plan targets driver parity and artifact routing hotspots", () => {
    const plan = fs.readFileSync(planPath, "utf8");

    const requiredSnippets = [
      "# ORM Hardening Phase 2: Driver Parity and Artifact Routing Plan",
      "Status: COMPLETED",
      "`--mongo`",
      "`--pg`",
      "`--mysql`",
      "`--sqlite`",
      "`ArtifactStorage`",
      "`resolveConnectionName`",
      "`MongoMigrationTracker`",
      "`src/cli/utils/ArtifactStorage.ts` (`263` lines)",
      "`src/cli/utils/migrations/MongoMigrationTracker.ts`: branches `0%`",
    ];

    for (const snippet of requiredSnippets) {
      expect(plan).toContain(snippet);
    }
  });

  test("phase 2 plan locks deterministic mixed-artifact behavior and validation", () => {
    const plan = fs.readFileSync(planPath, "utf8");

    const requiredSnippets = [
      "## Non-Goals",
      "No hidden driver fallback when the user explicitly picked a driver.",
      "No silent execution of mixed SQL/`mongo` artifacts",
      "## Proposed Work Slices",
      "[x] Formalize an artifact compatibility matrix: `sql`, `mongo`, `mixed`.",
      "[x] Add deterministic skip/fail behavior for incompatible artifacts.",
      "[x] Keep relation and seeding flows aligned with explicit driver selection.",
      "## Completed Phase 2 Slices",
      "`src/cli/utils/ArtifactCompatibility.ts`",
      "`src/cli/utils/ArtifactRoutingReport.ts`",
      "`src/cli/utils/ScenarioMorphAliasRouting.ts`",
      "## Acceptance Criteria",
      "`--mongo` commands only load Mongo-compatible artifacts.",
      "Mixed artifacts are rejected or skipped deterministically with a clear reason.",
      "`MongoMigrationTracker` has dedicated coverage and no longer sits at `0%` branches.",
      "## Validation Strategy",
      "`npm run test:pack-smoke`",
    ];

    for (const snippet of requiredSnippets) {
      expect(plan).toContain(snippet);
    }
  });
});

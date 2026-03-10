import fs from "fs";
import path from "path";

describe("NoSQL full integration contract plan", () => {
  const rootDir = process.cwd();
  const planPath = path.resolve(
    rootDir,
    "validation tasks/NoSQL-Full-Integration-Plan.md"
  );

  test("plan doc exists and marks phase-6 closure", () => {
    const plan = fs.readFileSync(planPath, "utf8");

    const requiredSnippets = [
      "# NoSQL Full Integration Plan",
      "Status: DONE (Phase 6 Complete)",
      "Target driver family:",
      "`mongo`",
      "All phases (1 to 6) are complete and locked.",
      "Plan is closed.",
    ];

    for (const snippet of requiredSnippets) {
      expect(plan).toContain(snippet);
    }
  });

  test("plan defines migration parity support for mongo command families", () => {
    const plan = fs.readFileSync(planPath, "utf8");

    const requiredSnippets = [
      "### Phase 6: Mongo Migration Parity",
      "`make:model --mongo`",
      "`make:migration --mongo`",
      "`migrate:status --mongo`",
      "`migrate:run --mongo`",
      "`migrate:rollback --mongo`",
      "`migrate:fresh --mongo`",
      "`migrate:reset --mongo`",
      "`make:scenario --test --mongo`",
    ];

    for (const snippet of requiredSnippets) {
      expect(plan).toContain(snippet);
    }
  });

  test("plan keeps SQL adapter unsupported on mongo while documenting mongo tracker output", () => {
    const plan = fs.readFileSync(planPath, "utf8");

    const requiredSnippets = [
      "#### Unsupported",
      "getAdapter(\"mongo\")",
      "MongoMigrationTracker.ts",
      "migrateRun.ts",
      "migrateRollback.ts",
      "migrateStatus.ts",
      "migrateFresh.ts",
    ];

    for (const snippet of requiredSnippets) {
      expect(plan).toContain(snippet);
    }
  });

  test("plan captures release validation gate behavior for pack-smoke and CI", () => {
    const plan = fs.readFileSync(planPath, "utf8");

    const requiredSnippets = [
      "nosql-regression",
      "scripts/pack-smoke.js",
      "ELOQUENT_PACK_SMOKE_ENABLE_MONGO_RUNTIME=1",
      "Acceptance Criteria",
      "Validation Strategy",
    ];

    for (const snippet of requiredSnippets) {
      expect(plan).toContain(snippet);
    }
  });
});

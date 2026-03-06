import fs from "fs";
import path from "path";

describe("migration tracker single-table contract plan", () => {
  const rootDir = process.cwd();

  test("task doc defines the single-table target and clarifies the confusing migration artifact case", () => {
    const plan = fs.readFileSync(
      path.resolve(
        rootDir,
        "validation tasks/Migration-Tracker-Single-Table-Contract-Plan.md"
      ),
      "utf8"
    );

    const requiredSnippets = [
      "# Migration Tracker Single-Table Contract Plan",
      "consumer database persists only the `migrations` table",
      "migration_locks",
      "20260304130722001_create_cligeneratortestartifacts_table.ts",
      "Generated `create_*_table.ts` files are schema source artifacts, not tracker tables.",
      "pg_advisory_lock",
      "GET_LOCK",
      "BEGIN IMMEDIATE",
      "Acceptance Criteria",
      "`ensureMigrationTables()` creates only the `migrations` table.",
    ];

    for (const snippet of requiredSnippets) {
      expect(plan).toContain(snippet);
    }
  });

  test.todo(
    "ensureMigrationTables should stop creating a persistent migration_locks table"
  );

  test.todo(
    "migration concurrency protection should use driver-native locking without adding a second consumer tracker table"
  );
});

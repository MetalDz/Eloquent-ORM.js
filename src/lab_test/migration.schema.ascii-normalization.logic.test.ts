import fs from "fs";
import path from "path";
import { dbConfig } from "../config/database.js";
import { SchemaBuilder } from "../core/schema/SchemaBuilder.js";
import { column, relation, type SchemaField } from "../core/schema/SchemaBlueprint.js";

describe("migration/schema ASCII normalization", () => {
  const rootDir = process.cwd();
  const originalDefault = dbConfig.default;
  const planPath = path.resolve(
    rootDir,
    "validation tasks/Migration-Schema-ASCII-Normalization-Plan.md",
  );
  const repoPlanPath = path.resolve(
    rootDir,
    "validation tasks/Repo-Wide-Mojibake-Remediation-Plan.md",
  );
  const makeMigrationPath = path.resolve(
    rootDir,
    "src/cli/commands/makeMigration.ts",
  );
  const extraMigrationClassifierPath = path.resolve(
    rootDir,
    "src/cli/utils/migrations/ExtraMigrationClassifier.ts",
  );
  const schemaBuilderPath = path.resolve(
    rootDir,
    "src/core/schema/SchemaBuilder.ts",
  );

  afterEach(() => {
    dbConfig.default = originalDefault;
  });

  test("phase plan documents the migration/schema remediation slice", () => {
    const plan = fs.readFileSync(planPath, "utf8");
    const repoPlan = fs.readFileSync(repoPlanPath, "utf8");

    const requiredSnippets = [
      "# Migration and Schema ASCII Normalization Plan",
      "Status: COMPLETED",
      "src/cli/commands/makeMigration.ts",
      "src/core/schema/SchemaBuilder.ts",
      "`ERROR:`",
      "`WARN:`",
      "`INFO:`",
      "`OK:`",
      "`No new columns or schema changes - skipping.`",
      "`Migration generation complete in ... mode.`",
      "`Auto-generated CREATE migration ...`",
      "`SchemaBuilder v4.0`",
      "`Smart Diff Logic (Add + Drop)`",
      "`DROP TABLE`",
      "`COLUMN BUILDER`",
      "`RELATIONS`",
      "`MIXINS`",
    ];

    for (const snippet of requiredSnippets) {
      expect(plan).toContain(snippet);
    }

    expect(repoPlan).toContain("Migration-Schema-ASCII-Normalization-Plan.md");
  });

  test("targeted migration and schema sources are ASCII-only", () => {
    for (const sourceFile of [makeMigrationPath, extraMigrationClassifierPath, schemaBuilderPath]) {
      const content = fs.readFileSync(sourceFile, "utf8").replace(/^\uFEFF/, "");
      expect(content).not.toMatch(/[^\x00-\x7F]/);
      expect(content).not.toContain("â");
    }
  });

  test("makeMigration source keeps the normalized ASCII runtime text", () => {
    const content = fs.readFileSync(makeMigrationPath, "utf8");

    const requiredSnippets = [
      "ERROR: Models folder not found:",
      "INFO: Models Path:",
      "INFO: Migrations Root:",
      "WARN: No model files found.",
      "WARN: Model not found:",
      "WARN: Skipping migration due to TS error in",
      "WARN: No schema found in",
      "INFO: Using connection:",
      "INFO: Migrations Path:",
      "INFO: No new columns or schema changes - skipping.",
      "INFO: Migration unchanged:",
      "INFO: ${pendingPivot.logLabel} unchanged:",
      "INFO: All database connections closed.",
      "WARN: Could not close DB connections cleanly.",
      "OK: Migration generation complete in",
      "Auto-generated ${prefix.toUpperCase()} migration for",
      "Auto-generated CREATE migration for",
      'Auto-generated ${pendingPivot.logLabel === "Pivot migration" ? "CREATE migration" : "INDEX helper migration"} for ${pendingPivot.headerLabel!}',
    ];

    for (const snippet of requiredSnippets) {
      expect(content).toContain(snippet);
    }
  });

  test("extra migration classifier keeps the normalized ASCII helper labels", () => {
    const content = fs.readFileSync(extraMigrationClassifierPath, "utf8");

    expect(content).toContain('logLabel: "Pivot migration"');
    expect(content).toContain('logLabel: "Helper migration"');
    expect(content).toContain('fileSuffix: "add_schema_extras"');
    expect(content).toContain('fallbackRollbackSql: "-- rollback SQL unavailable for schema extras"');
  });

  test("SchemaBuilder uses the normalized ASCII error and info text", async () => {
    const content = fs.readFileSync(schemaBuilderPath, "utf8");
    const schema = {
      id: column("increments"),
    } satisfies Record<string, SchemaField>;

    expect(content).toContain("ERROR: Unsupported dialect:");
    expect(content).toContain("ERROR: Schema validation failed for");
    expect(content).toContain("WARN: Could not verify structure for");
    expect(content).toContain("INFO: No schema differences for");
    expect(content).toContain("SchemaBuilder v4.0");
    expect(content).toContain("Smart Diff Logic (Add + Drop)");
    expect(content).toContain("DROP TABLE");
    expect(content).toContain("COLUMN BUILDER");
    expect(content).toContain("RELATIONS");
    expect(content).toContain("MIXINS");

    dbConfig.default = "mongo" as any;
    await expect(
      SchemaBuilder.toCreateSQL("users", schema, "unknown_conn", false, undefined, true),
    ).rejects.toThrow("ERROR: Unsupported dialect");

    await expect(
      SchemaBuilder.toCreateSQL(
        "posts",
        {
          author: relation("belongsTo", "User", {}),
        },
        "mysql",
        false,
        undefined,
        true,
      ),
    ).rejects.toThrow("ERROR: Schema validation failed");
  });
});

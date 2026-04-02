import fs from "fs";
import path from "path";
import {
  resolveCliConnectionNames,
  resolveCliPrimaryConnectionName,
} from "../cli/utils/CliCommandTargets.js";

describe("ORM hardening phase 1 CLI command target resolution extraction", () => {
  const rootDir = process.cwd();
  const planPath = path.resolve(
    rootDir,
    "validation tasks/ORM-Hardening-Phase1-CLI-Command-Target-Resolution-Plan.md"
  );
  const cliPath = path.resolve(rootDir, "src/cli/eloquent.ts");
  const seedScenarioRegistrationPath = path.resolve(
    rootDir,
    "src/cli/utils/CliSeedScenarioCommandRegistration.ts"
  );
  const migrationRegistrationPath = path.resolve(
    rootDir,
    "src/cli/utils/CliMigrationCommandRegistration.ts"
  );

  test("sub-plan exists and freezes the command target extraction scope", () => {
    const plan = fs.readFileSync(planPath, "utf8");

    const requiredSnippets = [
      "# ORM Hardening Phase 1 CLI Command Target Resolution Plan",
      "Status: COMPLETED",
      "command-level connection target resolution",
      "primary connection selection for single-target commands like `demo:scenario`",
      "preservation of test-mode routing through `--test`",
      "`src/cli/eloquent.ts` delegates repeated connection-target resolution to a helper module.",
      "Existing CLI surface and connection-flag tests still pass.",
      "`npm run typecheck` stays green.",
    ];

    for (const snippet of requiredSnippets) {
      expect(plan).toContain(snippet);
    }
  });

  test("helper preserves explicit, all-connections, and primary-connection semantics", () => {
    expect(resolveCliConnectionNames({ test: true, sqlite: true })).toEqual(["sqlite_test"]);
    expect(resolveCliConnectionNames({ test: false, sqlite: true })).toEqual(["sqlite"]);

    expect(resolveCliConnectionNames({ test: true, allConnections: true })).toEqual(
      expect.arrayContaining(["sqlite_test"])
    );
    expect(resolveCliConnectionNames({ test: false, mongo: true })).toEqual(["mongo"]);

    expect(resolveCliPrimaryConnectionName({ test: true, mongo: true })).toBe("mongo_test");
    expect(resolveCliPrimaryConnectionName({ test: false })).toBeUndefined();
  });

  test("helper preserves conflict errors from resolveConnectionFlags", () => {
    expect(() =>
      resolveCliConnectionNames({
        test: true,
        mysql: true,
        pg: true,
      })
    ).toThrow("Choose only one explicit connection flag or use --all-connections.");
  });

  test("extracted CLI registration modules delegate repeated command target resolution to the helper", () => {
    const cliSource = fs.readFileSync(cliPath, "utf8");
    const seedScenarioSource = fs.readFileSync(seedScenarioRegistrationPath, "utf8");
    const migrationSource = fs.readFileSync(migrationRegistrationPath, "utf8");

    expect(cliSource).not.toContain('from "./utils/resolveConnectionFlags"');
    expect(seedScenarioSource).toContain('from "./CliCommandTargets.js"');
    expect(seedScenarioSource).toContain("resolveCliPrimaryConnectionName(options)");
    expect(seedScenarioSource.match(/resolveCliConnectionNames\(options\)/g)?.length).toBeGreaterThanOrEqual(2);
    expect(migrationSource).toContain('from "./CliCommandTargets.js"');
    expect(migrationSource.match(/resolveCliConnectionNames\(options\)/g)?.length).toBeGreaterThanOrEqual(4);
  });
});

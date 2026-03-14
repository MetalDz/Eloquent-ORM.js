import fs from "fs";
import path from "path";
import {
  resolveCliConnectionNames,
  resolveCliPrimaryConnectionName,
} from "../cli/utils/CliCommandTargets";

describe("ORM hardening phase 1 CLI command target resolution extraction", () => {
  const rootDir = process.cwd();
  const planPath = path.resolve(
    rootDir,
    "validation tasks/ORM-Hardening-Phase1-CLI-Command-Target-Resolution-Plan.md"
  );
  const cliPath = path.resolve(rootDir, "src/cli/eloquent.ts");

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

  test("eloquent CLI delegates repeated command target resolution to the extracted helper", () => {
    const source = fs.readFileSync(cliPath, "utf8");

    expect(source).toContain('from "./utils/CliCommandTargets"');
    expect(source).toContain("resolveCliPrimaryConnectionName(options)");
    expect(source.match(/resolveCliConnectionNames\(options\)/g)?.length).toBeGreaterThanOrEqual(8);
    expect(source).not.toContain('from "./utils/resolveConnectionFlags"');
  });
});

import fs from "fs";
import path from "path";

import {
  resolveCliConnectionNames,
  resolveCliPrimaryConnectionName,
} from "../cli/utils/CliCommandTargets";

describe("LTS phase 5 CliCommandTargets coverage", () => {
  test("plan tracks the dedicated CliCommandTargets LTS slice", () => {
    const planPath = path.resolve(
      process.cwd(),
      "validation tasks/LTS-Phase5-CliCommandTargets-Coverage-Plan.md",
    );
    const content = fs.readFileSync(planPath, "utf8");

    expect(content).toContain("# LTS Phase 5 CliCommandTargets Coverage Plan");
    expect(content).toContain("Status: COMPLETED");
    expect(content).toContain("src/cli/utils/CliCommandTargets.ts");
    expect(content).toContain(
      "src/lab_test/lts.phase5.cli-command-targets-coverage.logic.test.ts",
    );
  });

  test("resolveCliConnectionNames returns no targets when options are omitted", () => {
    expect(resolveCliConnectionNames(undefined)).toEqual([]);
  });

  test("resolveCliPrimaryConnectionName returns undefined when options are omitted", () => {
    expect(resolveCliPrimaryConnectionName(undefined)).toBeUndefined();
  });

  test("nullish options stay stable when resolver options are passed through", () => {
    expect(
      resolveCliConnectionNames(undefined, {
        sqlOnly: true,
        includeMongoInAllConnections: true,
      }),
    ).toEqual([]);
    expect(
      resolveCliPrimaryConnectionName(undefined, {
        includeMongoInAllConnections: true,
      }),
    ).toBeUndefined();
  });
});

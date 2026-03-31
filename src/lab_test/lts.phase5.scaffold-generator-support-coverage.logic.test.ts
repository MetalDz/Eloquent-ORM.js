import fs from "fs";
import path from "path";

jest.mock("chalk", () => ({
  __esModule: true,
  default: {
    cyan: (value: string) => value,
    yellow: (value: string) => value,
    greenBright: (value: string) => value,
    green: (value: string) => value,
    red: (value: string) => value,
  },
}));

import { normalizeScaffoldModelName } from "../cli/utils/ScaffoldGeneratorSupport.js";

describe("LTS phase 5 ScaffoldGeneratorSupport coverage", () => {
  test("plan tracks the dedicated ScaffoldGeneratorSupport LTS slice", () => {
    const planPath = path.resolve(
      process.cwd(),
      "validation tasks/LTS-Phase5-ScaffoldGeneratorSupport-Coverage-Plan.md",
    );
    const content = fs.readFileSync(planPath, "utf8");

    expect(content).toContain("# LTS Phase 5 ScaffoldGeneratorSupport Coverage Plan");
    expect(content).toContain("Status: COMPLETED");
    expect(content).toContain("src/cli/utils/ScaffoldGeneratorSupport.ts");
    expect(content).toContain(
      "src/lab_test/lts.phase5.scaffold-generator-support-coverage.logic.test.ts",
    );
  });

  test("normalizeScaffoldModelName safely handles nullish and suffix-only names", () => {
    expect(normalizeScaffoldModelName("controller", undefined as unknown as string)).toBe("");
    expect(normalizeScaffoldModelName("controller", "Controller")).toBe("Controller");
    expect(normalizeScaffoldModelName("service", "Service")).toBe("Service");
  });
});

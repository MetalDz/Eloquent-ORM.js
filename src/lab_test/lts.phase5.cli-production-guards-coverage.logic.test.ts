import fs from "fs";
import path from "path";

describe("LTS phase 5 CliProductionGuards coverage", () => {
  beforeEach(() => {
    delete process.exitCode;
    jest.restoreAllMocks();
    jest.clearAllMocks();
    jest.resetModules();
    jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    delete process.exitCode;
    jest.restoreAllMocks();
    jest.clearAllMocks();
    jest.resetModules();
  });

  test("plan tracks the dedicated CliProductionGuards coverage slice", () => {
    const planPath = path.resolve(
      process.cwd(),
      "validation tasks/LTS-Phase5-CliProductionGuards-Coverage-Plan.md",
    );
    const content = fs.readFileSync(planPath, "utf8");

    expect(content).toContain("# LTS Phase 5 CliProductionGuards Coverage Plan");
    expect(content).toContain("Status: COMPLETED");
    expect(content).toContain("src/cli/utils/CliProductionGuards.ts");
    expect(content).toContain(
      "src/lab_test/lts.phase5.cli-production-guards-coverage.logic.test.ts",
    );
  });

  test("ensureCliProductionTestOnly allows explicit test mode without logging", () => {
    const { ensureCliProductionTestOnly } = require("../cli/utils/CliProductionGuards") as {
      ensureCliProductionTestOnly: (commandName: string, options: { test?: boolean }) => boolean;
    };

    process.env.APP_ENV = "production";

    expect(ensureCliProductionTestOnly("db:seed", { test: true })).toBe(true);
    expect(console.error).not.toHaveBeenCalled();
    expect(process.exitCode).toBeUndefined();
  });

  test("guard helpers fall back to default reasons when safety checks omit one", () => {
    jest.isolateModules(() => {
      jest.doMock("../cli/utils/ProductionSafety", () => ({
        checkProductionDestructiveCommand: jest.fn(() => ({ allowed: false })),
        checkProductionTestOnlyCommand: jest.fn(() => ({ allowed: false })),
      }));

      const {
        ensureCliProductionOverride,
        ensureCliProductionTestOnly,
      } = require("../cli/utils/CliProductionGuards") as {
        ensureCliProductionOverride: (
          commandName: string,
          options: { force?: boolean; yes?: boolean },
          renderError?: (message: string) => string,
        ) => boolean;
        ensureCliProductionTestOnly: (
          commandName: string,
          options: { test?: boolean },
          renderError?: (message: string) => string,
        ) => boolean;
      };

      expect(
        ensureCliProductionOverride("migrate:fresh", {}, (message) => message),
      ).toBe(false);
      expect(console.error).toHaveBeenNthCalledWith(
        1,
        "migrate:fresh is blocked in production.",
      );

      delete process.exitCode;

      expect(
        ensureCliProductionTestOnly("db:seed", {}, (message) => message),
      ).toBe(false);
      expect(console.error).toHaveBeenNthCalledWith(
        2,
        "db:seed requires --test in production.",
      );
    });
  });
});

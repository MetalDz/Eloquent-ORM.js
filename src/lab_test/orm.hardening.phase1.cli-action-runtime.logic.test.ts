import fs from "fs";
import path from "path";
import {
  defaultCliActionErrorRenderer,
  runCliAction,
  toCliActionErrorMessage,
} from "../cli/utils/CliActionRuntime";

describe("ORM hardening phase 1 CLI action runtime extraction", () => {
  const rootDir = process.cwd();
  const planPath = path.resolve(
    rootDir,
    "validation tasks/ORM-Hardening-Phase1-CLI-Action-Error-Wrapper-Plan.md"
  );

  beforeEach(() => {
    jest.restoreAllMocks();
    delete process.exitCode;
    jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete process.exitCode;
  });

  test("sub-plan exists and freezes the CLI action error wrapper scope", () => {
    const plan = fs.readFileSync(planPath, "utf8");

    const requiredSnippets = [
      "# ORM Hardening Phase 1 CLI Action Error Wrapper Plan",
      "Status: COMPLETED",
      "unknown error to message normalization",
      "default CLI error rendering",
      "async action wrapping with `console.error(...)` and `process.exitCode = 1`",
      "`src/cli/eloquent.ts` delegates repeated action error handling to a helper module.",
      "Existing CLI surface tests still pass.",
      "`npm run typecheck` stays green.",
    ];

    for (const snippet of requiredSnippets) {
      expect(plan).toContain(snippet);
    }
  });

  test("helper preserves error normalization and default rendering", () => {
    expect(toCliActionErrorMessage(new Error("boom"))).toBe("boom");
    expect(toCliActionErrorMessage("string-failure")).toBe("string-failure");
    expect(defaultCliActionErrorRenderer("broken")).toContain("broken");
  });

  test("helper wraps async actions, reports failures, and keeps success passthrough", async () => {
    await expect(runCliAction(async () => 7)).resolves.toBe(7);
    expect(console.error).not.toHaveBeenCalled();
    expect(process.exitCode).toBeUndefined();

    await expect(
      runCliAction(async () => {
        throw "plain-failure";
      })
    ).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("plain-failure"));
    expect(process.exitCode).toBe(1);

    delete process.exitCode;
    (console.error as jest.Mock).mockClear();

    await expect(
      runCliAction(
        async () => {
          throw new Error("custom-render");
        },
        (message) => `RUNTIME: ${message}`
      )
    ).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalledWith("RUNTIME: custom-render");
    expect(process.exitCode).toBe(1);
  });

  test("eloquent CLI delegates repeated action error handling to the extracted helper", () => {
    const sourcePaths = [
      path.resolve(rootDir, "src/cli/eloquent.ts"),
      path.resolve(
        rootDir,
        "src/cli/utils/CliMakeArtifactCommandRegistration.ts",
      ),
      path.resolve(
        rootDir,
        "src/cli/utils/CliSeedScenarioCommandRegistration.ts",
      ),
      path.resolve(
        rootDir,
        "src/cli/utils/CliMigrationCommandRegistration.ts",
      ),
    ];
    const sources = sourcePaths.map((sourcePath) => fs.readFileSync(sourcePath, "utf8"));
    const totalRunCliActionCalls = sources.reduce(
      (count, source) => count + (source.match(/runCliAction\(async \(\) =>/g)?.length ?? 0),
      0,
    );

    expect(sources[1]).toContain('from "./CliActionRuntime"');
    expect(sources[2]).toContain('from "./CliActionRuntime"');
    expect(sources[3]).toContain('from "./CliActionRuntime"');
    expect(totalRunCliActionCalls).toBeGreaterThanOrEqual(6);
  });
});

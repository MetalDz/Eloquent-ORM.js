import fs from "fs";
import path from "path";
import {
  ensureCliProductionOverride,
  ensureCliProductionTestOnly,
} from "../cli/utils/CliProductionGuards";

describe("ORM hardening phase 1 CLI production guards extraction", () => {
  const rootDir = process.cwd();
  const planPath = path.resolve(
    rootDir,
    "validation tasks/ORM-Hardening-Phase1-CLI-Production-Guards-Extraction-Plan.md"
  );
  const cliPath = path.resolve(rootDir, "src/cli/eloquent.ts");

  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.exitCode;
    jest.restoreAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    delete process.exitCode;
    jest.restoreAllMocks();
  });

  test("sub-plan exists and freezes the production guard extraction scope", () => {
    const plan = fs.readFileSync(planPath, "utf8");

    const requiredSnippets = [
      "# ORM Hardening Phase 1 CLI Production Guards Extraction Plan",
      "Status: COMPLETED",
      "destructive-command production override enforcement",
      "test-only production enforcement",
      "shared `console.error(...)` plus `process.exitCode = 1` handling for guard failures",
      "`src/cli/eloquent.ts` no longer owns production guard helper functions directly.",
      "Existing CLI surface tests still pass.",
      "`npm run typecheck` stays green.",
    ];

    for (const snippet of requiredSnippets) {
      expect(plan).toContain(snippet);
    }
  });

  test("helper preserves destructive override and test-only guard semantics", () => {
    process.env.APP_ENV = "production";
    delete process.env.ELOQUENT_ALLOW_PROD_DESTRUCTIVE;

    expect(
      ensureCliProductionOverride("make:model", { force: false, yes: false })
    ).toBe(false);
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("make:model is blocked in production")
    );
    expect(process.exitCode).toBe(1);

    delete process.exitCode;
    (console.error as jest.Mock).mockClear();

    process.env.ELOQUENT_ALLOW_PROD_DESTRUCTIVE = "true";
    expect(
      ensureCliProductionOverride("make:model", { force: true, yes: true })
    ).toBe(true);
    expect(console.error).not.toHaveBeenCalled();

    expect(
      ensureCliProductionTestOnly("db:seed", { test: false })
    ).toBe(false);
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("db:seed is restricted to --test in production")
    );
  });

  test("helper allows custom error rendering", () => {
    process.env.APP_ENV = "production";

    expect(
      ensureCliProductionTestOnly(
        "make:seed",
        { test: false },
        (message) => `GUARD: ${message}`
      )
    ).toBe(false);

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("GUARD: make:seed is restricted to --test in production")
    );
  });

  test("eloquent CLI delegates production guards to the extracted helper", () => {
    const source = fs.readFileSync(cliPath, "utf8");

    expect(source).toContain('from "./utils/CliProductionGuards"');
    expect(source).toContain("ensureCliProductionOverride(");
    expect(source).toContain("ensureCliProductionTestOnly(");
    expect(source).not.toContain("function ensureProductionOverride(");
    expect(source).not.toContain("function ensureProductionTestOnly(");
  });
});

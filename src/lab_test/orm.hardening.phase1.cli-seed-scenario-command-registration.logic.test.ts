import fs from "fs";
import path from "path";

describe("ORM hardening phase 1 - CLI seed scenario command registration extraction", () => {
  test("plan records the extracted seed scenario command seam", () => {
    const planPath = path.resolve(
      process.cwd(),
      "validation tasks/ORM-Hardening-Phase1-CLI-Seed-Scenario-Command-Registration-Extraction-Plan.md",
    );
    const content = fs.readFileSync(planPath, "utf8");

    expect(content).toContain("Status: COMPLETED");
    expect(content).toContain("src/cli/utils/CliSeedScenarioCommandRegistration.ts");
    expect(content).toContain("src/cli/eloquent.ts");
    expect(content).toContain(
      "src/lab_test/orm.hardening.phase1.cli-seed-scenario-command-registration.logic.test.ts",
    );
  });

  test("seed scenario helper owns the extracted command registrations", () => {
    const helperPath = path.resolve(
      process.cwd(),
      "src/cli/utils/CliSeedScenarioCommandRegistration.ts",
    );
    const content = fs.readFileSync(helperPath, "utf8");

    expect(content).toContain("export function registerCliSeedScenarioCommands");
    expect(content).toContain('.command("db:seed")');
    expect(content).toContain('.command("db:seed:precheck")');
    expect(content).toContain('.command("db:seed:fresh")');
    expect(content).toContain('.command("demo:scenario")');
    expect(content).toContain("assertSeedBootstrapPrecheck");
    expect(content).toContain('resolveCliConnectionNames(options)');
    expect(content).toContain('resolveCliPrimaryConnectionName(options)');
  });

  test("eloquent delegates seed scenario registration to the helper", () => {
    const cliPath = path.resolve(process.cwd(), "src/cli/eloquent.ts");
    const content = fs.readFileSync(cliPath, "utf8");

    expect(content).toContain(
      'import { registerCliSeedScenarioCommands } from "./utils/CliSeedScenarioCommandRegistration.js";',
    );
    expect(content).toContain("registerCliSeedScenarioCommands(program);");
    expect(content).not.toContain('.command("db:seed")');
    expect(content).not.toContain('.command("db:seed:fresh")');
    expect(content).not.toContain('.command("demo:scenario")');
  });
});

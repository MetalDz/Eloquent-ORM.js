import fs from "fs";
import path from "path";

describe("ORM hardening phase 1 - CLI support command registration extraction", () => {
  test("plan records the extracted support command registration seam", () => {
    const planPath = path.resolve(
      process.cwd(),
      "validation tasks/ORM-Hardening-Phase1-CLI-Support-Command-Registration-Extraction-Plan.md",
    );
    const content = fs.readFileSync(planPath, "utf8");

    expect(content).toContain("Status: COMPLETED");
    expect(content).toContain("src/cli/utils/CliSupportCommandRegistration.ts");
    expect(content).toContain("src/cli/eloquent.ts");
    expect(content).toContain("src/lab_test/orm.hardening.phase1.cli-support-command-registration.logic.test.ts");
  });

  test("support command helper owns the extracted command registrations", () => {
    const helperPath = path.resolve(
      process.cwd(),
      "src/cli/utils/CliSupportCommandRegistration.ts",
    );
    const content = fs.readFileSync(helperPath, "utf8");

    expect(content).toContain("export function registerCliSupportCommands");
    expect(content).toContain('.command("cache:clear")');
    expect(content).toContain('.command("cache:stats")');
    expect(content).toContain('.command("factory:status")');
    expect(content).toContain('.command("list")');
    expect(content).toContain("console.table(CLI_COMMAND_CATALOG);");
  });

  test("eloquent delegates support command registration to the helper", () => {
    const cliPath = path.resolve(process.cwd(), "src/cli/eloquent.ts");
    const content = fs.readFileSync(cliPath, "utf8");

    expect(content).toContain(
      'import { registerCliSupportCommands } from "./utils/CliSupportCommandRegistration";',
    );
    expect(content).toContain("registerCliSupportCommands(program);");
    expect(content).not.toContain('.command("cache:clear")');
    expect(content).not.toContain('.command("factory:status")');
    expect(content).not.toContain('.command("list")');
  });
});

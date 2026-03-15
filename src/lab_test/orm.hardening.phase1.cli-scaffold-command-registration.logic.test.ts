import fs from "fs";
import path from "path";

describe("ORM hardening phase 1 - CLI scaffold command registration extraction", () => {
  test("plan records the extracted scaffold command registration seam", () => {
    const planPath = path.resolve(
      process.cwd(),
      "validation tasks/ORM-Hardening-Phase1-CLI-Scaffold-Command-Registration-Extraction-Plan.md",
    );
    const content = fs.readFileSync(planPath, "utf8");

    expect(content).toContain("Status: COMPLETED");
    expect(content).toContain("src/cli/utils/CliScaffoldCommandRegistration.ts");
    expect(content).toContain("src/cli/eloquent.ts");
    expect(content).toContain("src/lab_test/orm.hardening.phase1.cli-scaffold-command-registration.logic.test.ts");
  });

  test("scaffold command helper owns the extracted command registrations", () => {
    const helperPath = path.resolve(
      process.cwd(),
      "src/cli/utils/CliScaffoldCommandRegistration.ts",
    );
    const content = fs.readFileSync(helperPath, "utf8");

    expect(content).toContain("export function registerCliScaffoldCommands");
    expect(content).toContain('.command("make:model <name>")');
    expect(content).toContain('.command("make:registry")');
    expect(content).toContain('.command("make:controller <name>")');
    expect(content).toContain('.command("make:service <name>")');
    expect(content).toContain('ensureCliProductionOverride("make:model"');
    expect(content).toContain('ensureCliProductionOverride("make:registry"');
    expect(content).toContain('ensureCliProductionOverride("make:controller"');
    expect(content).toContain('ensureCliProductionOverride("make:service"');
  });

  test("eloquent delegates scaffold command registration to the helper", () => {
    const cliPath = path.resolve(process.cwd(), "src/cli/eloquent.ts");
    const content = fs.readFileSync(cliPath, "utf8");

    expect(content).toContain(
      'import { registerCliScaffoldCommands } from "./utils/CliScaffoldCommandRegistration";',
    );
    expect(content).toContain("registerCliScaffoldCommands(program);");
    expect(content).not.toContain('.command("make:model <name>")');
    expect(content).not.toContain('.command("make:registry")');
    expect(content).not.toContain('.command("make:controller <name>")');
    expect(content).not.toContain('.command("make:service <name>")');
  });
});

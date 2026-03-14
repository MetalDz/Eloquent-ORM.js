import fs from "fs";
import path from "path";

describe("ORM hardening phase 1 - CLI make artifact command registration extraction", () => {
  test("plan records the extracted make artifact command seam", () => {
    const planPath = path.resolve(
      process.cwd(),
      "validation tasks/ORM-Hardening-Phase1-CLI-Make-Artifact-Command-Registration-Extraction-Plan.md",
    );
    const content = fs.readFileSync(planPath, "utf8");

    expect(content).toContain("Status: COMPLETED");
    expect(content).toContain("src/cli/utils/CliMakeArtifactCommandRegistration.ts");
    expect(content).toContain("src/cli/eloquent.ts");
    expect(content).toContain(
      "src/lab_test/orm.hardening.phase1.cli-make-artifact-command-registration.logic.test.ts",
    );
  });

  test("make artifact helper owns the extracted command registrations", () => {
    const helperPath = path.resolve(
      process.cwd(),
      "src/cli/utils/CliMakeArtifactCommandRegistration.ts",
    );
    const content = fs.readFileSync(helperPath, "utf8");

    expect(content).toContain("export function registerCliMakeArtifactCommands");
    expect(content).toContain('.command("make:seed <model>")');
    expect(content).toContain('.command("make:factory <name>")');
    expect(content).toContain('.command("make:scenario <name>")');
    expect(content).toContain('ensureCliProductionTestOnly("make:seed"');
    expect(content).toContain('ensureCliProductionOverride("make:factory"');
    expect(content).toContain("return runCliAction(async () => {");
  });

  test("eloquent delegates make artifact registration to the helper", () => {
    const cliPath = path.resolve(process.cwd(), "src/cli/eloquent.ts");
    const content = fs.readFileSync(cliPath, "utf8");

    expect(content).toContain(
      'import { registerCliMakeArtifactCommands } from "./utils/CliMakeArtifactCommandRegistration";',
    );
    expect(content).toContain("registerCliMakeArtifactCommands(program);");
    expect(content).not.toContain('.command("make:seed <model>")');
    expect(content).not.toContain('.command("make:factory <name>")');
    expect(content).not.toContain('.command("make:scenario <name>")');
  });
});

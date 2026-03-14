import fs from "fs";
import path from "path";

describe("ORM hardening phase 1 - CLI migration command registration extraction", () => {
  test("plan records the extracted migration command seam", () => {
    const planPath = path.resolve(
      process.cwd(),
      "validation tasks/ORM-Hardening-Phase1-CLI-Migration-Command-Registration-Extraction-Plan.md",
    );
    const content = fs.readFileSync(planPath, "utf8");

    expect(content).toContain("Status: COMPLETED");
    expect(content).toContain("src/cli/utils/CliMigrationCommandRegistration.ts");
    expect(content).toContain("src/cli/eloquent.ts");
    expect(content).toContain(
      "src/lab_test/orm.hardening.phase1.cli-migration-command-registration.logic.test.ts",
    );
  });

  test("migration helper owns the extracted command registrations", () => {
    const helperPath = path.resolve(
      process.cwd(),
      "src/cli/utils/CliMigrationCommandRegistration.ts",
    );
    const content = fs.readFileSync(helperPath, "utf8");

    expect(content).toContain("export function registerCliMigrationCommands");
    expect(content).toContain('.command("make:migration [model]")');
    expect(content).toContain('.command("migrate:run [model]")');
    expect(content).toContain('.command("migrate:rollback")');
    expect(content).toContain('.command("migrate:status")');
    expect(content).toContain('.command("migrate:fresh")');
    expect(content).toContain('.command("migrate:reset")');
    expect(content).toContain("resolveCliConnectionNames");
    expect(content).toContain("runCliAction(async () => {");
  });

  test("eloquent delegates migration registration to the helper", () => {
    const cliPath = path.resolve(process.cwd(), "src/cli/eloquent.ts");
    const content = fs.readFileSync(cliPath, "utf8");

    expect(content).toContain(
      'import { registerCliMigrationCommands } from "./utils/CliMigrationCommandRegistration";',
    );
    expect(content).toContain("registerCliMigrationCommands(program);");
    expect(content).not.toContain('.command("make:migration [model]")');
    expect(content).not.toContain('.command("migrate:run [model]")');
    expect(content).not.toContain('.command("migrate:fresh")');
  });
});

import fs from "fs";
import path from "path";
import { CLI_COMMAND_CATALOG } from "../cli/utils/CliCommandCatalog.js";

describe("ORM hardening phase 1 - CLI help catalog extraction", () => {
  test("plan records the extracted help catalog seam", () => {
    const planPath = path.resolve(
      process.cwd(),
      "validation tasks/ORM-Hardening-Phase1-CLI-Help-Catalog-Extraction-Plan.md",
    );
    const content = fs.readFileSync(planPath, "utf8");

    expect(content).toContain("Status: COMPLETED");
    expect(content).toContain("src/cli/utils/CliCommandCatalog.ts");
    expect(content).toContain("src/cli/eloquent.ts");
    expect(content).toContain("src/lab_test/orm.hardening.phase1.cli-help-catalog.logic.test.ts");
  });

  test("shared catalog covers the public CLI help surface", () => {
    const commands = CLI_COMMAND_CATALOG.map((entry) => entry.Command);

    expect(commands).toContain("make:model <name>");
    expect(commands).toContain("make:registry");
    expect(commands).toContain("make:scenario <name>");
    expect(commands).toContain("db:seed");
    expect(commands).toContain("migrate:run [model]");
    expect(commands).toContain("factory:status");
    expect(commands).toContain("list");
    expect(new Set(commands).size).toBe(commands.length);
  });

  test("eloquent list command renders from the shared catalog", () => {
    const helperPath = path.resolve(
      process.cwd(),
      "src/cli/utils/CliSupportCommandRegistration.ts",
    );
    const content = fs.readFileSync(helperPath, "utf8");

    expect(content).toContain('import { CLI_COMMAND_CATALOG } from "./CliCommandCatalog";');
    expect(content).toContain("console.table(CLI_COMMAND_CATALOG);");
    expect(content).not.toContain('Command: "make:model <name>"');
  });
});

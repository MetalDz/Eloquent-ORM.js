import fs from "fs";
import path from "path";

describe("ORM hardening phase 1 - CLI presentation extraction", () => {
  test("plan records the CLI presentation seam", () => {
    const planPath = path.resolve(
      process.cwd(),
      "validation tasks/ORM-Hardening-Phase1-CLI-Presentation-Extraction-Plan.md",
    );
    const content = fs.readFileSync(planPath, "utf8");

    expect(content).toContain("Status: COMPLETED");
    expect(content).toContain("src/cli/utils/CliPresentation.ts");
    expect(content).toContain("src/cli/eloquent.ts");
    expect(content).toContain("src/lab_test/orm.hardening.phase1.cli-presentation.logic.test.ts");
  });

  test("presentation helper keeps the expected banner strings", () => {
    const helperPath = path.resolve(process.cwd(), "src/cli/utils/CliPresentation.ts");
    const content = fs.readFileSync(helperPath, "utf8");

    expect(content).toContain('figlet.textSync("EloquentJS"');
    expect(content).toContain("Developer CLI for EloquentJS ORM (v2.0)");
    expect(content).toContain("Ready to manage your EloquentJS models and database!");
    expect(content).toContain("export function printCliBanner");
  });

  test("eloquent delegates startup presentation to the helper", () => {
    const cliPath = path.resolve(process.cwd(), "src/cli/eloquent.ts");
    const content = fs.readFileSync(cliPath, "utf8");

    expect(content).toContain('import { printCliBanner } from "./utils/CliPresentation";');
    expect(content).toContain("printCliBanner();");
    expect(content).not.toContain('figlet.textSync("EloquentJS"');
  });
});

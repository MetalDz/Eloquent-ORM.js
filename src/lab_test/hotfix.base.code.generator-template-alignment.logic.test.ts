import fs from "fs";
import path from "path";

describe("Hot Fix base code generator template alignment", () => {
  const rootDir = process.cwd();
  const planPath = path.resolve(
    rootDir,
    "validation tasks/Hot-Fix-Base-Code-Generator-Template-Alignment.md",
  );
  const serviceTemplatePath = path.resolve(rootDir, "src/cli/templates/service.tpl");
  const controllerTemplatePath = path.resolve(rootDir, "src/cli/templates/controller.tpl");
  const checklistPath = path.resolve(rootDir, "validation tasks/Hot-Fix-Base-Code-Checklist.md");

  test("plan freezes the template and generated-artifact move set", () => {
    const plan = fs.readFileSync(planPath, "utf8");

    const requiredSnippets = [
      "# Hot Fix Base Code Generator Template Alignment",
      "Status: IN PROGRESS",
      "`src/cli/templates/model.tpl`",
      "`src/cli/templates/service.tpl`",
      "`src/cli/templates/controller.tpl`",
      "`src/lab_test/generated.model.instance.persistence.cli.logic.test.ts`",
      "`src/lab_test/scenario.generated.model.instance.persistence.logic.test.ts`",
      "`src/lab_test/orm.hardening.phase5.scaffold-generators.logic.test.ts`",
      "`src/lab_test/cli.generators.integration.test.ts`",
      "`Model.find(id)`",
      "`Model.create(data)`",
      "`Model.deleteById(id)` and `Model.restoreById(id)`",
      "`Model.createMany(...)` and `Model.updateMany(...)`",
    ];

    for (const snippet of requiredSnippets) {
      expect(plan).toContain(snippet);
    }
  });

  test("service template emits the hot-fix CRUD surface instead of old low-level instance writes", () => {
    const serviceTemplate = fs.readFileSync(serviceTemplatePath, "utf8");

    expect(serviceTemplate).toContain("return {{ModelName}}.find(id);");
    expect(serviceTemplate).toContain("return {{ModelName}}.create(data);");
    expect(serviceTemplate).toContain("async createMany(rows: Record<string, unknown>[])");
    expect(serviceTemplate).toContain("return {{ModelName}}.createMany(rows);");
    expect(serviceTemplate).toContain("const model = await {{ModelName}}.find(id);");
    expect(serviceTemplate).toContain("model.update(data);");
    expect(serviceTemplate).toContain("await model.save();");
    expect(serviceTemplate).toContain("return {{ModelName}}.deleteById(id);");
    expect(serviceTemplate).toContain("return {{ModelName}}.restoreById(id);");
    expect(serviceTemplate).toContain("return {{ModelName}}.updateMany(ids, data);");

    expect(serviceTemplate).not.toContain("return new {{ModelName}}().find(id);");
    expect(serviceTemplate).not.toContain("return new {{ModelName}}().create(data);");
    expect(serviceTemplate).not.toContain("return new {{ModelName}}().update(id, data);");
    expect(serviceTemplate).not.toContain("return new {{ModelName}}().delete(id);");
  });

  test("controller template stays service-oriented during the hot-fix", () => {
    const controllerTemplate = fs.readFileSync(controllerTemplatePath, "utf8");

    expect(controllerTemplate).toContain("private service = new {{PascalCase}}Service();");
    expect(controllerTemplate).toContain("const data = await this.service.all();");
    expect(controllerTemplate).toContain("const created = await this.service.create(payload);");
    expect(controllerTemplate).toContain("await this.service.update(id, payload);");
    expect(controllerTemplate).toContain("await this.service.delete(id);");
    expect(controllerTemplate).not.toContain('import { {{PascalCase}} } from "{{modelImportPath}}";');
  });

  test("checklist records the generator template freeze as complete once the task is closed", () => {
    const checklist = fs.readFileSync(checklistPath, "utf8");

    expect(checklist).toContain(
      "[done] Freeze the docs files and generated templates that must move together with the code.",
    );
    expect(checklist).toContain(
      "[done] If a generated artifact changes, add generator test coverage and pack-smoke validation.",
    );
    expect(checklist).toContain("Generator/template alignment status:");
  });
});

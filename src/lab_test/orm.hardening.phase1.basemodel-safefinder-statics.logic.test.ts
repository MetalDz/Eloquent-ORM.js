import fs from "fs";
import path from "path";

describe("ORM hardening phase 1 - BaseModel safe finder static extraction", () => {
  test("plan records the extracted BaseModel safe finder seam", () => {
    const planPath = path.resolve(
      process.cwd(),
      "validation tasks/ORM-Hardening-Phase1-BaseModel-SafeFinder-Static-Extraction-Plan.md",
    );
    const content = fs.readFileSync(planPath, "utf8");

    expect(content).toContain("Status: COMPLETED");
    expect(content).toContain("src/core/model/BaseModelSafeFinderStatics.ts");
    expect(content).toContain("src/core/model/BaseModel.ts");
    expect(content).toContain(
      "src/lab_test/orm.hardening.phase1.basemodel-safefinder-statics.logic.test.ts",
    );
  });

  test("extracted seam owns the static safe finder delegation block", () => {
    const seamPath = path.resolve(
      process.cwd(),
      "src/core/model/BaseModelSafeFinderStatics.ts",
    );
    const content = fs.readFileSync(seamPath, "utf8");

    expect(content).toContain("export function BaseModelSafeFinderStaticsMixin");
    expect(content).toContain("static where");
    expect(content).toContain("static with");
    expect(content).toContain("static active");
    expect(content).toContain("static existsBy");
    expect(content).toContain("(CoreModel.where as any).call(this, field, value)");
  });

  test("BaseModel now delegates the static safe finder block through the extracted seam", () => {
    const modelPath = path.resolve(process.cwd(), "src/core/model/BaseModel.ts");
    const content = fs.readFileSync(modelPath, "utf8");

    expect(content).toContain('import { BaseModelSafeFinderStaticsMixin } from "./BaseModelSafeFinderStatics";');
    expect(content).toContain("const SafeFinderStaticModel = BaseModelSafeFinderStaticsMixin(ComposedModel);");
    expect(content).toContain("> extends SafeFinderStaticModel");
    expect(content).not.toContain("static where<T extends typeof BaseModel>(");
    expect(content).not.toContain("static existsBy<T extends typeof BaseModel>(");
  });
});

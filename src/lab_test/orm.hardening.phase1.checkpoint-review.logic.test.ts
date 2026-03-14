import fs from "fs";
import path from "path";

describe("ORM hardening phase 1 checkpoint review", () => {
  test("checkpoint review records the completed CLI boundary milestone", () => {
    const reviewPath = path.resolve(
      process.cwd(),
      "validation tasks/ORM-Hardening-Phase1-Checkpoint-Review.md",
    );
    const content = fs.readFileSync(reviewPath, "utf8");

    expect(content).toContain("Status: COMPLETED");
    expect(content).toContain("CLI boundary extraction is effectively complete.");
    expect(content).toContain("src/cli/eloquent.ts");
    expect(content).toContain("src/core/model/CoreModel.ts");
    expect(content).toContain("`CoreModel` safe-finder setup is extracted.");
    expect(content).toContain(
      "The remaining Phase 1 work is now a readiness review, not another large extraction.",
    );
    expect(content).toContain(
      "Review completed: Phase 1 can be closed now that the model-layer helper seams are named and extracted.",
    );
  });

  test("phase 1 plan uses explicit check marks for completed and remaining work", () => {
    const planPath = path.resolve(
      process.cwd(),
      "validation tasks/ORM-Hardening-Phase1-Architecture-And-Boundaries-Plan.md",
    );
    const content = fs.readFileSync(planPath, "utf8");

    expect(content).toContain("- [x] Add a model/export boundary matrix");
    expect(content).toContain("- [x] Extract CLI bootstrap, target routing, guard, and registration seams");
    expect(content).toContain("- [x] `src/cli/utils/CliMigrationCommandRegistration.ts`");
    expect(content).toContain("- [x] `src/core/model/CoreModelSafeFinderSupport.ts`");
    expect(content).toContain("## Remaining Phase 1 Work");
    expect(content).toContain("- [x] Review Phase 1 completion readiness before switching to Phase 2.");
    expect(content).toContain("- No open Phase 1 tasks remain.");
    expect(content).not.toContain("Extract the remaining low-risk `BaseModel` helper grouping seam.");
  });
});

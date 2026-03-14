import fs from "fs";
import path from "path";

describe("ORM hardening phase 1 completion review", () => {
  test("completion review records the closing verdict and current hotspot snapshot", () => {
    const reviewPath = path.resolve(
      process.cwd(),
      "validation tasks/ORM-Hardening-Phase1-Completion-Review.md",
    );
    const content = fs.readFileSync(reviewPath, "utf8");

    expect(content).toContain("Status: COMPLETED");
    expect(content).toContain("`src/core/model/CoreModel.ts`: `688` lines");
    expect(content).toContain("`src/core/model/BaseModel.ts`: `305` lines");
    expect(content).toContain("`src/cli/eloquent.ts`: `230` lines");
    expect(content).toContain("Phase 1 acceptance criteria are satisfied.");
    expect(content).toContain("Phase 2 can start from a clearer boundary baseline");
  });
});

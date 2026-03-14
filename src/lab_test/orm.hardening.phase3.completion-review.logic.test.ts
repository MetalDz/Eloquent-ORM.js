import fs from "fs";
import path from "path";

describe("ORM hardening phase 3 completion review", () => {
  test("completion review records the closing verdict", () => {
    const reviewPath = path.resolve(
      process.cwd(),
      "validation tasks/ORM-Hardening-Phase3-Completion-Review.md"
    );
    const content = fs.readFileSync(reviewPath, "utf8");

    expect(content).toContain("Status: COMPLETED");
    expect(content).toContain(
      "`model.tpl` and inline `make:scenario` model generation are feature-aligned"
    );
    expect(content).toContain(
      "`tsRuntime` now keeps generated `.ts` artifacts loadable without depending on a successful `ts-node` registration path."
    );
    expect(content).toContain(
      "Pack-smoke now loads generated SQL and Mongo model artifacts through the packaged runtime path."
    );
    expect(content).toContain("Phase 4 can start from a stable generator/runtime baseline.");
  });
});

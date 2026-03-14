import fs from "fs";
import path from "path";

describe("ORM hardening phase 2 completion review", () => {
  test("completion review records the closing verdict", () => {
    const reviewPath = path.resolve(
      process.cwd(),
      "validation tasks/ORM-Hardening-Phase2-Completion-Review.md",
    );
    const content = fs.readFileSync(reviewPath, "utf8");

    expect(content).toContain("Status: COMPLETED");
    expect(content).toContain("Artifact compatibility rules are explicit and reusable.");
    expect(content).toContain("Mongo migration tracker runtime behavior is pinned by dedicated tests.");
    expect(content).toContain("Phase 3 can start from a more deterministic driver-routing baseline.");
  });
});

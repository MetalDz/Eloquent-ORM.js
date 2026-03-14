import fs from "fs";
import path from "path";

describe("ORM hardening phase 4 completion review", () => {
  test("completion review records the closing verdict", () => {
    const reviewPath = path.resolve(
      process.cwd(),
      "validation tasks/ORM-Hardening-Phase4-Completion-Review.md"
    );
    const content = fs.readFileSync(reviewPath, "utf8");

    expect(content).toContain("Status: COMPLETED");
    expect(content).toContain(
      "Safe-finder field restrictions are now pinned on real SQL and Mongo app models"
    );
    expect(content).toContain(
      "`SafeFinder.with(...)` now validates non-empty relation names, malformed nested paths, and missing top-level relations before query execution."
    );
    expect(content).toContain(
      "Hydrated instance dirty-tracking, soft-delete/restore state sync, and real-model SQL/Mongo persistence flows are locked by runtime tests."
    );
    expect(content).toContain("Phase 5 can start from a stable read/write model surface.");
  });
});

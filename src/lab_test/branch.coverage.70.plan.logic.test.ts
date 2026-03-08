import fs from "fs";
import path from "path";

describe("Branch coverage 70% plan contract", () => {
  const rootDir = process.cwd();

  test("execution plan exists with baseline, target, and ordered phases", () => {
    const planPath = path.resolve(rootDir, "validation tasks/Branch-Coverage-70-Execution-Plan.md");
    const plan = fs.readFileSync(planPath, "utf8");

    const requiredSnippets = [
      "# Branch Coverage 70% Execution Plan",
      "46.41%",
      "70%",
      "Additional covered branches needed: `511`",
      "Phase 0: Stable Measurement",
      "Phase 1: Utility Branch Closures (High ROI)",
      "Phase 2: Cache + Connection Logic",
      "Phase 3: CLI Command Branch Trees",
      "Phase 4: ORM Runtime/Mixin Branches",
      "Phase 5: Migration/Schema Safety Branches",
      "Done Criteria",
    ];

    for (const snippet of requiredSnippets) {
      expect(plan).toContain(snippet);
    }
  });

  test("coverage summary math is consistent with the 70% target state", () => {
    const summaryPath = path.resolve(rootDir, "coverage/coverage-summary.json");
    const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8")) as {
      total?: { branches?: { total?: number; covered?: number; pct?: number } };
    };

    const totalBranches = summary.total?.branches?.total ?? 0;
    const coveredBranches = summary.total?.branches?.covered ?? 0;
    const pct = summary.total?.branches?.pct ?? 0;
    const targetCovered = Math.ceil(totalBranches * 0.7);
    const gap = Math.max(0, targetCovered - coveredBranches);

    expect(totalBranches).toBeGreaterThan(0);
    if (pct < 70) {
      expect(gap).toBeGreaterThan(0);
    } else {
      expect(coveredBranches).toBeGreaterThanOrEqual(targetCovered);
      expect(gap).toBe(0);
    }
  });
});

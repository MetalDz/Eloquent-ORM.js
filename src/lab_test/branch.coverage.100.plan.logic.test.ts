import fs from "fs";
import path from "path";

describe("Branch coverage 100% plan contract", () => {
  const rootDir = process.cwd();

  test("execution plan exists with 100% target and ordered phases", () => {
    const planPath = path.resolve(
      rootDir,
      "validation tasks/Branch-Coverage-100-Execution-Plan.md"
    );
    const plan = fs.readFileSync(planPath, "utf8");

    const requiredSnippets = [
      "# Branch Coverage 100% Execution Plan",
      "70.45%",
      "100%",
      "Remaining uncovered branches: `639`",
      "Phase 1: Low-Hanging Deterministic Branches",
      "Phase 2: Mid-Complexity Core Branch Trees",
      "Phase 3: CLI Command Branch Closure",
      "Phase 4: Migration Tracker and Locking Edge Branches",
      "Phase 5: Hard-to-Reach/Environment Branches",
      "Done Criteria",
    ];

    for (const snippet of requiredSnippets) {
      expect(plan).toContain(snippet);
    }
  });

  test("coverage summary is below 100 and still has remaining branches", () => {
    const summaryPath = path.resolve(rootDir, "coverage/coverage-summary.json");
    const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8")) as {
      total?: { branches?: { total?: number; covered?: number; pct?: number } };
    };

    const totalBranches = summary.total?.branches?.total ?? 0;
    const coveredBranches = summary.total?.branches?.covered ?? 0;
    const pct = summary.total?.branches?.pct ?? 0;
    const remaining = Math.max(0, totalBranches - coveredBranches);

    expect(totalBranches).toBeGreaterThan(0);
    expect(pct).toBeLessThan(100);
    expect(remaining).toBeGreaterThan(0);
  });
});

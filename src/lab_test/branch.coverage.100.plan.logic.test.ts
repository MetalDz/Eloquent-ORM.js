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
      "70.36%",
      "100%",
      "Remaining uncovered branches: `641`",
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

  test("coverage summary has valid branch totals and percentage math", () => {
    const summaryPath = path.resolve(rootDir, "coverage/coverage-summary.json");
    const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8")) as {
      total?: { branches?: { total?: number; covered?: number; pct?: number } };
    };

    const totalBranches = summary.total?.branches?.total ?? 0;
    const coveredBranches = summary.total?.branches?.covered ?? 0;
    const pct = summary.total?.branches?.pct ?? 0;
    const remaining = Math.max(0, totalBranches - coveredBranches);

    expect(totalBranches).toBeGreaterThan(0);
    expect(coveredBranches).toBeGreaterThanOrEqual(0);
    expect(coveredBranches).toBeLessThanOrEqual(totalBranches);
    expect(pct).toBeGreaterThanOrEqual(0);
    expect(pct).toBeLessThanOrEqual(100);
    expect(remaining).toBe(totalBranches - coveredBranches);

    if (pct === 100) {
      expect(remaining).toBe(0);
    } else {
      expect(remaining).toBeGreaterThan(0);
    }
  });
});

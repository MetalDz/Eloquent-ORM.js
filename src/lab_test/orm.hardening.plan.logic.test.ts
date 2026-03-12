import fs from "fs";
import path from "path";

describe("ORM hardening execution plan contract", () => {
  const rootDir = process.cwd();
  const planPath = path.resolve(rootDir, "validation tasks/ORM-Hardening-Execution-Plan.md");

  test("master plan exists with current baseline, hotspot list, and ordered phases", () => {
    const plan = fs.readFileSync(planPath, "utf8");

    const requiredSnippets = [
      "# ORM Hardening Execution Plan",
      "Status: PLANNED",
      "coverage/coverage-summary.json",
      "Statements: `89.67%` (`4420/4929`)",
      "Branches: `87.00%` (`2371/2725`)",
      "Functions: `89.29%` (`667/747`)",
      "Lines: `89.71%` (`4163/4640`)",
      "`src/cli/eloquent.ts` (`1042` lines)",
      "`src/core/model/CoreModel.ts` (`783` lines)",
      "`src/core/model/BaseModel.ts` (`355` lines)",
      "`src/cli/utils/ArtifactStorage.ts` (`263` lines)",
      "`src/core/model/SafeFinder.ts` (`301` lines)",
      "`src/cli/utils/typescript/tsRuntime.ts` (`149` lines)",
      "### Phase 1: Architecture and Public Boundaries",
      "### Phase 2: Driver Parity and Artifact Routing",
      "### Phase 3: Generator and Runtime Loading Parity",
      "### Phase 4: Read Path and Instance Persistence Hardening",
      "### Phase 5: CLI Decomposition and Operational Hardening",
      "Every implementation slice must add a paired `.md` and `.test` file.",
      "## Done Criteria",
    ];

    for (const snippet of requiredSnippets) {
      expect(plan).toContain(snippet);
    }
  });

  test("master plan references all expected child phase files", () => {
    const expectedPaths = [
      "validation tasks/ORM-Hardening-Phase1-Architecture-And-Boundaries-Plan.md",
      "validation tasks/ORM-Hardening-Phase2-Driver-Parity-And-Artifact-Routing-Plan.md",
      "validation tasks/ORM-Hardening-Phase3-Generator-And-Runtime-Loading-Plan.md",
      "validation tasks/ORM-Hardening-Phase4-Read-Path-And-Persistence-Plan.md",
      "validation tasks/ORM-Hardening-Phase5-CLI-Decomposition-And-Operations-Plan.md",
      "src/lab_test/orm.hardening.phase1.contract.logic.test.ts",
      "src/lab_test/orm.hardening.phase2.contract.logic.test.ts",
      "src/lab_test/orm.hardening.phase3.contract.logic.test.ts",
      "src/lab_test/orm.hardening.phase4.contract.logic.test.ts",
      "src/lab_test/orm.hardening.phase5.contract.logic.test.ts",
    ];

    for (const relativePath of expectedPaths) {
      const absolutePath = path.resolve(rootDir, relativePath);
      expect(fs.existsSync(absolutePath)).toBe(true);
    }
  });

  test("coverage summary still has sane totals and bounded percentages", () => {
    const summaryPath = path.resolve(rootDir, "coverage/coverage-summary.json");
    const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8")) as {
      total?: {
        statements?: { total?: number; covered?: number; pct?: number };
        branches?: { total?: number; covered?: number; pct?: number };
        functions?: { total?: number; covered?: number; pct?: number };
        lines?: { total?: number; covered?: number; pct?: number };
      };
    };

    const coverageGroups = [
      summary.total?.statements,
      summary.total?.branches,
      summary.total?.functions,
      summary.total?.lines,
    ];

    for (const group of coverageGroups) {
      const total = group?.total ?? 0;
      const covered = group?.covered ?? 0;
      const pct = group?.pct ?? 0;

      expect(total).toBeGreaterThan(0);
      expect(covered).toBeGreaterThanOrEqual(0);
      expect(covered).toBeLessThanOrEqual(total);
      expect(pct).toBeGreaterThanOrEqual(0);
      expect(pct).toBeLessThanOrEqual(100);
    }
  });
});

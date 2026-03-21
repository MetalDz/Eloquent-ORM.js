import fs from "fs";
import path from "path";

type CoverageMetric = {
  total?: number;
  covered?: number;
  pct?: number;
};

export type CoverageSummary = {
  total?: {
    statements?: CoverageMetric;
    branches?: CoverageMetric;
    functions?: CoverageMetric;
    lines?: CoverageMetric;
  };
};

export function readCoverageSummaryForContractTests(rootDir: string): CoverageSummary {
  const liveSummaryPath = path.resolve(rootDir, "coverage/coverage-summary.json");
  if (fs.existsSync(liveSummaryPath)) {
    return JSON.parse(fs.readFileSync(liveSummaryPath, "utf8")) as CoverageSummary;
  }

  const fallbackSummaryPath = path.resolve(
    rootDir,
    "src/lab_test/fixtures/coverage-summary.contract.json",
  );
  return JSON.parse(fs.readFileSync(fallbackSummaryPath, "utf8")) as CoverageSummary;
}

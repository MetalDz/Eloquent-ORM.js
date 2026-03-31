import fs from "fs";
import path from "path";

import {
  createTargetedArtifactDecision,
  summarizeSkippedArtifacts,
} from "../cli/utils/ArtifactRoutingReport.js";

describe("LTS phase 5 ArtifactRoutingReport coverage", () => {
  test("plan tracks the dedicated ArtifactRoutingReport LTS slice", () => {
    const planPath = path.resolve(
      process.cwd(),
      "validation tasks/LTS-Phase5-ArtifactRoutingReport-Coverage-Plan.md",
    );
    const content = fs.readFileSync(planPath, "utf8");

    expect(content).toContain("# LTS Phase 5 ArtifactRoutingReport Coverage Plan");
    expect(content).toContain("Status: COMPLETED");
    expect(content).toContain("src/cli/utils/ArtifactRoutingReport.ts");
    expect(content).toContain(
      "src/lab_test/lts.phase5.artifact-routing-report-coverage.logic.test.ts",
    );
  });

  test("summarizeSkippedArtifacts returns null when there are no skipped artifacts", () => {
    expect(summarizeSkippedArtifacts("factory", [], "mongo")).toBeNull();
  });

  test("summarizeSkippedArtifacts pluralizes the label for multiple skipped artifacts", () => {
    const sqlFactory = createTargetedArtifactDecision("SqlUserFactory.ts", "sql", "mongo");
    const mixedFactory = createTargetedArtifactDecision(
      "MixedFactory.ts",
      "mixed",
      "mongo",
    );

    expect(
      summarizeSkippedArtifacts("factory", [sqlFactory, mixedFactory], "mongo"),
    ).toBe(
      "Skipping incompatible factorys for mongo: SqlUserFactory.ts (sql artifacts cannot run in mongo-targeted flows); MixedFactory.ts (mixed sql/mongo artifacts cannot run in mongo-targeted flows)",
    );
  });
});

import fs from "fs";
import path from "path";

import { describeArtifactCompatibilityMismatch } from "../cli/utils/ArtifactCompatibility.js";

describe("LTS phase 5 ArtifactCompatibility coverage", () => {
  test("plan tracks the dedicated ArtifactCompatibility coverage slice", () => {
    const planPath = path.resolve(
      process.cwd(),
      "validation tasks/LTS-Phase5-ArtifactCompatibility-Coverage-Plan.md",
    );
    const content = fs.readFileSync(planPath, "utf8");

    expect(content).toContain("# LTS Phase 5 ArtifactCompatibility Coverage Plan");
    expect(content).toContain("Status: COMPLETED");
    expect(content).toContain("src/cli/utils/ArtifactCompatibility.ts");
    expect(content).toContain(
      "src/lab_test/lts.phase5.artifact-compatibility-coverage.logic.test.ts",
    );
  });

  test("description helper covers direct-match and unknown-artifact branches explicitly", () => {
    expect(describeArtifactCompatibilityMismatch("unknown", "mongo")).toBe(
      "unknown artifact kind is allowed for mongo-targeted flows",
    );
    expect(describeArtifactCompatibilityMismatch("mongo", "mongo")).toBe(
      "mongo artifacts are compatible with mongo-targeted flows",
    );
  });
});

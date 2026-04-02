import fs from "fs";
import path from "path";

import {
  collapseStorageKinds,
  describeArtifactCompatibilityMismatch,
  resolveArtifactCompatibility,
} from "../cli/utils/ArtifactCompatibility.js";

describe("ORM hardening phase 2 - artifact compatibility matrix", () => {
  test("phase 2 extraction plan records the compatibility matrix seam", () => {
    const planPath = path.resolve(
      process.cwd(),
      "validation tasks/ORM-Hardening-Phase2-Artifact-Compatibility-Matrix-Extraction-Plan.md",
    );
    const content = fs.readFileSync(planPath, "utf8");

    expect(content).toContain("Status: COMPLETED");
    expect(content).toContain("src/cli/utils/ArtifactCompatibility.ts");
    expect(content).toContain("src/cli/utils/ArtifactStorage.ts");
    expect(content).toContain(
      "src/lab_test/orm.hardening.phase2.artifact-compatibility-matrix.logic.test.ts",
    );
  });

  test("collapseStorageKinds produces deterministic sql/mongo/mixed/unknown values", () => {
    expect(collapseStorageKinds([])).toBe("unknown");
    expect(collapseStorageKinds(["mongo"])).toBe("mongo");
    expect(collapseStorageKinds(["sql"])).toBe("sql");
    expect(collapseStorageKinds(["mongo", "sql"])).toBe("mixed");
    expect(collapseStorageKinds(["sql", "unknown"])).toBe("unknown");
    expect(collapseStorageKinds(["mixed", "mongo"])).toBe("mixed");
  });

  test("compatibility matrix preserves unknown-as-allowed and rejects mixed/different targets", () => {
    expect(resolveArtifactCompatibility("mongo", "mongo")).toEqual({
      matches: true,
      reason: "direct_match",
    });
    expect(resolveArtifactCompatibility("unknown", "mongo")).toEqual({
      matches: true,
      reason: "unknown_artifact_kind",
    });
    expect(resolveArtifactCompatibility("mixed", "mongo")).toEqual({
      matches: false,
      reason: "mixed_artifact",
    });
    expect(resolveArtifactCompatibility("sql", "mongo")).toEqual({
      matches: false,
      reason: "different_storage_kind",
    });
  });

  test("mismatch descriptions stay explicit for targeted routing failures", () => {
    expect(describeArtifactCompatibilityMismatch("mixed", "mongo")).toContain(
      "mixed sql/mongo artifacts cannot run in mongo-targeted flows",
    );
    expect(describeArtifactCompatibilityMismatch("sql", "mongo")).toContain(
      "sql artifacts cannot run in mongo-targeted flows",
    );
  });

  test("ArtifactStorage delegates grouped kind collapse and compatibility checks to the helper", () => {
    const storagePath = path.resolve(process.cwd(), "src/cli/utils/ArtifactStorage.ts");
    const content = fs.readFileSync(storagePath, "utf8");

    expect(content).toContain('from "./ArtifactCompatibility.js";');
    expect(content).toContain("collapseStorageKinds");
    expect(content).toContain("resolveArtifactCompatibility");
    expect(content).toContain("type StorageKind");
    expect(content).toContain("type TargetStorageKind");
    expect(content).toContain("return collapseStorageKinds(kinds);");
    expect(content).toContain(
      "return resolveArtifactCompatibility(artifactKind, targetKind).matches;",
    );
  });
});

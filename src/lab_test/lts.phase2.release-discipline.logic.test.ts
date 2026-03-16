import fs from "fs";
import path from "path";

describe("LTS phase 2 release discipline", () => {
  const rootDir = process.cwd();
  const phasePlanPath = path.resolve(
    rootDir,
    "validation tasks/LTS-Phase2-Release-Discipline-Plan.md"
  );
  const masterPlanPath = path.resolve(
    rootDir,
    "validation tasks/LTS-Trust-Building-Plan.md"
  );
  const cadencePath = path.resolve(rootDir, "src/documentation/release-cadence.md");
  const promotionChecklistPath = path.resolve(
    rootDir,
    "src/documentation/release-promotion-checklist.md"
  );
  const changelogPath = path.resolve(rootDir, "CHANGELOG.md");
  const upgradeGuidePath = path.resolve(rootDir, "src/documentation/upgrade-guide.md");

  test("phase plan records the completed release-discipline slice", () => {
    const plan = fs.readFileSync(phasePlanPath, "utf8");

    const requiredSnippets = [
      "# LTS Phase 2: Release Discipline Plan",
      "Status: COMPLETED",
      "`src/documentation/release-cadence.md`",
      "`src/documentation/release-promotion-checklist.md`",
      "changelog and upgrade requirements locked by tests",
      "Marked Phase 2 complete in the master LTS plan.",
    ];

    for (const snippet of requiredSnippets) {
      expect(plan).toContain(snippet);
    }
  });

  test("master LTS plan is completed and shows Phase 2 completed", () => {
    const masterPlan = fs.readFileSync(masterPlanPath, "utf8");

    const requiredSnippets = [
      "Status: COMPLETED",
      "### Phase 2: Release Discipline",
      "- [x] Write release cadence doc",
      "- [x] add release promotion checklist",
      "- [x] lock changelog/upgrade requirements in tests",
    ];

    for (const snippet of requiredSnippets) {
      expect(masterPlan).toContain(snippet);
    }
  });

  test("release cadence and promotion checklist define stable and LTS promotion rules", () => {
    const cadence = fs.readFileSync(cadencePath, "utf8");
    const checklist = fs.readFileSync(promotionChecklistPath, "utf8");

    const cadenceSnippets = [
      "# Release Cadence",
      "`alpha`",
      "`beta`",
      "`rc`",
      "`stable`",
      "`LTS`",
      "Patch releases:",
      "Minor releases:",
      "Major releases:",
      "Stable Release Requirements",
      "LTS Promotion Requirements",
      "Emergency Releases",
    ];

    for (const snippet of cadenceSnippets) {
      expect(cadence).toContain(snippet);
    }

    const checklistSnippets = [
      "# Release Promotion Checklist",
      "## Stable Promotion",
      "`npm run typecheck` passes",
      "`npm run build` passes",
      "`npm run test:coverage` passes",
      "`npm run test:pack-smoke` passes",
      "`CHANGELOG.md` is updated under `## Unreleased`",
      "`src/documentation/upgrade-guide.md` is updated when consumer action is required",
      "## LTS Promotion",
      "coverage has reached the LTS target",
      "## Blockers",
      "changelog is stale",
      "upgrade guidance is missing",
    ];

    for (const snippet of checklistSnippets) {
      expect(checklist).toContain(snippet);
    }
  });

  test("changelog and upgrade guide keep the expected release-discipline anchors", () => {
    const changelog = fs.readFileSync(changelogPath, "utf8");
    const upgradeGuide = fs.readFileSync(upgradeGuidePath, "utf8");

    expect(changelog).toContain("# Changelog");
    expect(changelog).toContain("## Unreleased");
    expect(upgradeGuide).toContain("# Upgrade and Migration Guide");
    expect(upgradeGuide).toContain("## Versioned Upgrade Notes");
    expect(upgradeGuide).toContain("## Pre-Upgrade Checklist");
    expect(upgradeGuide).toContain("## Post-Upgrade Checklist");
  });
});

import fs from "fs";
import path from "path";

describe("CI pipeline improvement", () => {
  const rootDir = process.cwd();

  test("plan records the layered CI improvements", () => {
    const plan = fs.readFileSync(
      path.resolve(rootDir, "validation tasks/CI-Pipeline-Improvement-Plan.md"),
      "utf8",
    );

    expect(plan).toContain("# CI Pipeline Improvement Plan");
    expect(plan).toContain("Status: COMPLETED");
    expect(plan).toContain("typecheck-nodenext");
    expect(plan).toContain("npm run test:coverage:docker");
    expect(plan).toContain(".github/workflows/publish.yml");
  });

  test("CI and publish workflows keep NodeNext and Docker coverage gates explicit", () => {
    const ciWorkflow = fs.readFileSync(
      path.resolve(rootDir, ".github/workflows/ci.yml"),
      "utf8",
    );
    const publishWorkflow = fs.readFileSync(
      path.resolve(rootDir, ".github/workflows/publish.yml"),
      "utf8",
    );

    expect(ciWorkflow).toContain("permissions:");
    expect(ciWorkflow).toContain("contents: read");
    expect(ciWorkflow).toContain("typecheck-nodenext:");
    expect(ciWorkflow).toContain("Typecheck (NodeNext)");
    expect(ciWorkflow).toContain("run: npm run typecheck:nodenext");
    expect(ciWorkflow).toContain("run: npm run test:coverage:docker");
    expect(ciWorkflow).toContain("needs: [typecheck, typecheck-nodenext, build]");

    expect(publishWorkflow).toContain("- name: Typecheck NodeNext");
    expect(publishWorkflow).toContain("run: npm run typecheck:nodenext");
  });
});

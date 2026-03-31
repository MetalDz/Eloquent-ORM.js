import fs from "fs";
import path from "path";

describe("CI workflow hardening alignment", () => {
  const rootDir = process.cwd();
  const workflowPath = path.resolve(rootDir, ".github/workflows/ci.yml");
  const checklistPath = path.resolve(
    rootDir,
    "src/documentation/release-qualification-checklist.md"
  );

  test("workflow covers live Mongo package smoke, Windows tarball smoke, and the newer demoScenario regressions", () => {
    const workflow = fs.readFileSync(workflowPath, "utf8");

    const requiredSnippets = [
      "permissions:",
      "contents: read",
      "package-smoke:",
      'ELOQUENT_PACK_SMOKE_ENABLE_MONGO_RUNTIME: "1"',
      "image: mongo:7",
      "MONGO_TEST_URI: mongodb://127.0.0.1:27017/eloquent_pack_smoke_test",
      "package-smoke-windows:",
      "name: Package Smoke (Windows Tarball)",
      "runs-on: windows-latest",
      "needs: [typecheck, typecheck-nodenext, build]",
      "nosql-regression:",
      "src/lab_test/nosql.phase8.demo-and-factory-status.logic.test.ts",
      "src/lab_test/nosql.phase15.cli-scenario-runtime.logic.test.ts",
      "src/lab_test/orm.hardening.phase5.demo-scenario-operations.logic.test.ts",
      "run: npm run test:coverage:docker",
    ];

    for (const snippet of requiredSnippets) {
      expect(workflow).toContain(snippet);
    }
  });

  test("release checklist reflects the dual package-smoke gates", () => {
    const checklist = fs.readFileSync(checklistPath, "utf8");

    const requiredSnippets = [
      "CI jobs: `package-smoke`, `package-smoke-windows`",
      "CI jobs: `typecheck`, `typecheck-nodenext`, `build`, `test-docker-coverage`",
      "`npm run test:pack-smoke` passes on Linux with `ELOQUENT_PACK_SMOKE_ENABLE_MONGO_RUNTIME=1`.",
      "`npm run test:pack-smoke` passes on Windows.",
      "`npm run typecheck:nodenext` passes.",
      "`npm run test:coverage:docker` passes.",
      "Windows tarball smoke regresses.",
    ];

    for (const snippet of requiredSnippets) {
      expect(checklist).toContain(snippet);
    }
  });
});

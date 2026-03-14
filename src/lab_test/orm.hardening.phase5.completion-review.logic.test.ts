import fs from "fs";
import path from "path";

describe("ORM hardening phase 5 completion review", () => {
  const rootDir = process.cwd();
  const planPath = path.resolve(
    rootDir,
    "validation tasks/ORM-Hardening-Phase5-CLI-Decomposition-And-Operations-Plan.md"
  );
  const reviewPath = path.resolve(
    rootDir,
    "validation tasks/ORM-Hardening-Phase5-Completion-Review.md"
  );

  test("phase 5 tracker is marked completed with the operational slices checked off", () => {
    const plan = fs.readFileSync(planPath, "utf8");

    const requiredSnippets = [
      "Status: COMPLETED",
      "[x] Start with `fileWriter` create/skip/overwrite/error branch coverage and deterministic console reporting.",
      "[x] Harden `ModelIntrospector` extraction and cache invalidation behavior with dedicated tests.",
      "[x] Harden `makeController` and `makeService` routing/logging with direct command tests and shared scaffold support.",
      "[x] Keep package publish whitelist aligned with the built `dist` root and pack-smoke expectations.",
      "[x] Keep `pack-smoke` npm packaging isolated from the user-global npm cache.",
      "[x] Keep `pack-smoke` sample creation independent from the repo-root tarball lifetime on Windows.",
      "[x] Harden `demo:scenario` SQL and Mongo execution branches with dedicated direct tests.",
      "[x] Normalize `make:controller` and `make:service` inputs so existing suffixes are not duplicated.",
    ];

    for (const snippet of requiredSnippets) {
      expect(plan).toContain(snippet);
    }
  });

  test("phase 5 completion review records the final outcome and validation gates", () => {
    const review = fs.readFileSync(reviewPath, "utf8");

    const requiredSnippets = [
      "# ORM Hardening Phase 5 Completion Review",
      "Status: COMPLETED",
      "Hardened `fileWriter` operations and deterministic logging.",
      "Hardened `ModelIntrospector` cache invalidation and dynamic loading flow.",
      "Normalized scaffold suffix handling so `Controller` and `Service` are not duplicated.",
      "Hardened `pack-smoke` tarball staging so later sample apps do not depend on the repo-root tarball lifetime.",
      "Hardened `demoScenario` SQL and Mongo execution branches with direct tests.",
      "`pack-smoke` is stable again on this Windows host.",
      "`typecheck` is green after the scaffold suffix normalization fix.",
      "`npm run typecheck`",
      "`npm run build`",
      "`npm run test:pack-smoke`",
    ];

    for (const snippet of requiredSnippets) {
      expect(review).toContain(snippet);
    }
  });
});

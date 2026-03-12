import fs from "fs";
import path from "path";

describe("ORM hardening phase 3 plan contract", () => {
  const rootDir = process.cwd();
  const planPath = path.resolve(
    rootDir,
    "validation tasks/ORM-Hardening-Phase3-Generator-And-Runtime-Loading-Plan.md"
  );

  test("phase 3 plan freezes generator and runtime-loading parity concerns", () => {
    const plan = fs.readFileSync(planPath, "utf8");

    const requiredSnippets = [
      "# ORM Hardening Phase 3: Generator and Runtime Loading Plan",
      "Status: PLANNED",
      "`model.tpl`",
      "`make:scenario`",
      "`tsRuntime`",
      "app-model fallback fixtures",
      "packaged smoke behavior for generated TypeScript files",
      "`src/cli/utils/typescript/tsRuntime.ts` (`149` lines)",
      "Generated temp `.ts` files and `/tmp` loading have already caused CI-only regressions.",
    ];

    for (const snippet of requiredSnippets) {
      expect(plan).toContain(snippet);
    }
  });

  test("phase 3 plan includes acceptance criteria for generated-model parity", () => {
    const plan = fs.readFileSync(planPath, "utf8");

    const requiredSnippets = [
      "## Non-Goals",
      "No duplication of model behavior in generator templates.",
      "## Proposed Work Slices",
      "Keep template and inline generator outputs feature-aligned.",
      "Validate generated app/test models against the default BaseModel stack.",
      "## Acceptance Criteria",
      "Generated models from `make:model` and `make:scenario` inherit the same default runtime surface.",
      "Temp-generated `.ts` files can be loaded reliably in local and CI contexts.",
      "Pack-smoke covers at least one generated SQL flow and one generated Mongo flow",
      "## Validation Strategy",
      "`npm run build`",
      "`npm run test:pack-smoke`",
    ];

    for (const snippet of requiredSnippets) {
      expect(plan).toContain(snippet);
    }
  });
});

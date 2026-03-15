import fs from "fs";
import path from "path";

describe("API reference refresh", () => {
  test("api reference documents root exports and the named model subpath clearly", () => {
    const content = fs.readFileSync(
      path.resolve(process.cwd(), "src/documentation/api-reference.md"),
      "utf8",
    );

    const requiredSnippets = [
      "# EloquentJS Public API Reference",
      "Last updated: 2026-03-15",
      "## Root Package: `eloquentjs`",
      "## Model Subpath: `eloquentjs/Model`",
      "`eloquentjs/Model` does not expose a default export.",
      "`eloquentjs/Model` does not expose the root `Model` alias.",
      'import { Model } from "eloquentjs"',
      'import { SqlModel, MongoModel, type ModelInstance } from "eloquentjs/Model";',
      "New public exports must be added through `src/index.ts` or `src/Model.ts` and documented here.",
    ];

    for (const snippet of requiredSnippets) {
      expect(content).toContain(snippet);
    }
  });

  test("refresh plan tracks the api-reference update", () => {
    const plan = fs.readFileSync(
      path.resolve(process.cwd(), "validation tasks/API-Reference-Refresh-Plan.md"),
      "utf8",
    );

    expect(plan).toContain("# API Reference Refresh Plan");
    expect(plan).toContain("Status: COMPLETED");
    expect(plan).toContain("`eloquentjs/Model` has named exports only.");
    expect(plan).toContain("`src/lab_test/api.reference.refresh.logic.test.ts`");
  });
});

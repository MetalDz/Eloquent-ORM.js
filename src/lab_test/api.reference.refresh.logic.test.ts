import fs from "fs";
import path from "path";

describe("API reference refresh", () => {
  const packageJson = JSON.parse(
    fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf8"),
  ) as { name?: string };
  const packageName = packageJson.name ?? "@alpha.consultings/eloquent-orm.js";

  test("api reference documents root exports and the named model subpath clearly", () => {
    const content = fs.readFileSync(
      path.resolve(process.cwd(), "src/documentation/api-reference.md"),
      "utf8",
    );

    const requiredSnippets = [
      "# EloquentJS Public API Reference",
      "Last updated: 2026-04-11",
      `## Root Package: \`${packageName}\``,
      `## Model Subpath: \`${packageName}/Model\``,
      `\`${packageName}/Model\` does not expose a default export.`,
      `\`${packageName}/Model\` does not expose the root \`Model\` alias.`,
      `import { Model } from "${packageName}"`,
      `import { SqlModel, MongoModel, type ModelInstance } from "${packageName}/Model";`,
      "- `transaction`",
      "- `lockedTransaction`",
      "Use `transaction(...)` for grouped SQL or Mongo runtime writes.",
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
    expect(plan).toContain("has named exports only.");
    expect(plan).toContain("`src/lab_test/api.reference.refresh.logic.test.ts`");
  });
});

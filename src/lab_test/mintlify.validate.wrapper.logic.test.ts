import fs from "fs";
import path from "path";

describe("Mintlify validate wrapper hardening", () => {
  const rootDir = process.cwd();

  test("task doc captures the wrapper hardening scope", () => {
    const plan = fs.readFileSync(
      path.resolve(rootDir, "validation tasks/Mintlify-Validate-Wrapper-Hardening-Plan.md"),
      "utf8"
    );

    const requiredSnippets = [
      "# Mintlify Validate Wrapper Hardening Plan",
      "Status: IN PROGRESS",
      "`npm run docs:build` can fail inside Docker",
      "harden `validate` in `scripts/run-mintlify.cjs`",
      "validate root `docs.json` against the v2 docs config schema",
      "upgrade `docs/mint.json` to docs-config form before validating it against the same v2 schema",
      "invalid root `docs.json` fails with a clear `Invalid docs.json` error",
      "invalid `docs/mint.json` fails with a clear `Invalid mint.json` error",
    ];

    for (const snippet of requiredSnippets) {
      expect(plan).toContain(snippet);
    }
  });

  test("wrapper validate path checks both docs.json and mint.json through schema-aware logic", () => {
    const script = fs.readFileSync(
      path.resolve(rootDir, "scripts/run-mintlify.cjs"),
      "utf8"
    );

    const requiredSnippets = [
      'if (command === "validate")',
      "validateDocsConfig()",
      "@mintlify/validation/dist/mint-config/schemas/v2/index.js",
      "@mintlify/validation/dist/mint-config/upgrades/upgradeToDocsConfig.js",
      'formatZodIssues("docs.json"',
      'formatZodIssues("mint.json"',
      "shouldUpgradeTheme: true",
      "success docs config validated",
    ];

    for (const snippet of requiredSnippets) {
      expect(script).toContain(snippet);
    }
  });
});

import fs from "fs";
import path from "path";

describe("pack-smoke mongo factory-status visible section", () => {
  test("script distinguishes visible factory-status output from incompatible-factory warnings", () => {
    const scriptPath = path.resolve(process.cwd(), "scripts/pack-smoke.js");
    const content = fs.readFileSync(scriptPath, "utf8");

    const requiredSnippets = [
      "function factoryStatusVisibleSection(text) {",
      'return text.split(/\\r?\\nLoaded \\d+ factories\\./, 1)[0] || text;',
      "const factoryStatusMongoVisible = factoryStatusVisibleSection(factoryStatusMongo.combined);",
      '"nosql factory:status --mongo"',
      'factoryStatusMongoVisible,',
      "\"'UserFactory'\"",
      '"Skipping incompatible factory for mongo: UserFactory"',
    ];

    for (const snippet of requiredSnippets) {
      expect(content).toContain(snippet);
    }
  });
});

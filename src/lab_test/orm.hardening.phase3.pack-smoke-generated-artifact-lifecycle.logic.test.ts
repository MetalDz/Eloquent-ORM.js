import fs from "fs";
import path from "path";

describe("ORM hardening phase 3 pack-smoke generated artifact lifecycle", () => {
  test("pack-smoke loads generated SQL and Mongo models through packaged tsRuntime", () => {
    const packageJson = JSON.parse(
      fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf8"),
    ) as { name?: string };
    const packageName = packageJson.name ?? "@alpha.consultings/eloquent-orm.js";
    const scriptPath = path.resolve(process.cwd(), "scripts/pack-smoke.js");
    const content = fs.readFileSync(scriptPath, "utf8");

    const requiredSnippets = [
      '"node_modules", ${JSON.stringify(packageName)}, "dist", "cli", "utils", "typescript", "tsRuntime.js"',
      '"generated SQL model runtime"',
      '"generated scenario SQL model runtime"',
      '"generated Mongo model runtime"',
      '"DemoAuto"',
      '"GeoLocation"',
      '"User"',
      'generated-model-runtime:${modelName}:${objectValue.name}',
      '["src", "test", "database", "models", "DemoAuto.ts"]',
      '["src", "test", "database", "models", "GeoLocation.ts"]',
    ];

    expect(content).toContain('const packageMeta = require(path.join(repoRoot, "package.json"));');
    expect(content).toContain("const packageName = String(packageMeta.name || \"\").trim();");
    expect(packageName).toBeTruthy();
    for (const snippet of requiredSnippets) {
      expect(content).toContain(snippet);
    }
  });
});

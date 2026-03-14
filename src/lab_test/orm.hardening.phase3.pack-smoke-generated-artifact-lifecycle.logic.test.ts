import fs from "fs";
import path from "path";

describe("ORM hardening phase 3 pack-smoke generated artifact lifecycle", () => {
  test("pack-smoke loads generated SQL and Mongo models through packaged tsRuntime", () => {
    const scriptPath = path.resolve(process.cwd(), "scripts/pack-smoke.js");
    const content = fs.readFileSync(scriptPath, "utf8");

    const requiredSnippets = [
      '"node_modules", "eloquentjs", "dist", "cli", "utils", "typescript", "tsRuntime.js"',
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

    for (const snippet of requiredSnippets) {
      expect(content).toContain(snippet);
    }
  });
});

import fs from "fs";
import path from "path";

describe("dual package cjs esm compatibility plan", () => {
  test("plan locks the non-breaking dual-surface package goal", () => {
    const planPath = path.resolve(
      process.cwd(),
      "validation tasks/Dual-Package-CJS-ESM-Compatibility-Plan.md",
    );
    const content = fs.readFileSync(planPath, "utf8");

    expect(content).toContain("# Dual Package CJS ESM Compatibility Plan");
    expect(content).toContain("Status: LOCKED");
    expect(content).toContain('require("@alpha.consultings/eloquent-orm.js")');
    expect(content).toContain('import { ... } from "@alpha.consultings/eloquent-orm.js"');
    expect(content).toContain('`"require": "./dist/index.js"`');
    expect(content).toContain('`"import": "./esm/index.mjs"`');
    expect(content).toContain("Do not remove CommonJS support.");
    expect(content).toContain("Do not make the package ESM-only.");
    expect(content).toContain("Fix the published root ESM surface so `Factory` is not touched eagerly.");
    expect(content).toContain("release as `patch`");
    expect(content).toContain("src/lab_test/dual.package.cjs-esm.compatibility.logic.test.ts");
  });
});

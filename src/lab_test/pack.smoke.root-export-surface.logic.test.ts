import fs from "fs";
import path from "path";

describe("pack-smoke root export surface", () => {
  test("pack-smoke root export allowlist includes the current Model root export", () => {
    const scriptPath = path.resolve(process.cwd(), "scripts/pack-smoke.js");
    const content = fs.readFileSync(scriptPath, "utf8");

    expect(content).toContain("const expectedPublicExports = [");
    expect(content).toContain('"Model",');
    expect(content).toContain("function verifyPublicExports(sample) {");
    expect(content).toContain(
      "[package import] export surface mismatch\\nExpected: ${expectedPublicExports.join(\",\")}\\nActual: ${actualExports.join(\",\")}"
    );
  });

  test("plan tracks the pack-smoke root export surface fix", () => {
    const planPath = path.resolve(
      process.cwd(),
      "validation tasks/Pack-Smoke-Root-Export-Surface-Plan.md",
    );
    const content = fs.readFileSync(planPath, "utf8");

    expect(content).toContain("# Pack-Smoke Root Export Surface Plan");
    expect(content).toContain("Status: COMPLETED");
    expect(content).toContain("`scripts/pack-smoke.js`");
    expect(content).toContain("Added the root `Model` export to the pack-smoke allowlist.");
    expect(content).toContain("`src/lab_test/pack.smoke.root-export-surface.logic.test.ts`");
  });
});

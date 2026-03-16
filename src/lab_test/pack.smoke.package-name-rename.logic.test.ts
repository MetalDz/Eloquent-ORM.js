import fs from "fs";
import path from "path";

describe("pack smoke package-name rename support", () => {
  const repoRoot = process.cwd();
  const packageJsonPath = path.resolve(repoRoot, "package.json");
  const scriptPath = path.resolve(repoRoot, "scripts/pack-smoke.js");
  const planPath = path.resolve(
    repoRoot,
    "validation tasks/Pack-Smoke-Package-Name-Rename-Plan.md",
  );

  test("pack-smoke resolves the package name from package.json instead of hardcoding eloquentjs", () => {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8")) as {
      name?: string;
    };
    const script = fs.readFileSync(scriptPath, "utf8");

    expect(packageJson.name).toBeTruthy();
    expect(script).toContain('const packageMeta = require(path.join(repoRoot, "package.json"));');
    expect(script).toContain('const packageName = String(packageMeta.name || "").trim();');
    expect(script).toContain('"node_modules", packageName, "dist", "cli", "eloquent.js"');
    expect(script).toContain('const pkg = require(${JSON.stringify(packageName)})');
    expect(script).not.toContain('require("eloquentjs")');
    expect(script).not.toContain('"node_modules", "eloquentjs"');
  });

  test("plan tracks the pack-smoke rename slice", () => {
    const plan = fs.readFileSync(planPath, "utf8");

    expect(plan).toContain("# Pack Smoke Package Name Rename Plan");
    expect(plan).toContain("Status: COMPLETED");
    expect(plan).toContain("scripts/pack-smoke.js");
    expect(plan).toContain("src/lab_test/pack.smoke.package-name-rename.logic.test.ts");
  });
});

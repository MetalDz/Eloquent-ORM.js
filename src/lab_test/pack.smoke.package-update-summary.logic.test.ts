import fs from "fs";
import path from "path";

describe("pack-smoke package update summary surface", () => {
  const repoRoot = process.cwd();

  test("published package files include PACKAGE-UPDATE-SUMMARY.md", () => {
    const packageJson = JSON.parse(
      fs.readFileSync(path.resolve(repoRoot, "package.json"), "utf8"),
    ) as { files?: string[] };

    expect(packageJson.files).toEqual(
      expect.arrayContaining(["PACKAGE-UPDATE-SUMMARY.md"]),
    );
  });

  test("pack-smoke tarball surface requires PACKAGE-UPDATE-SUMMARY.md", () => {
    const scriptPath = path.resolve(repoRoot, "scripts/pack-smoke.js");
    const content = fs.readFileSync(scriptPath, "utf8");

    expect(content).toContain('"package/PACKAGE-UPDATE-SUMMARY.md"');
  });
});

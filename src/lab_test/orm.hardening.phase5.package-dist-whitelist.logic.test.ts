import fs from "fs";
import path from "path";

describe("ORM hardening phase 5 package dist whitelist", () => {
  test("package.json publishes the dist root explicitly", () => {
    const packageJsonPath = path.resolve(process.cwd(), "package.json");
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf8")) as {
      files?: string[];
    };

    expect(pkg.files).toEqual(
      expect.arrayContaining(["dist", "src/cli/templates/**/*", "README.md", "CHANGELOG.md"])
    );
    expect(pkg.files).not.toEqual(expect.arrayContaining(["dist/**/*"]));
  });

  test(".npmignore does not exclude dist while still excluding non-package sources", () => {
    const npmIgnorePath = path.resolve(process.cwd(), ".npmignore");
    const content = fs.readFileSync(npmIgnorePath, "utf8");

    expect(content).toContain("src/app");
    expect(content).toContain("src/test");
    expect(content).toContain("src/lab_test");
    expect(content).not.toContain("dist");
  });
});

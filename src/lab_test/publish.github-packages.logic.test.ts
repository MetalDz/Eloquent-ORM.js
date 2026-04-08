import fs from "fs";
import path from "path";

describe("publish workflow GitHub Packages contract", () => {
  const rootDir = process.cwd();

  test("publish workflow can push the released package to GitHub Packages safely", () => {
    const workflow = fs.readFileSync(
      path.resolve(rootDir, ".github/workflows/publish.yml"),
      "utf8",
    );

    expect(workflow).toContain("packages: write");
    expect(workflow).toContain("Setup Node.js for GitHub Packages");
    expect(workflow).toContain("registry-url: https://npm.pkg.github.com");
    expect(workflow).toContain('scope: "@alpha.consultings"');
    expect(workflow).toContain("Publish to GitHub Packages");
    expect(workflow).toContain("NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}");
    expect(workflow).toContain("npm publish --registry=https://npm.pkg.github.com");
    expect(workflow).toContain(
      'npm view "@alpha.consultings/eloquent-orm.js@$VERSION" version --registry=https://npm.pkg.github.com',
    );
    expect(workflow).toContain("GitHub Packages already has version $VERSION; skipping.");
  });
});

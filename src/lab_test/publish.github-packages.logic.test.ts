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
    expect(workflow).toContain("Decide GitHub Packages publish eligibility");
    expect(workflow).toContain("REPO_OWNER: ${{ github.repository_owner }}");
    expect(workflow).toContain('if: steps.github_packages.outputs.enabled == \'true\'');
    expect(workflow).toContain(
      'GitHub Packages skipped: package scope @$PACKAGE_SCOPE does not match repository owner @$REPO_OWNER.',
    );
    expect(workflow).toContain("Setup Node.js for GitHub Packages");
    expect(workflow).toContain("registry-url: https://npm.pkg.github.com");
    expect(workflow).toContain("Publish to GitHub Packages");
    expect(workflow).toContain("NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}");
    expect(workflow).toContain("npm publish --registry=https://npm.pkg.github.com");
    expect(workflow).toContain('PACKAGE_NAME="${{ steps.github_packages.outputs.package_name }}"');
    expect(workflow).toContain('npm view "$PACKAGE_NAME@$VERSION" version --registry=https://npm.pkg.github.com');
    expect(workflow).toContain("GitHub Packages already has version $VERSION; skipping.");
  });
});

import fs from "fs";
import os from "os";
import path from "path";

describe("package quick info sync", () => {
  const rootDir = process.cwd();
  const syncScriptPath = path.resolve(rootDir, "scripts/sync-package-metadata.cjs");

  test("sync helper renders the quick info block into the root summary file and README", () => {
    const { syncPackageMetadata } = require(syncScriptPath) as {
      syncPackageMetadata: (options: { cwd: string }) => {
        changedFiles: string[];
        packageName: string;
        version: string;
      };
    };

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-quick-info-"));

    try {
      fs.writeFileSync(
        path.join(tempDir, "package.json"),
        JSON.stringify(
          {
            name: "@alpha.consultings/eloquent-orm.js",
            version: "2.4.6",
            homepage: "https://alphaconsultings.mintlify.app/",
          },
          null,
          2,
        ),
        "utf8",
      );

      fs.writeFileSync(
        path.join(tempDir, "README.md"),
        [
          "# Eloquent ORM JS",
          "",
          "## What this package gives you",
          "",
          "<!-- package-quick-info:start -->",
          "outdated",
          "<!-- package-quick-info:end -->",
          "",
        ].join("\n"),
        "utf8",
      );

      fs.writeFileSync(
        path.join(tempDir, "PACKAGE-UPDATE-SUMMARY.md"),
        [
          "# Package Update Summary",
          "",
          "Version: `0.1.0`",
          "",
          "## Release Lineup",
          "",
          "<!-- release-lineup:start -->",
          "old",
          "<!-- release-lineup:end -->",
          "",
          "## Latest Release Headline",
          "",
          "<!-- latest-package-headline:start -->",
          "- Patched. This was an ORM CLI bug, not a make:registry regression.",
          "<!-- latest-package-headline:end -->",
          "",
          "<!-- latest-package-update:start -->",
          "- Support NodeNext local `.js` specifiers to sibling `.ts` source files in the CLI runtime and fail `make:migration` when model processing errors occur.",
          "<!-- latest-package-update:end -->",
          "",
          "<!-- package-quick-info:start -->",
          "outdated",
          "<!-- package-quick-info:end -->",
          "",
        ].join("\n"),
        "utf8",
      );

      fs.writeFileSync(
        path.join(tempDir, "CHANGELOG.md"),
        [
          "## [2.4.6](https://example.test/compare/v2.4.5...v2.4.6) (2026-03-28)",
          "",
          "### Bug Fixes",
          "",
          "* fixture latest",
          "",
          "## [2.4.5](https://example.test/compare/v2.4.4...v2.4.5) (2026-03-27)",
          "",
          "### Bug Fixes",
          "",
          "* fixture old",
          "",
        ].join("\n"),
        "utf8",
      );

      const result = syncPackageMetadata({ cwd: tempDir });

      expect(result.changedFiles).toEqual(
        expect.arrayContaining([
          path.join(tempDir, "README.md"),
          path.join(tempDir, "PACKAGE-UPDATE-SUMMARY.md"),
        ]),
      );

      const readme = fs.readFileSync(path.join(tempDir, "README.md"), "utf8");
      const summary = fs.readFileSync(
        path.join(tempDir, "PACKAGE-UPDATE-SUMMARY.md"),
        "utf8",
      );

      for (const content of [readme, summary]) {
        expect(content).toContain("Quick info:");
        expect(content).toContain("- Package: `@alpha.consultings/eloquent-orm.js`");
        expect(content).toContain("- Version: `v2.4.6`");
        expect(content).toContain("- Latest release: `v2.4.6 latest`");
        expect(content).toContain(
          "- What's new: [Patched. This was an ORM CLI bug, not a make:registry regression.](https://alphaconsultings.mintlify.app/release/latest-release-summary)",
        );
        expect(content).toContain("- Old release: `v2.4.5`");
        expect(content).toContain(
          "- Latest update: Support NodeNext local `.js` specifiers to sibling `.ts` source files in the CLI runtime and fail `make:migration` when model processing errors occur.",
        );
        expect(content).toContain("Official docs: https://alphaconsultings.mintlify.app");
        expect(content).toContain("Release history: https://alphaconsultings.mintlify.app/release/history");
        expect(content).toContain(
          "Latest release notes: [PACKAGE-UPDATE-SUMMARY.md](./PACKAGE-UPDATE-SUMMARY.md)",
        );
      }

      expect(summary).toContain("Latest Release:");
      expect(summary).toContain("- `v2.4.6 latest`");
      expect(summary).toContain("Old Release:");
      expect(summary).toContain("- `v2.4.5`");
      expect(summary).toContain("Version: `2.4.6`");
      expect(summary).toContain("## Latest Release Headline");
      expect(summary).toContain(
        "- Patched. This was an ORM CLI bug, not a make:registry regression.",
      );
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

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
          "<!-- latest-package-update:start -->",
          "- Added smarter release quick info syncing and ESM-safe registry generation.",
          "<!-- latest-package-update:end -->",
          "",
          "<!-- package-quick-info:start -->",
          "outdated",
          "<!-- package-quick-info:end -->",
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
        expect(content).toContain("- Version: `2.4.6`");
        expect(content).toContain(
          "- Latest update: Added smarter release quick info syncing and ESM-safe registry generation.",
        );
        expect(content).toContain("Official docs: https://alphaconsultings.mintlify.app");
        expect(content).toContain("Release history: https://alphaconsultings.mintlify.app/release/history");
        expect(content).toContain(
          "Latest release notes: [PACKAGE-UPDATE-SUMMARY.md](./PACKAGE-UPDATE-SUMMARY.md)",
        );
      }

      expect(summary).toContain("Version: `2.4.6`");
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

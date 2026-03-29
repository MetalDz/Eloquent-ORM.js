import fs from "fs";
import os from "os";
import path from "path";

describe("semantic-release version sync automation", () => {
  const rootDir = process.cwd();
  const releaseConfigPath = path.resolve(rootDir, ".releaserc.json");
  const syncPluginPath = path.resolve(
    rootDir,
    "scripts/semantic-release-sync-doc-versions.cjs",
  );
  const repoPackageJson = JSON.parse(
    fs.readFileSync(path.resolve(rootDir, "package.json"), "utf8"),
  ) as { name?: string; version?: string };
  const packageName = repoPackageJson.name ?? "@alpha.consultings/eloquent-orm.js";
  const releaseVersion = repoPackageJson.version ?? "1.0.0";
  const previousVersion = "0.9.0-rc.1";

  test("release config syncs docs before the git release commit", () => {
    const releaseConfig = JSON.parse(fs.readFileSync(releaseConfigPath, "utf8")) as {
      plugins: Array<string | [string, { assets?: string[] }]>;
    };

    expect(releaseConfig.plugins).toContain("./scripts/semantic-release-sync-doc-versions.cjs");

    const gitPlugin = releaseConfig.plugins.find(
      (plugin): plugin is [string, { assets?: string[] }] =>
        Array.isArray(plugin) && plugin[0] === "@semantic-release/git",
    );

    expect(gitPlugin).toBeDefined();
    expect(gitPlugin?.[1].assets).toEqual(
      expect.arrayContaining([
        "README.md",
        "PACKAGE-UPDATE-SUMMARY.md",
        "package.json",
        "docs/**/*.mdx",
        "src/documentation/**/*.md",
      ]),
    );
  });

  test("sync helper updates package.json and doc version markers to the release version", () => {
    const { syncVersionFiles } = require(syncPluginPath) as {
      syncVersionFiles: (options: { cwd: string; version: string }) => string[];
    };

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-release-sync-"));

    try {
      fs.mkdirSync(path.join(tempDir, "docs"), { recursive: true });
      fs.mkdirSync(path.join(tempDir, "src", "documentation"), { recursive: true });
      fs.mkdirSync(path.join(tempDir, ".github", "workflows"), { recursive: true });

      fs.writeFileSync(
        path.join(tempDir, "package.json"),
        JSON.stringify(
          {
            name: packageName,
            version: previousVersion,
            engines: { node: "20.x" },
            docsSupportMatrix: { memcachedServer: "1.6+" },
            dependencies: {
              "better-sqlite3": "12.2.0",
              memcached: "^2.2.2",
            },
            devDependencies: {
              typescript: "^5.9.3",
            },
          },
          null,
          2,
        ),
        "utf8",
      );
      fs.writeFileSync(
        path.join(tempDir, "docs", "index.mdx"),
        `# Eloquent ORM JS\n\nVersion: \`${previousVersion}\`\n`,
        "utf8",
      );
      fs.writeFileSync(
        path.join(tempDir, "src", "documentation", "package-docs-index.md"),
        `# Package Docs\n\nVersion: \`${previousVersion}\`\n`,
        "utf8",
      );
      fs.writeFileSync(
        path.join(tempDir, ".github", "workflows", "ci.yml"),
        [
          "jobs:",
          "  quality:",
          "    services:",
          "      mysql:",
          "        image: mysql:8.0",
          "      postgres:",
          "        image: postgres:16",
          "      mongo:",
          "        image: mongo:7",
        ].join("\n"),
        "utf8",
      );
      for (const target of [
        path.join(tempDir, "README.md"),
        path.join(tempDir, "PACKAGE-UPDATE-SUMMARY.md"),
        path.join(tempDir, "docs", "release", "history.mdx"),
        path.join(tempDir, "docs", "release", "latest-release-summary.mdx"),
        path.join(tempDir, "docs", "getting-started", "installation.mdx"),
        path.join(tempDir, "docs", "support", "support-policy.mdx"),
        path.join(tempDir, "src", "documentation", "release-history.md"),
        path.join(tempDir, "src", "documentation", "latest-release-summary.md"),
        path.join(tempDir, "src", "documentation", "installation-and-quickstart.md"),
        path.join(tempDir, "src", "documentation", "support-policy.md"),
      ]) {
        fs.mkdirSync(path.dirname(target), { recursive: true });
        const defaultContent =
          path.basename(target) === "README.md"
            ? [
                "## What this package gives you",
                "",
                "<!-- package-quick-info:start -->",
                "old",
                "<!-- package-quick-info:end -->",
                "",
                "## Prerequisites",
                "",
                "<!-- supported-prerequisites:start -->",
                "old",
                "<!-- supported-prerequisites:end -->",
                "",
              ].join("\n")
            : path.basename(target) === "PACKAGE-UPDATE-SUMMARY.md"
              ? [
                  "# Package Update Summary",
                  "",
                  `Version: \`${previousVersion}\``,
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
                  "- Patched. Fixture release headline.",
                  "<!-- latest-package-headline:end -->",
                  "",
                  "<!-- latest-package-update:start -->",
                  "- Release summary from test fixture.",
                  "<!-- latest-package-update:end -->",
                  "",
                  "<!-- package-quick-info:start -->",
                  "old",
                  "<!-- package-quick-info:end -->",
                  "",
                ].join("\n")
              : target.endsWith(path.join("docs", "release", "history.mdx"))
                ? [
                    "---",
                    `title: Release History / v${previousVersion} / Latest Release Notes`,
                    "description: release history fixture",
                    "---",
                    "",
                    `# Release History / v${previousVersion} / Latest Release Notes`,
                    "",
                    `- Current package version: \`${previousVersion}\``,
                    "",
                  ].join("\n")
                : target.endsWith(path.join("docs", "release", "latest-release-summary.mdx"))
                  ? [
                      "---",
                      `title: Latest Release Summary / v${previousVersion}`,
                      "description: latest release summary fixture",
                      "---",
                      "",
                      `# Latest Release Summary / v${previousVersion}`,
                      "",
                      `- Current package version: \`${previousVersion}\``,
                      "",
                      "## What's new",
                      "",
                      "<!-- latest-package-headline:start -->",
                      "- stale headline",
                      "<!-- latest-package-headline:end -->",
                      "",
                      "## Exact changes",
                      "",
                      "<!-- latest-package-update:start -->",
                      "- stale update",
                      "<!-- latest-package-update:end -->",
                      "",
                    ].join("\n")
                : target.endsWith(path.join("src", "documentation", "release-history.md"))
                  ? [
                      `# Release History / v${previousVersion} / Latest Release Notes`,
                      "",
                      `- Current package version: \`${previousVersion}\``,
                      "",
                    ].join("\n")
                  : target.endsWith(path.join("src", "documentation", "latest-release-summary.md"))
                    ? [
                        `# Latest Release Summary / v${previousVersion}`,
                        "",
                        `- Current package version: \`${previousVersion}\``,
                        "",
                        "## What's New",
                        "<!-- latest-package-headline:start -->",
                        "- stale headline",
                        "<!-- latest-package-headline:end -->",
                        "",
                        "## Exact Changes",
                        "<!-- latest-package-update:start -->",
                        "- stale update",
                        "<!-- latest-package-update:end -->",
                        "",
                      ].join("\n")
              : "## Prerequisites\n\n<!-- supported-prerequisites:start -->\nold\n<!-- supported-prerequisites:end -->\n";
        fs.writeFileSync(target, defaultContent, "utf8");
      }

      fs.writeFileSync(
        path.join(tempDir, "CHANGELOG.md"),
        [
          `## [${releaseVersion}](https://example.test/compare/v${previousVersion}...v${releaseVersion}) (2026-03-28)`,
          "",
          "### Bug Fixes",
          "",
          "* release fixture latest",
          "",
          `## [${previousVersion}](https://example.test/compare/v0.8.0...v${previousVersion}) (2026-03-27)`,
          "",
          "### Bug Fixes",
          "",
          "* release fixture old",
          "",
        ].join("\n"),
        "utf8",
      );

      const changedFiles = syncVersionFiles({ cwd: tempDir, version: releaseVersion });

      expect(changedFiles).toEqual(
        expect.arrayContaining([
          path.join(tempDir, "package.json"),
          path.join(tempDir, "docs", "index.mdx"),
          path.join(tempDir, "src", "documentation", "package-docs-index.md"),
        ]),
      );

      const updatedPackageJson = JSON.parse(
        fs.readFileSync(path.join(tempDir, "package.json"), "utf8"),
      ) as { version: string };
      expect(updatedPackageJson.version).toBe(releaseVersion);

      const updatedDocs = fs.readFileSync(path.join(tempDir, "docs", "index.mdx"), "utf8");
      const updatedSourceDocs = fs.readFileSync(
        path.join(tempDir, "src", "documentation", "package-docs-index.md"),
        "utf8",
      );
      const updatedReadme = fs.readFileSync(path.join(tempDir, "README.md"), "utf8");
      const updatedQuickInfo = fs.readFileSync(
        path.join(tempDir, "PACKAGE-UPDATE-SUMMARY.md"),
        "utf8",
      );
      const updatedReleaseHistory = fs.readFileSync(
        path.join(tempDir, "docs", "release", "history.mdx"),
        "utf8",
      );
      const updatedLatestReleaseSummary = fs.readFileSync(
        path.join(tempDir, "docs", "release", "latest-release-summary.mdx"),
        "utf8",
      );
      const updatedSourceReleaseHistory = fs.readFileSync(
        path.join(tempDir, "src", "documentation", "release-history.md"),
        "utf8",
      );
      const updatedSourceLatestReleaseSummary = fs.readFileSync(
        path.join(tempDir, "src", "documentation", "latest-release-summary.md"),
        "utf8",
      );

      expect(updatedDocs).toContain(`Version: \`${releaseVersion}\``);
      expect(updatedSourceDocs).toContain(`Version: \`${releaseVersion}\``);
      expect(updatedReadme).toContain(`- Version: \`v${releaseVersion}\``);
      expect(updatedReadme).toContain(`- Latest release: \`v${releaseVersion} latest\``);
      expect(updatedReadme).toContain(
        "- What's new: [Patched. Fixture release headline.](https://alphaconsultings.mintlify.app/release/latest-release-summary)",
      );
      expect(updatedReadme).toContain(`- Old release: \`v${previousVersion}\``);
      expect(updatedReadme).toContain("Official docs: https://alphaconsultings.mintlify.app");
      expect(updatedReadme).toContain("Release history: https://alphaconsultings.mintlify.app/release/history");
      expect(updatedQuickInfo).toContain(`Version: \`${releaseVersion}\``);
      expect(updatedQuickInfo).toContain("Latest Release:");
      expect(updatedQuickInfo).toContain(`- \`v${releaseVersion} latest\``);
      expect(updatedQuickInfo).toContain("Old Release:");
      expect(updatedQuickInfo).toContain(`- \`v${previousVersion}\``);
      expect(updatedQuickInfo).toContain(`- Version: \`v${releaseVersion}\``);
      expect(updatedQuickInfo).toContain(
        "- What's new: [Patched. Fixture release headline.](https://alphaconsultings.mintlify.app/release/latest-release-summary)",
      );
      expect(updatedQuickInfo).toContain("Latest update: Release summary from test fixture.");
      expect(updatedQuickInfo).toContain("Release history: https://alphaconsultings.mintlify.app/release/history");
      expect(updatedReleaseHistory).toContain(
        `title: Release History / v${releaseVersion} / Latest Release Notes`,
      );
      expect(updatedReleaseHistory).toContain(
        `# Release History / v${releaseVersion} / Latest Release Notes`,
      );
      expect(updatedReleaseHistory).toContain(
        `Current package version: \`${releaseVersion}\``,
      );
      expect(updatedSourceReleaseHistory).toContain(
        `# Release History / v${releaseVersion} / Latest Release Notes`,
      );
      expect(updatedSourceReleaseHistory).toContain(
        `Current package version: \`${releaseVersion}\``,
      );
      expect(updatedLatestReleaseSummary).toContain(
        `title: Latest Release Summary / v${releaseVersion}`,
      );
      expect(updatedLatestReleaseSummary).toContain(
        `# Latest Release Summary / v${releaseVersion}`,
      );
      expect(updatedLatestReleaseSummary).toContain(
        `Current package version: \`${releaseVersion}\``,
      );
      expect(updatedLatestReleaseSummary).toContain(
        "- Patched. Fixture release headline.",
      );
      expect(updatedLatestReleaseSummary).toContain(
        "- Release summary from test fixture.",
      );
      expect(updatedSourceLatestReleaseSummary).toContain(
        `# Latest Release Summary / v${releaseVersion}`,
      );
      expect(updatedSourceLatestReleaseSummary).toContain(
        `Current package version: \`${releaseVersion}\``,
      );
      expect(updatedSourceLatestReleaseSummary).toContain(
        "- Patched. Fixture release headline.",
      );
      expect(updatedSourceLatestReleaseSummary).toContain(
        "- Release summary from test fixture.",
      );
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

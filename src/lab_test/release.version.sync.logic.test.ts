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
            name: "eloquent-orm.js",
            version: "1.0.0-rc.1",
            readme: "Factories seeds integration in 1.0.0-rc.1",
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
        "# Eloquent ORM JS\n\nVersion: `1.0.0-rc.1`\n",
        "utf8",
      );
      fs.writeFileSync(
        path.join(tempDir, "src", "documentation", "package-docs-index.md"),
        "# Package Docs\n\nVersion: `1.0.0-rc.1`\n",
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
        path.join(tempDir, "docs", "getting-started", "installation.mdx"),
        path.join(tempDir, "docs", "support", "support-policy.mdx"),
        path.join(tempDir, "src", "documentation", "installation-and-quickstart.md"),
        path.join(tempDir, "src", "documentation", "support-policy.md"),
      ]) {
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(
          target,
          "## Prerequisites\n\n<!-- supported-prerequisites:start -->\nold\n<!-- supported-prerequisites:end -->\n",
          "utf8",
        );
      }

      const changedFiles = syncVersionFiles({ cwd: tempDir, version: "1.0.0" });

      expect(changedFiles).toEqual(
        expect.arrayContaining([
          path.join(tempDir, "package.json"),
          path.join(tempDir, "docs", "index.mdx"),
          path.join(tempDir, "src", "documentation", "package-docs-index.md"),
        ]),
      );

      const updatedPackageJson = JSON.parse(
        fs.readFileSync(path.join(tempDir, "package.json"), "utf8"),
      ) as { version: string; readme: string };
      expect(updatedPackageJson.version).toBe("1.0.0");
      expect(updatedPackageJson.readme).toBe("Factories seeds integration in 1.0.0");

      const updatedDocs = fs.readFileSync(path.join(tempDir, "docs", "index.mdx"), "utf8");
      const updatedSourceDocs = fs.readFileSync(
        path.join(tempDir, "src", "documentation", "package-docs-index.md"),
        "utf8",
      );

      expect(updatedDocs).toContain("Version: `1.0.0`");
      expect(updatedSourceDocs).toContain("Version: `1.0.0`");
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

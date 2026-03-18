import fs from "fs";
import os from "os";
import path from "path";

describe("supported versions docs sync", () => {
  const rootDir = process.cwd();
  const syncScriptPath = path.resolve(rootDir, "scripts/sync-supported-versions.cjs");

  test("sync helper derives the support matrix from package.json and ci workflow", () => {
    const { buildSupportMatrix } = require(syncScriptPath) as {
      buildSupportMatrix: (cwd: string) => Record<string, string>;
    };

    const matrix = buildSupportMatrix(rootDir);

    expect(matrix.node).toBe("20.x");
    expect(matrix.mysql).toBe("8.0");
    expect(matrix.postgres).toBe("16");
    expect(matrix.mongo).toBe("7");
    expect(matrix.typescript).toBe("^5.9.3");
    expect(matrix.sqlite).toContain("better-sqlite3 12.2.0");
    expect(matrix.memcached).toContain("1.6+");
    expect(matrix.memcached).toContain("^2.2.2");
  });

  test("sync helper rewrites prerequisite markers in docs files", () => {
    const { syncSupportedVersions } = require(syncScriptPath) as {
      syncSupportedVersions: (options: { cwd: string }) => {
        changedFiles: string[];
        matrix: Record<string, string>;
      };
    };

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-supported-versions-"));

    try {
      fs.mkdirSync(path.join(tempDir, ".github", "workflows"), { recursive: true });
      fs.mkdirSync(path.join(tempDir, "docs", "getting-started"), { recursive: true });
      fs.mkdirSync(path.join(tempDir, "docs", "support"), { recursive: true });
      fs.mkdirSync(path.join(tempDir, "src", "documentation"), { recursive: true });

      fs.writeFileSync(
        path.join(tempDir, "package.json"),
        JSON.stringify(
          {
            name: "eloquent-orm.js",
            version: "1.0.0-rc.1",
            engines: { node: "22.x" },
            docsSupportMatrix: { memcachedServer: "1.6.22" },
            dependencies: {
              "better-sqlite3": "13.0.0",
              memcached: "^3.0.0",
            },
            devDependencies: {
              typescript: "^6.0.0",
            },
          },
          null,
          2,
        ),
        "utf8",
      );

      fs.writeFileSync(
        path.join(tempDir, ".github", "workflows", "ci.yml"),
        [
          "jobs:",
          "  quality:",
          "    services:",
          "      mysql:",
          "        image: mysql:8.4",
          "      postgres:",
          "        image: postgres:17",
          "      mongo:",
          "        image: mongo:8",
        ].join("\n"),
        "utf8",
      );

      const targets = [
        path.join(tempDir, "README.md"),
        path.join(tempDir, "docs", "getting-started", "installation.mdx"),
        path.join(tempDir, "docs", "support", "support-policy.mdx"),
        path.join(tempDir, "src", "documentation", "installation-and-quickstart.md"),
        path.join(tempDir, "src", "documentation", "support-policy.md"),
      ];

      for (const target of targets) {
        const isMdx = target.endsWith(".mdx");
        const markerBlock = [
          "## Prerequisites",
          "",
          isMdx
            ? "{/* supported-prerequisites:start */}"
            : "<!-- supported-prerequisites:start -->",
          "old",
          isMdx
            ? "{/* supported-prerequisites:end */}"
            : "<!-- supported-prerequisites:end -->",
          "",
        ].join("\n");
        fs.writeFileSync(target, markerBlock, "utf8");
      }

      const { changedFiles } = syncSupportedVersions({ cwd: tempDir });

      expect(changedFiles).toHaveLength(targets.length);

      const updatedReadme = fs.readFileSync(path.join(tempDir, "README.md"), "utf8");
      expect(updatedReadme).toContain("| Node.js | `22.x` |");
      expect(updatedReadme).toContain("| MySQL | `8.4` |");
      expect(updatedReadme).toContain("| PostgreSQL | `17` |");
      expect(updatedReadme).toContain("| MongoDB | `8` |");
      expect(updatedReadme).toContain("| TypeScript | `^6.0.0` |");
      expect(updatedReadme).toContain("better-sqlite3 13.0.0");
      expect(updatedReadme).toContain("1.6.22 server, client package ^3.0.0");
      const updatedInstallation = fs.readFileSync(
        path.join(tempDir, "docs", "getting-started", "installation.mdx"),
        "utf8",
      );
      expect(updatedInstallation).toContain("{/* supported-prerequisites:start */}");
      expect(updatedInstallation).toContain("{/* supported-prerequisites:end */}");
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

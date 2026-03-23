import fs from "fs";
import os from "os";
import path from "path";

describe("package metadata docs sync", () => {
  const rootDir = process.cwd();
  const syncScriptPath = path.resolve(rootDir, "scripts/sync-package-metadata.cjs");

  test("sync helper rewrites package install/import references and version markers from package.json", () => {
    const { syncPackageMetadata } = require(syncScriptPath) as {
      syncPackageMetadata: (options: { cwd: string }) => {
        changedFiles: string[];
        packageName: string;
        version: string;
      };
    };

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-package-meta-"));

    try {
      fs.mkdirSync(path.join(tempDir, "docs", "api"), { recursive: true });
      fs.mkdirSync(path.join(tempDir, "docs", "getting-started"), { recursive: true });
      fs.mkdirSync(path.join(tempDir, "src", "documentation"), { recursive: true });

      fs.writeFileSync(
        path.join(tempDir, "package.json"),
        JSON.stringify(
          {
            name: "@alpha.consultings/eloquent-orm.js",
            version: "1.2.3",
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
          "Package: `eloquent-orm.js`",
          "",
          "```bash",
          "npm install eloquent-orm.js",
          "```",
          "",
          'import { registerModels } from "eloquent-orm.js";',
          "",
        ].join("\n"),
        "utf8",
      );

      fs.writeFileSync(
        path.join(tempDir, "docs", "index.mdx"),
        [
          "# Eloquent ORM JS",
          "",
          "Version: `0.9.0-rc.1`",
          "",
          "```bash",
          "npm install eloquent-orm.js express dotenv",
          "```",
          "",
        ].join("\n"),
        "utf8",
      );

      fs.writeFileSync(
        path.join(tempDir, "docs", "api", "reference.mdx"),
        [
          "## Root package: `eloquent-orm.js`",
          "",
          "## Subpath export: `eloquent-orm.js/Model`",
          "",
          'import { Model } from "eloquent-orm.js";',
          'import { SqlModel } from "eloquent-orm.js/Model";',
          "",
        ].join("\n"),
        "utf8",
      );

      fs.writeFileSync(
        path.join(tempDir, "src", "documentation", "api-reference.md"),
        [
          "## Root Package: `eloquent-orm.js`",
          "",
          "## Model Subpath: `eloquent-orm.js/Model`",
          "",
          'import { Model } from "eloquent-orm.js";',
          'import { SqlModel } from "eloquent-orm.js/Model";',
          "",
        ].join("\n"),
        "utf8",
      );

      const result = syncPackageMetadata({ cwd: tempDir });

      expect(result.packageName).toBe("@alpha.consultings/eloquent-orm.js");
      expect(result.version).toBe("1.2.3");
      expect(result.changedFiles).toEqual(
        expect.arrayContaining([
          path.join(tempDir, "README.md"),
          path.join(tempDir, "docs", "index.mdx"),
          path.join(tempDir, "docs", "api", "reference.mdx"),
          path.join(tempDir, "src", "documentation", "api-reference.md"),
        ]),
      );

      const updatedReadme = fs.readFileSync(path.join(tempDir, "README.md"), "utf8");
      expect(updatedReadme).toContain("Package: `@alpha.consultings/eloquent-orm.js`");
      expect(updatedReadme).toContain("npm install @alpha.consultings/eloquent-orm.js");
      expect(updatedReadme).toContain(
        'import { registerModels } from "@alpha.consultings/eloquent-orm.js";',
      );

      const updatedDocsIndex = fs.readFileSync(path.join(tempDir, "docs", "index.mdx"), "utf8");
      expect(updatedDocsIndex).toContain("Version: `1.2.3`");
      expect(updatedDocsIndex).toContain(
        "npm install @alpha.consultings/eloquent-orm.js express dotenv",
      );

      const updatedApiDoc = fs.readFileSync(
        path.join(tempDir, "docs", "api", "reference.mdx"),
        "utf8",
      );
      expect(updatedApiDoc).toContain("## Root package: `@alpha.consultings/eloquent-orm.js`");
      expect(updatedApiDoc).toContain(
        "## Subpath export: `@alpha.consultings/eloquent-orm.js/Model`",
      );

      const updatedSourceDoc = fs.readFileSync(
        path.join(tempDir, "src", "documentation", "api-reference.md"),
        "utf8",
      );
      expect(updatedSourceDoc).toContain(
        "## Root Package: `@alpha.consultings/eloquent-orm.js`",
      );
      expect(updatedSourceDoc).toContain(
        "## Model Subpath: `@alpha.consultings/eloquent-orm.js/Model`",
      );
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

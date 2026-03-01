import fs from "fs";
import os from "os";
import path from "path";

describe("Package surface hardening", () => {
  test("package.json exposes a strict root export and publish whitelist", () => {
    const packageJsonPath = path.resolve(process.cwd(), "package.json");
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf8")) as {
      types?: string;
      exports?: Record<string, unknown>;
      files?: string[];
    };

    expect(pkg.types).toBe("dist/index.d.ts");
    expect(pkg.exports).toEqual({
      ".": {
        types: "./dist/index.d.ts",
        require: "./dist/index.js",
        default: "./dist/index.js",
      },
      "./package.json": "./package.json",
    });
    expect(pkg.files).toEqual(
      expect.arrayContaining(["dist/**/*", "src/cli/templates/**/*", "README.md"])
    );
  });

  test("PathMap resolves package templates when cwd is not the repo root", () => {
    const originalCwd = process.cwd();
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-package-surface-"));

    try {
      process.chdir(tempDir);
      jest.resetModules();

      jest.isolateModules(() => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { PathMap } = require("../cli/utils/PathMap") as {
          PathMap: { template(name: string): string };
        };

        const templatePath = PathMap.template("seed");
        expect(path.basename(templatePath)).toBe("seed.tpl");
        expect(fs.existsSync(templatePath)).toBe(true);
        const template = fs.readFileSync(templatePath, "utf8");
        expect(template).toContain("SeederName");
        expect(template).toContain("FactoryName");
      });
    } finally {
      process.chdir(originalCwd);
      fs.rmSync(tempDir, { recursive: true, force: true });
      jest.resetModules();
    }
  });
});

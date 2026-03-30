import fs from "fs";
import os from "os";
import path from "path";

describe("Package surface hardening", () => {
  test("package.json exposes a strict root export and publish whitelist", () => {
    const packageJsonPath = path.resolve(process.cwd(), "package.json");
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf8")) as {
      bin?: Record<string, string>;
      dependencies?: Record<string, string>;
      types?: string;
      exports?: Record<string, unknown>;
      files?: string[];
    };

    expect(pkg.types).toBe("dist/index.d.ts");
    expect(pkg.bin).toEqual({
      eloquent: "./dist/cli/eloquent.js",
    });
    expect(pkg.exports).toEqual({
      ".": {
        types: "./dist/index.d.ts",
        import: "./esm/index.mjs",
        require: "./dist/index.js",
        default: "./esm/index.mjs",
      },
      "./Factory": {
        types: "./dist/cli/utils/factories/Factory.d.ts",
        import: "./esm/Factory.mjs",
        require: "./dist/cli/utils/factories/Factory.js",
        default: "./esm/Factory.mjs",
      },
      "./Model": {
        types: "./dist/Model.d.ts",
        import: "./esm/Model.mjs",
        require: "./dist/Model.js",
        default: "./esm/Model.mjs",
      },
      "./package.json": "./package.json",
    });
    expect(pkg.files).toEqual(
      expect.arrayContaining(["dist", "esm/**/*", "src/cli/templates/**/*", "README.md", "CHANGELOG.md"])
    );
    expect(pkg.dependencies?.eloquentjs).toBeUndefined();
    expect(pkg.dependencies?.["ts-node"]).toBeDefined();
    expect(pkg.dependencies?.typescript).toBeDefined();
    expect(pkg.files).not.toEqual(expect.arrayContaining(["src/app/**/*", "src/test/**/*", "src/lab_test/**/*"]));
  });

  test("ImportResolver uses package imports outside the package repo", () => {
    const originalCwd = process.cwd();
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-import-resolver-"));

    try {
      process.chdir(tempDir);
      jest.resetModules();

      jest.isolateModules(() => {
        const packageName = (
          JSON.parse(
            fs.readFileSync(path.resolve(originalCwd, "package.json"), "utf8"),
          ) as { name?: string }
        ).name;
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { ImportResolver } = require("../cli/utils/ImportResolver") as {
          ImportResolver: {
            coreImportPath(isTest: boolean): string;
            schemaImportPath(isTest: boolean): string;
          };
        };

        expect(ImportResolver.coreImportPath(true)).toBe(packageName);
        expect(ImportResolver.schemaImportPath(true)).toBe(packageName);
      });
    } finally {
      process.chdir(originalCwd);
      fs.rmSync(tempDir, { recursive: true, force: true });
      jest.resetModules();
    }
  });

  test("root package exports the generator-facing helpers", () => {
    const indexSource = fs.readFileSync(path.resolve(process.cwd(), "src/index.ts"), "utf8");
    const esmIndexSource = fs.readFileSync(path.resolve(process.cwd(), "esm/index.mjs"), "utf8");
    const esmFactorySource = fs.readFileSync(path.resolve(process.cwd(), "esm/Factory.mjs"), "utf8");
    const patchScriptSource = fs.readFileSync(
      path.resolve(process.cwd(), "scripts/patch-dist-cjs-factory-entry.cjs"),
      "utf8",
    );
    expect(indexSource).toContain('export { PivotHelperMixin } from "./core/orm/mixins/PivotHelperMixin";');
    expect(indexSource).toContain('} from "./cli/utils/factories/Factory";');
    expect(esmIndexSource).toContain('import { Factory } from "./Factory.mjs";');
    expect(esmIndexSource).not.toContain("...cjsPackage");
    expect(esmIndexSource).toContain("export default {");
    expect(esmFactorySource).toContain('import { createRequire } from "node:module";');
    expect(esmFactorySource).toContain('cachedFaker = require("@faker-js/faker").faker;');
    expect(esmFactorySource).toContain("get faker()");
    expect(esmFactorySource).toContain("export class Factory");
    expect(patchScriptSource).toContain("patchDistCjsFactoryEntry");
    expect(patchScriptSource).toContain('Object.defineProperty(exports, "Factory"');
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
        expect(template).toContain("factoryImportPath");

        const factoryTemplate = fs.readFileSync(PathMap.template("factory"), "utf8");
        expect(factoryTemplate).toContain("modelImportPath");
      });
    } finally {
      process.chdir(originalCwd);
      fs.rmSync(tempDir, { recursive: true, force: true });
      jest.resetModules();
    }
  });
});

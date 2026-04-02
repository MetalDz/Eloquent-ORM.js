import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";
import { pathToFileURL } from "url";

const spawnProbe = spawnSync(process.execPath, ["-v"], { encoding: "utf8" });
const canSpawn = !spawnProbe.error;
const canRunRuntimeProbe = canSpawn && process.env.CI !== "true";

describe("Package root lazy Factory export", () => {
  test("build patch rewrites the dist CJS entry to lazy-load Factory", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-cjs-entry-patch-"));
    const distDir = path.join(tempDir, "dist");
    const distIndexPath = path.join(distDir, "index.js");

    fs.mkdirSync(distDir, { recursive: true });
      fs.writeFileSync(
        distIndexPath,
        [
          '"use strict";',
          'var Factory_js_1 = require("./cli/utils/factories/Factory.js");',
          'Object.defineProperty(exports, "Factory", { enumerable: true, get: function () { return Factory_js_1.Factory; } });',
          "",
        ].join("\n"),
        "utf8",
    );

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { patchDistCjsFactoryEntry } = require("../../scripts/patch-dist-cjs-factory-entry.cjs") as {
        patchDistCjsFactoryEntry: (options: { cwd: string }) => { changed: boolean; filePath: string };
      };

      const first = patchDistCjsFactoryEntry({ cwd: tempDir });
      const patched = fs.readFileSync(distIndexPath, "utf8");

      expect(first.changed).toBe(true);
      expect(first.filePath).toBe(distIndexPath);
      expect(patched).not.toContain('var Factory_js_1 = require("./cli/utils/factories/Factory.js");');
      expect(patched).toContain(
        'Object.defineProperty(exports, "Factory", { enumerable: true, get: function () { return require("./cli/utils/factories/Factory.js").Factory; } });',
      );

      const second = patchDistCjsFactoryEntry({ cwd: tempDir });
      expect(second.changed).toBe(false);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  const runtimeTest = canRunRuntimeProbe ? test : test.skip;

  runtimeTest("root ESM imports for non-factory symbols do not require faker eagerly", async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-esm-root-no-faker-"));
    const probePath = path.join(tempDir, "probe.mjs");

    try {
      fs.writeFileSync(
        probePath,
        [
          'import Module from "node:module";',
          'import path from "node:path";',
          'import { pathToFileURL } from "node:url";',
          "",
          "const originalRequire = Module.prototype.require;",
          "Module.prototype.require = function patchedRequire(request, ...args) {",
          '  if (request === "@faker-js/faker") {',
          '    throw new Error("faker-should-not-load");',
          "  }",
          "  return originalRequire.call(this, request, ...args);",
          "};",
          "",
          `const entry = await import(${JSON.stringify(
            `${pathToFileURL(path.resolve(process.cwd(), "esm", "index.mjs")).href}?t=${Date.now()}`
          )});`,
          'console.log("esm-root-ok", typeof entry.Model, typeof entry.column);',
          "",
        ].join("\n"),
        "utf8",
      );

      const result = spawnSync(process.execPath, [probePath], {
        cwd: process.cwd(),
        encoding: "utf8",
      });

      expect(result.error).toBeUndefined();
      expect(result.status).toBe(0);
      expect(`${result.stdout}${result.stderr}`).toContain("esm-root-ok function function");
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

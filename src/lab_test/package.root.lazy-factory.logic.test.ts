import fs from "fs";
import os from "os";
import path from "path";

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
        'var Factory_1 = require("./cli/utils/factories/Factory");',
        'Object.defineProperty(exports, "Factory", { enumerable: true, get: function () { return Factory_1.Factory; } });',
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
      expect(patched).not.toContain('var Factory_1 = require("./cli/utils/factories/Factory");');
      expect(patched).toContain(
        'Object.defineProperty(exports, "Factory", { enumerable: true, get: function () { return require("./cli/utils/factories/Factory").Factory; } });',
      );

      const second = patchDistCjsFactoryEntry({ cwd: tempDir });
      expect(second.changed).toBe(false);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

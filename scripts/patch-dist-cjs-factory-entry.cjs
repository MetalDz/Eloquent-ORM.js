const fs = require("fs");
const path = require("path");

const eagerFactoryExportPattern =
  /var Factory_1 = require\("\.\/cli\/utils\/factories\/Factory"\);\r?\nObject\.defineProperty\(exports, "Factory", \{ enumerable: true, get: function \(\) \{ return Factory_1\.Factory; \} \}\);/;

const lazyFactoryExport =
  'Object.defineProperty(exports, "Factory", { enumerable: true, get: function () { return require("./cli/utils/factories/Factory").Factory; } });';

function patchDistCjsFactoryEntry(options = {}) {
  const cwd = options.cwd || process.cwd();
  const distIndexPath = path.resolve(cwd, "dist", "index.js");

  if (!fs.existsSync(distIndexPath)) {
    throw new Error(`Cannot patch missing dist entry: ${distIndexPath}`);
  }

  const original = fs.readFileSync(distIndexPath, "utf8");
  if (original.includes(lazyFactoryExport)) {
    return {
      changed: false,
      filePath: distIndexPath,
    };
  }

  if (!eagerFactoryExportPattern.test(original)) {
    throw new Error(
      `Could not find the eager Factory export block in ${distIndexPath}`,
    );
  }

  const patched = original.replace(eagerFactoryExportPattern, lazyFactoryExport);
  fs.writeFileSync(distIndexPath, patched, "utf8");

  return {
    changed: true,
    filePath: distIndexPath,
  };
}

if (require.main === module) {
  const result = patchDistCjsFactoryEntry({ cwd: process.cwd() });
  const action = result.changed ? "Patched" : "Already patched";
  console.log(`${action}: ${path.relative(process.cwd(), result.filePath)}`);
}

module.exports = {
  patchDistCjsFactoryEntry,
};

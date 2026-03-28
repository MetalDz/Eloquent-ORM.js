const fs = require("fs");
const path = require("path");
const { syncVersionFiles } = require("./semantic-release-sync-doc-versions.cjs");

const PACKAGE_NAME_BASE = "eloquent-orm.js";
const MODEL_SUBPATH_REGEX = /(?:@[\w.-]+\/)?eloquent-orm\.js\/Model/g;
const ROOT_PACKAGE_REGEX = /(?:@[\w.-]+\/)?eloquent-orm\.js\b/g;

function walkFiles(rootDir, extensions, output = []) {
  if (!fs.existsSync(rootDir)) {
    return output;
  }

  for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, extensions, output);
      continue;
    }

    if (extensions.has(path.extname(entry.name))) {
      output.push(fullPath);
    }
  }

  return output;
}

function updatePackageIdentifiers(filePath, packageName) {
  const original = fs.readFileSync(filePath, "utf8");
  const updated = original
    .replace(MODEL_SUBPATH_REGEX, `${packageName}/Model`)
    .replace(ROOT_PACKAGE_REGEX, packageName);

  if (updated === original) {
    return false;
  }

  fs.writeFileSync(filePath, updated, "utf8");
  return true;
}

function syncPackageMetadata({ cwd }) {
  const packageJsonPath = path.join(cwd, "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  const packageName = String(packageJson.name || "").trim();
  const version = String(packageJson.version || "").trim();

  if (!packageName) {
    throw new Error("package.json is missing a package name.");
  }

  if (!version) {
    throw new Error("package.json is missing a version.");
  }

  const changedFiles = new Set(syncVersionFiles({ cwd, version }));
  const targetFiles = [
    path.join(cwd, "README.md"),
    path.join(cwd, "PACKAGE-UPDATE-SUMMARY.md"),
    ...walkFiles(path.join(cwd, "docs"), new Set([".md", ".mdx"])),
    ...walkFiles(path.join(cwd, "src", "documentation"), new Set([".md", ".mdx"])),
  ].filter((filePath) => fs.existsSync(filePath));

  for (const filePath of targetFiles) {
    if (updatePackageIdentifiers(filePath, packageName)) {
      changedFiles.add(filePath);
    }
  }

  return {
    changedFiles: Array.from(changedFiles),
    packageName,
    packageNameBase: PACKAGE_NAME_BASE,
    version,
  };
}

if (require.main === module) {
  const cwd = process.cwd();
  const { changedFiles, packageName, version } = syncPackageMetadata({ cwd });
  console.log(
    `Synced package metadata (${packageName} @ ${version}) into ${changedFiles.length} file(s).`
  );
}

module.exports = {
  syncPackageMetadata,
  updatePackageIdentifiers,
};

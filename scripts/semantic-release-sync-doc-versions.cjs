const fs = require("fs");
const path = require("path");

const VERSION_LINE_REGEX = /Version:\s*`[^`]+`/g;
const SEMVER_REGEX = /\b\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?\b/g;

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

function updateVersionMarkers(filePath, version) {
  const original = fs.readFileSync(filePath, "utf8");
  const updated = original.replace(VERSION_LINE_REGEX, `Version: \`${version}\``);
  if (updated === original) {
    return false;
  }

  fs.writeFileSync(filePath, updated, "utf8");
  return true;
}

function updatePackageJson(packageJsonPath, version) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  let changed = false;

  if (packageJson.version !== version) {
    packageJson.version = version;
    changed = true;
  }

  if (typeof packageJson.readme === "string") {
    const nextReadme = packageJson.readme.replace(SEMVER_REGEX, version);
    if (nextReadme !== packageJson.readme) {
      packageJson.readme = nextReadme;
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`, "utf8");
  }

  return changed;
}

function syncVersionFiles({ cwd, version }) {
  const changedFiles = [];
  const packageJsonPath = path.join(cwd, "package.json");

  if (updatePackageJson(packageJsonPath, version)) {
    changedFiles.push(packageJsonPath);
  }

  const docRoots = [
    path.join(cwd, "docs"),
    path.join(cwd, "src", "documentation"),
  ];

  for (const docRoot of docRoots) {
    for (const filePath of walkFiles(docRoot, new Set([".md", ".mdx"]))) {
      if (updateVersionMarkers(filePath, version)) {
        changedFiles.push(filePath);
      }
    }
  }

  return changedFiles;
}

async function prepare(_pluginConfig, context) {
  const {
    cwd,
    logger,
    nextRelease: { version },
  } = context;

  const changedFiles = syncVersionFiles({ cwd, version });
  logger.log(
    "Synced release version %s into %d file(s).",
    version,
    changedFiles.length
  );
}

module.exports = {
  prepare,
  syncVersionFiles,
};

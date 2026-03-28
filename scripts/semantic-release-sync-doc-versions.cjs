const fs = require("fs");
const path = require("path");
const { syncSupportedVersions } = require("./sync-supported-versions.cjs");

const VERSION_LINE_REGEX = /Version:\s*`[^`]+`/g;
const SEMVER_REGEX = /\b\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?\b/g;
const CURRENT_PACKAGE_VERSION_REGEX = /Current package version:\s*`[^`]+`/g;
const RELEASE_HISTORY_TITLE_REGEX = /title:\s*Release History \/ v[^\r\n]+ \/ Latest Release Notes/g;
const RELEASE_HISTORY_HEADING_REGEX = /^# Release History \/ v[^\r\n]+ \/ Latest Release Notes$/gm;
const QUICK_INFO_SOURCE_FILE = "PACKAGE-UPDATE-SUMMARY.md";
const QUICK_INFO_TARGET_FILE = "README.md";
const LATEST_UPDATE_START = "<!-- latest-package-update:start -->";
const LATEST_UPDATE_END = "<!-- latest-package-update:end -->";
const RELEASE_LINEUP_START = "<!-- release-lineup:start -->";
const RELEASE_LINEUP_END = "<!-- release-lineup:end -->";
const QUICK_INFO_START = "<!-- package-quick-info:start -->";
const QUICK_INFO_END = "<!-- package-quick-info:end -->";

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
  const updated = original
    .replace(VERSION_LINE_REGEX, `Version: \`${version}\``)
    .replace(CURRENT_PACKAGE_VERSION_REGEX, `Current package version: \`${version}\``)
    .replace(
      RELEASE_HISTORY_TITLE_REGEX,
      `title: Release History / v${version} / Latest Release Notes`,
    )
    .replace(
      RELEASE_HISTORY_HEADING_REGEX,
      `# Release History / v${version} / Latest Release Notes`,
    );
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

function extractMarkedBlock(content, startMarker, endMarker) {
  const startIndex = content.indexOf(startMarker);
  const endIndex = content.indexOf(endMarker);

  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    return null;
  }

  return content.slice(startIndex + startMarker.length, endIndex).trim();
}

function replaceMarkedBlock(content, startMarker, endMarker, replacementBlock) {
  const startIndex = content.indexOf(startMarker);
  const endIndex = content.indexOf(endMarker);

  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    return content;
  }

  const before = content.slice(0, startIndex);
  const after = content.slice(endIndex + endMarker.length);
  return `${before}${replacementBlock}${after}`;
}

function normalizeLatestUpdate(content) {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^-+\s*/, ""))
    .join(" ");
}

function normalizeDocsUrl(homepage) {
  const trimmed = String(homepage || "https://alphaconsultings.mintlify.app/").trim();
  return trimmed.replace(/\/+$/, "");
}

function extractPublishedReleaseVersions(changelogContent) {
  return Array.from(
    changelogContent.matchAll(
      /^##\s+\[(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)\]\([^)]+\)\s+\([^)]+\)|^#\s+(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)\s+\([^)]+\)/gm,
    ),
  )
    .map((match) => match[1] || match[2])
    .filter(Boolean);
}

function getReleaseLineup(cwd, version) {
  const changelogPath = path.join(cwd, "CHANGELOG.md");
  if (!fs.existsSync(changelogPath)) {
    return {
      latestRelease: `v${version} latest`,
      oldRelease: null,
    };
  }

  const changelogContent = fs.readFileSync(changelogPath, "utf8");
  const releaseVersions = extractPublishedReleaseVersions(changelogContent);
  const latestVersion = releaseVersions[0] || version;
  const oldVersion = releaseVersions.find((entry) => entry !== latestVersion) || null;

  return {
    latestRelease: `v${latestVersion} latest`,
    oldRelease: oldVersion ? `v${oldVersion}` : null,
  };
}

function renderReleaseLineupBlock({ latestRelease, oldRelease }) {
  return [
    RELEASE_LINEUP_START,
    "Latest Release:",
    `- \`${latestRelease}\``,
    "",
    "Old Release:",
    oldRelease ? `- \`${oldRelease}\`` : "- none yet",
    RELEASE_LINEUP_END,
  ].join("\n");
}

function renderQuickInfoBlock({ packageName, version, docsUrl, latestUpdate, latestRelease, oldRelease }) {
  return [
    QUICK_INFO_START,
    "Quick info:",
    `- Package: \`${packageName}\``,
    `- Version: \`${version}\``,
    `- Latest release: \`${latestRelease}\``,
    `- Old release: ${oldRelease ? `\`${oldRelease}\`` : "none yet"}`,
    `- Latest update: ${latestUpdate}`,
    `- Official docs: ${docsUrl}`,
    `- Quick start: ${docsUrl}/getting-started/quick-start`,
    `- Release history: ${docsUrl}/release/history`,
    "- Latest release notes: [PACKAGE-UPDATE-SUMMARY.md](./PACKAGE-UPDATE-SUMMARY.md)",
    QUICK_INFO_END,
  ].join("\n");
}

function syncQuickInfoFiles(cwd, packageJson) {
  const sourcePath = path.join(cwd, QUICK_INFO_SOURCE_FILE);
  const targetPath = path.join(cwd, QUICK_INFO_TARGET_FILE);

  if (!fs.existsSync(sourcePath) || !fs.existsSync(targetPath)) {
    return [];
  }

  const sourceOriginal = fs.readFileSync(sourcePath, "utf8");
  const latestUpdateBlock = extractMarkedBlock(
    sourceOriginal,
    LATEST_UPDATE_START,
    LATEST_UPDATE_END,
  );

  if (!latestUpdateBlock) {
    return [];
  }

  const latestUpdate = normalizeLatestUpdate(latestUpdateBlock);
  const docsUrl = normalizeDocsUrl(packageJson.homepage);
  const { latestRelease, oldRelease } = getReleaseLineup(cwd, packageJson.version || "0.0.0");
  const renderedReleaseLineup = renderReleaseLineupBlock({
    latestRelease,
    oldRelease,
  });
  const renderedQuickInfo = renderQuickInfoBlock({
    packageName: packageJson.name || "@alpha.consultings/eloquent-orm.js",
    version: packageJson.version || "0.0.0",
    docsUrl,
    latestUpdate,
    latestRelease,
    oldRelease,
  });

  const changedFiles = [];
  const sourceWithReleaseLineup = replaceMarkedBlock(
    sourceOriginal,
    RELEASE_LINEUP_START,
    RELEASE_LINEUP_END,
    renderedReleaseLineup,
  );
  const sourceUpdated = replaceMarkedBlock(
    sourceWithReleaseLineup,
    QUICK_INFO_START,
    QUICK_INFO_END,
    renderedQuickInfo,
  );
  if (sourceUpdated !== sourceOriginal) {
    fs.writeFileSync(sourcePath, sourceUpdated, "utf8");
    changedFiles.push(sourcePath);
  }

  const targetOriginal = fs.readFileSync(targetPath, "utf8");
  const targetUpdated = replaceMarkedBlock(
    targetOriginal,
    QUICK_INFO_START,
    QUICK_INFO_END,
    renderedQuickInfo,
  );
  if (targetUpdated !== targetOriginal) {
    fs.writeFileSync(targetPath, targetUpdated, "utf8");
    changedFiles.push(targetPath);
  }

  return changedFiles;
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

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  changedFiles.push(...syncQuickInfoFiles(cwd, packageJson));

  return changedFiles;
}

async function prepare(_pluginConfig, context) {
  const {
    cwd,
    logger,
    nextRelease: { version },
  } = context;

  const changedFiles = syncVersionFiles({ cwd, version });
  const supportSync = syncSupportedVersions({ cwd });
  logger.log(
    "Synced release version %s into %d file(s) and refreshed supported-version docs in %d file(s).",
    version,
    changedFiles.length,
    supportSync.changedFiles.length
  );
}

module.exports = {
  prepare,
  syncVersionFiles,
  syncQuickInfoFiles,
};

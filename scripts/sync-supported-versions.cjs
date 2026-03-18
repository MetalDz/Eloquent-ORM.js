const fs = require("fs");
const path = require("path");

const MARKER_PAIRS = [
  {
    start: "<!-- supported-prerequisites:start -->",
    end: "<!-- supported-prerequisites:end -->",
  },
  {
    start: "{/* supported-prerequisites:start */}",
    end: "{/* supported-prerequisites:end */}",
  },
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function extractFirst(text, regex, label) {
  const match = text.match(regex);
  if (!match || !match[1]) {
    throw new Error(`Unable to resolve ${label} from source content.`);
  }

  return match[1].trim();
}

function buildSupportMatrix(cwd) {
  const packageJson = readJson(path.join(cwd, "package.json"));
  const ciWorkflow = readText(path.join(cwd, ".github", "workflows", "ci.yml"));

  const node = packageJson.engines?.node || extractFirst(ciWorkflow, /node-version:\s*([0-9.x*^<>=~ -]+)/, "Node.js version");
  const mysql = extractFirst(ciWorkflow, /image:\s*mysql:([^\s]+)/, "MySQL version");
  const postgres = extractFirst(ciWorkflow, /image:\s*postgres:([^\s]+)/, "PostgreSQL version");
  const mongo = extractFirst(ciWorkflow, /image:\s*mongo:([^\s]+)/, "MongoDB version");
  const typescript = packageJson.devDependencies?.typescript || packageJson.dependencies?.typescript || "not-set";
  const sqliteDriver = packageJson.dependencies?.["better-sqlite3"] || "not-set";
  const memcachedClient = packageJson.dependencies?.memcached || "not-set";
  const memcachedServer = packageJson.docsSupportMatrix?.memcachedServer || "not-set";

  return {
    node,
    typescript,
    mysql,
    postgres,
    mongo,
    sqlite: `SQLite 3.x via better-sqlite3 ${sqliteDriver}`,
    memcached: `${memcachedServer} server, client package ${memcachedClient}`,
  };
}

function renderSupportMatrix(matrix, markers) {
  return [
    markers.start,
    "The following versions are the current supported and CI-tested prerequisites.",
    "",
    "| Component | Supported / tested version |",
    "| --- | --- |",
    `| Node.js | \`${matrix.node}\` |`,
    `| TypeScript | \`${matrix.typescript}\` |`,
    `| MySQL | \`${matrix.mysql}\` |`,
    `| PostgreSQL | \`${matrix.postgres}\` |`,
    `| MongoDB | \`${matrix.mongo}\` |`,
    `| SQLite | \`${matrix.sqlite}\` |`,
    `| Memcached | \`${matrix.memcached}\` |`,
    markers.end,
  ].join("\n");
}

function findMarkerPair(content, filePath) {
  for (const markers of MARKER_PAIRS) {
    const startIndex = content.indexOf(markers.start);
    const endIndex = content.indexOf(markers.end);
    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
      return {
        markers,
        startIndex,
        endIndex,
      };
    }
  }

  throw new Error(`Missing supported-prerequisites markers in ${filePath}`);
}

function updateMarkedBlock(filePath, matrix) {
  const original = readText(filePath);
  const markerMatch = findMarkerPair(original, filePath);
  const replacementBlock = renderSupportMatrix(matrix, markerMatch.markers);

  const updated =
    original.slice(0, markerMatch.startIndex) +
    replacementBlock +
    original.slice(markerMatch.endIndex + markerMatch.markers.end.length);

  if (updated === original) {
    return false;
  }

  fs.writeFileSync(filePath, updated, "utf8");
  return true;
}

function syncSupportedVersions({ cwd }) {
  const matrix = buildSupportMatrix(cwd);
  const targetFiles = [
    path.join(cwd, "README.md"),
    path.join(cwd, "docs", "getting-started", "installation.mdx"),
    path.join(cwd, "docs", "support", "support-policy.mdx"),
    path.join(cwd, "src", "documentation", "installation-and-quickstart.md"),
    path.join(cwd, "src", "documentation", "support-policy.md"),
  ];

  const changedFiles = [];
  for (const filePath of targetFiles) {
    if (updateMarkedBlock(filePath, matrix)) {
      changedFiles.push(filePath);
    }
  }

  return { changedFiles, matrix };
}

if (require.main === module) {
  const cwd = process.cwd();
  const { changedFiles, matrix } = syncSupportedVersions({ cwd });
  console.log(
    `Synced supported prerequisite versions into ${changedFiles.length} file(s).`
  );
  console.log(
    `Node ${matrix.node}, MySQL ${matrix.mysql}, PostgreSQL ${matrix.postgres}, MongoDB ${matrix.mongo}.`
  );
}

module.exports = {
  buildSupportMatrix,
  renderSupportMatrix,
  syncSupportedVersions,
};

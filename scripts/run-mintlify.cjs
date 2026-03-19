const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const command = process.argv[2];

if (!command) {
  throw new Error("Missing Mintlify command. Expected one of: dev, validate, broken-links.");
}

const repoRoot = process.cwd();
const docsDir = path.join(repoRoot, "docs");
const mintHome = path.join(repoRoot, ".mintlify-home");
const mintConfigPath = path.join(docsDir, "mint.json");

if (!fs.existsSync(mintConfigPath)) {
  throw new Error("docs/mint.json not found. Run docs:prepare-config first.");
}

fs.mkdirSync(mintHome, { recursive: true });

const env = {
  ...process.env,
  HOME: mintHome,
  USERPROFILE: mintHome,
  APPDATA: path.join(mintHome, "AppData", "Roaming"),
  LOCALAPPDATA: path.join(mintHome, "AppData", "Local"),
};

fs.mkdirSync(env.APPDATA, { recursive: true });
fs.mkdirSync(env.LOCALAPPDATA, { recursive: true });

const mintlifyBin = path.join(
  repoRoot,
  "node_modules",
  "@mintlify",
  "cli",
  "bin",
  "index.js",
);

const result =
  process.platform === "win32"
    ? spawnSync(process.execPath, [mintlifyBin, command], {
        cwd: docsDir,
        stdio: "inherit",
        env,
        shell: false,
      })
    : spawnSync(process.execPath, [mintlifyBin, command], {
        cwd: docsDir,
        stdio: "inherit",
        env,
        shell: false,
      });

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

if (typeof result.status === "number") {
  process.exit(result.status);
}

process.exit(1);

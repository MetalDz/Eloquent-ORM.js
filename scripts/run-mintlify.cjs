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
const rootDocsJsonPath = path.join(repoRoot, "docs.json");

if (!fs.existsSync(mintConfigPath)) {
  throw new Error("docs/mint.json not found. Run docs:sync-config first.");
}

if (!fs.existsSync(rootDocsJsonPath)) {
  throw new Error("docs.json not found at repository root. Run docs:sync-config first.");
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

function formatZodIssues(label, issues) {
  const lines = issues.map((issue) => {
    const pathLabel = issue.path && issue.path.length > 0 ? `#.${issue.path.join(".")}` : "#";
    return `${pathLabel}: ${issue.message}`;
  });

  return `🚨 Invalid ${label}:\n${lines.join("\n")}`;
}

async function validateDocsConfig() {
  const { docsConfigSchema } = await import(
    "@mintlify/validation/dist/mint-config/schemas/v2/index.js"
  );
  const { upgradeToDocsConfig } = await import(
    "@mintlify/validation/dist/mint-config/upgrades/upgradeToDocsConfig.js"
  );

  const rootDocsJson = JSON.parse(fs.readFileSync(rootDocsJsonPath, "utf8"));
  const docsMintJson = JSON.parse(fs.readFileSync(mintConfigPath, "utf8"));

  const rootResult = docsConfigSchema.safeParse(rootDocsJson);
  if (!rootResult.success) {
    throw new Error(formatZodIssues("docs.json", rootResult.error.issues));
  }

  const upgradedDocsConfig = upgradeToDocsConfig(docsMintJson, {
    shouldUpgradeTheme: true,
  });
  const mintResult = docsConfigSchema.safeParse(upgradedDocsConfig);
  if (!mintResult.success) {
    throw new Error(formatZodIssues("mint.json", mintResult.error.issues));
  }

  console.log("success docs config validated");
}

async function main() {
  if (command === "validate") {
    try {
      await validateDocsConfig();
      process.exit(0);
    } catch (error) {
      console.error("error build validation failed");
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

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
}

void main();

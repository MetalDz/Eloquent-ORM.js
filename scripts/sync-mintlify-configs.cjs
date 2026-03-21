const fs = require("fs");
const path = require("path");

const repoRoot = process.cwd();
const canonicalPath = path.join(repoRoot, "mint.json");
const rootDocsJsonPath = path.join(repoRoot, "docs.json");
const docsDir = path.join(repoRoot, "docs");
const docsMintJsonPath = path.join(docsDir, "mint.json");

if (!fs.existsSync(canonicalPath)) {
  throw new Error("mint.json not found at repository root.");
}

if (!fs.existsSync(docsDir)) {
  throw new Error("docs directory not found.");
}

const canonicalRaw = fs.readFileSync(canonicalPath, "utf8");
const canonical = JSON.parse(canonicalRaw);

function mapMintThemeToDocsTheme(theme) {
  switch (theme) {
    case "mint":
    case "maple":
    case "palm":
    case "willow":
    case "linden":
    case "almond":
    case "aspen":
    case "luma":
    case "sequoia":
      return theme;
    case "venus":
      return "palm";
    case "quill":
      return "willow";
    case "prism":
      return "mint";
    default:
      return "mint";
  }
}

const docsJson = {
  $schema: "https://mintlify.com/docs.json",
  theme: mapMintThemeToDocsTheme(canonical.theme),
  name: canonical.name,
  colors: canonical.colors,
  favicon: canonical.favicon,
  navigation: {
    groups: canonical.navigation,
  },
  footer: canonical.footer,
};

fs.writeFileSync(rootDocsJsonPath, `${JSON.stringify(docsJson, null, 2)}\n`, "utf8");
fs.writeFileSync(docsMintJsonPath, `${JSON.stringify(canonical, null, 2)}\n`, "utf8");

console.log("Synced docs.json and docs/mint.json from root mint.json");

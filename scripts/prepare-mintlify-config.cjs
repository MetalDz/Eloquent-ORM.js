const fs = require("fs");
const path = require("path");

const repoRoot = process.cwd();
const sourcePath = path.join(repoRoot, "mint.json");
const docsDir = path.join(repoRoot, "docs");
const targetPath = path.join(docsDir, "mint.json");

if (!fs.existsSync(sourcePath)) {
  throw new Error("mint.json not found at repository root.");
}

if (!fs.existsSync(docsDir)) {
  throw new Error("docs directory not found.");
}

const source = fs.readFileSync(sourcePath, "utf8");
fs.writeFileSync(targetPath, source, "utf8");

console.log("Prepared docs/mint.json from root mint.json");

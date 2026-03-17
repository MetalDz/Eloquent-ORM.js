/* eslint-disable no-console */
const fs = require("node:fs");
const path = require("node:path");

const coveragePath = path.join(process.cwd(), "coverage", "coverage-final.json");

if (!fs.existsSync(coveragePath)) {
  console.error("[coverage-misses] Missing coverage/coverage-final.json");
  console.error("Run `npm run test:coverage` first.");
  process.exit(1);
}

const raw = fs.readFileSync(coveragePath, "utf8");
const coverage = JSON.parse(raw);

const misses = [];

for (const [filePath, fileData] of Object.entries(coverage)) {
  if (filePath === "total") continue;

  const sourcePath = path.relative(process.cwd(), filePath);

  for (const [statementId, count] of Object.entries(fileData.s || {})) {
    if (count === 0) {
      const loc = fileData.statementMap?.[statementId]?.start || {};
      misses.push({
        file: sourcePath,
        type: "statement",
        id: statementId,
        line: loc.line,
        column: loc.column,
      });
    }
  }

  for (const [branchId, branchCounts] of Object.entries(fileData.b || {})) {
    if (!Array.isArray(branchCounts)) continue;
    const locations = fileData.branchMap?.[branchId]?.locations || [];
    for (let pathIndex = 0; pathIndex < branchCounts.length; pathIndex += 1) {
      if (branchCounts[pathIndex] === 0) {
        const loc = locations[pathIndex]?.start || {};
        misses.push({
          file: sourcePath,
          type: "branch",
          id: `${branchId}[${pathIndex}]`,
          line: loc.line,
          column: loc.column,
        });
      }
    }
  }
}

if (misses.length === 0) {
  console.log("[coverage-misses] No uncovered statements or branches found.");
  process.exit(0);
}

for (const miss of misses) {
  const location = `${miss.file}:${miss.line}:${miss.column}`;
  console.log(`${location} ${miss.type} ${miss.id}`);
}

process.exit(1);

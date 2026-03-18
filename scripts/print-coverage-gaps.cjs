const fs = require("fs");
const path = require("path");

const coverageJsonPath = path.resolve(process.cwd(), "coverage", "coverage-final.json");

if (!fs.existsSync(coverageJsonPath)) {
  console.error("coverage/coverage-final.json not found");
  process.exit(1);
}

const coverage = JSON.parse(fs.readFileSync(coverageJsonPath, "utf8"));
let foundGap = false;

for (const [filePath, entry] of Object.entries(coverage)) {
  const missedStatements = Object.entries(entry.s || {})
    .filter(([, hits]) => hits === 0)
    .map(([id]) => ({ id, loc: entry.statementMap[id] }));

  const missedFunctions = Object.entries(entry.f || {})
    .filter(([, hits]) => hits === 0)
    .map(([id]) => ({
      id,
      name: entry.fnMap[id]?.name ?? "anonymous",
      loc: entry.fnMap[id]?.loc || entry.fnMap[id]?.decl,
    }));

  const missedLines = Object.entries(entry.l || {})
    .filter(([, hits]) => hits === 0)
    .map(([line]) => Number(line));

  const missedBranches = [];
  for (const [id, hits] of Object.entries(entry.b || {})) {
    hits.forEach((count, branchIndex) => {
      if (count === 0) {
        missedBranches.push({
          id,
          branchIndex,
          type: entry.branchMap[id]?.type ?? "unknown",
          loc: entry.branchMap[id]?.locations?.[branchIndex] || entry.branchMap[id]?.loc,
        });
      }
    });
  }

  if (
    missedStatements.length === 0 &&
    missedFunctions.length === 0 &&
    missedLines.length === 0 &&
    missedBranches.length === 0
  ) {
    continue;
  }

  foundGap = true;
  console.log(`\nFILE: ${filePath}`);

  if (missedLines.length > 0) {
    console.log(`  missed lines: ${missedLines.join(", ")}`);
  }

  if (missedStatements.length > 0) {
    console.log("  missed statements:");
    for (const statement of missedStatements) {
      console.log(
        `    statement #${statement.id} at ${statement.loc.start.line}:${statement.loc.start.column + 1}`
      );
    }
  }

  if (missedFunctions.length > 0) {
    console.log("  missed functions:");
    for (const fn of missedFunctions) {
      console.log(
        `    function #${fn.id} (${fn.name}) at ${fn.loc.start.line}:${fn.loc.start.column + 1}`
      );
    }
  }

  if (missedBranches.length > 0) {
    console.log("  missed branches:");
    for (const branch of missedBranches) {
      console.log(
        `    branch #${branch.id}.${branch.branchIndex} (${branch.type}) at ${branch.loc.start.line}:${branch.loc.start.column + 1}`
      );
    }
  }
}

if (!foundGap) {
  console.log("No uncovered statement/function/line/branch found.");
}

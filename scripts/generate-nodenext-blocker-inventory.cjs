const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const SNAPSHOT_DATE = "2026-04-10";
const SOURCE_EXTENSIONS = new Set([".ts"]);
const TEMPLATE_EXTENSIONS = new Set([".tpl", ".ts", ".md", ".mdx"]);
const IGNORED_SOURCE_DIRECTORIES = new Set([
  "src/app",
  "src/test",
  "dist",
  "coverage",
  "node_modules",
]);
const DIRECT_IMPORT_EXPORT_PATTERN = /\bfrom\s+["'](\.{1,2}\/[^"']+)["']/g;
const DIRECT_DYNAMIC_IMPORT_PATTERN = /\bimport\(\s*["'](\.{1,2}\/[^"']+)["']\s*\)/g;
const DIRECT_REQUIRE_PATTERN = /require\(\s*["'](\.{1,2}\/[^"']+)["']\s*\)/g;
const LITERAL_IMPORT_PATTERN =
  /["'`](?:from\s+["'](\.{1,2}\/[^"'`]+)["']|require\(\s*["'](\.{1,2}\/[^"'`]+)["']\s*\))/g;
const RUNTIME_SAFE_SPECIFIER_PATTERN = /\.(?:js|mjs|cjs|json)$/i;

function shouldIgnoreDirectory(cwd, directoryPath) {
  const relativePath = path.relative(cwd, directoryPath).replace(/\\/g, "/");
  return IGNORED_SOURCE_DIRECTORIES.has(relativePath);
}

function walkFiles(cwd, rootDir, extensions, output = []) {
  if (!fs.existsSync(rootDir)) {
    return output;
  }

  for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      if (shouldIgnoreDirectory(cwd, fullPath)) {
        continue;
      }
      walkFiles(cwd, fullPath, extensions, output);
      continue;
    }

    if (!extensions || extensions.has(path.extname(entry.name))) {
      output.push(fullPath);
    }
  }

  return output;
}
function toRelativePath(cwd, filePath) {
  return path.relative(cwd, filePath).replace(/\\/g, "/");
}

function readLines(filePath) {
  return fs.readFileSync(filePath, "utf8").split(/\r?\n/);
}

function isRelativeSpecifier(specifier) {
  return typeof specifier === "string" && (specifier.startsWith("./") || specifier.startsWith("../"));
}

function classifyImportSpecifierKind(specifier, isDynamic = false) {
  if (RUNTIME_SAFE_SPECIFIER_PATTERN.test(specifier)) {
    return isDynamic
      ? "runtime-qualified dynamic local specifiers"
      : "runtime-qualified import/export local specifiers";
  }

  return isDynamic
    ? "extensionless dynamic local specifiers"
    : "extensionless import/export local specifiers";
}

function findLineMatches(lines, matchers) {
  const records = [];

  lines.forEach((line, index) => {
    for (const matcher of matchers) {
      matcher.pattern.lastIndex = 0;
      let match = matcher.pattern.exec(line);
      while (match) {
        records.push({
          kind: matcher.kind,
          lineNumber: index + 1,
          line: line.trim(),
          specifier: match[1] || match[2] || "",
        });
        match = matcher.pattern.exec(line);
      }
    }
  });

  return records;
}

function findTsSourceMatches(cwd, filePath, classifyArea) {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);
  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const relativePath = toRelativePath(cwd, filePath);
  const area = classifyArea(relativePath);
  const records = [];

  function pushRecord(kind, node, specifier) {
    const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
    records.push({
      kind,
      lineNumber: position.line + 1,
      line: (lines[position.line] || "").trim(),
      specifier,
      file: relativePath,
      area,
    });
  }

  function readStringLiteralText(node) {
    if (!node || !ts.isStringLiteralLike(node)) {
      return "";
    }

    return node.text;
  }

  function visit(node) {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) {
      const specifier = readStringLiteralText(node.moduleSpecifier);
      if (isRelativeSpecifier(specifier)) {
        pushRecord(classifyImportSpecifierKind(specifier, false), node, specifier);
      }
    }

    if (ts.isCallExpression(node)) {
      if (
        node.expression.kind === ts.SyntaxKind.ImportKeyword &&
        node.arguments.length === 1 &&
        ts.isStringLiteralLike(node.arguments[0])
      ) {
        const specifier = node.arguments[0].text;
        if (isRelativeSpecifier(specifier)) {
          pushRecord(classifyImportSpecifierKind(specifier, true), node, specifier);
        }
      }

      if (
        ts.isIdentifier(node.expression) &&
        node.expression.text === "require" &&
        node.arguments.length === 1 &&
        ts.isStringLiteralLike(node.arguments[0])
      ) {
        const specifier = node.arguments[0].text;
        if (isRelativeSpecifier(specifier)) {
          pushRecord("local require() calls", node, specifier);
        }
      }
    }

    if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) {
      const literal = node.argument.literal;
      if (ts.isStringLiteralLike(literal)) {
        const specifier = literal.text;
        if (isRelativeSpecifier(specifier)) {
          pushRecord(classifyImportSpecifierKind(specifier, true), node, specifier);
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return records;
}

function classifySourceArea(relativePath) {
  if (relativePath.startsWith("src/lab_test/")) return "src/lab_test";
  if (relativePath.startsWith("src/cli/")) return "src/cli";
  if (relativePath.startsWith("src/core/")) return "src/core";
  if (relativePath.startsWith("src/app/")) return "src/app";
  if (relativePath.startsWith("src/test/")) return "src/test";
  if (relativePath.startsWith("bin/")) return "bin";
  return "other";
}

function classifyCliArea(relativePath) {
  if (relativePath.startsWith("src/cli/commands/")) return "src/cli/commands";
  if (relativePath.startsWith("src/cli/utils/")) return "src/cli/utils";
  if (relativePath.startsWith("src/cli/templates/")) return "src/cli/templates";
  if (relativePath.startsWith("src/cli/")) return "src/cli/other";
  return "other";
}

function scanFiles(cwd, filePaths, matchers, classifyArea) {
  const files = [];
  const records = [];

  for (const filePath of filePaths) {
    const relativePath = toRelativePath(cwd, filePath);
    const matches = findLineMatches(readLines(filePath), matchers).map((record) => ({
      ...record,
      file: relativePath,
      area: classifyArea(relativePath),
    }));

    if (matches.length === 0) {
      continue;
    }

    files.push({
      file: relativePath,
      area: classifyArea(relativePath),
      matches: matches.length,
      kinds: summarizeKinds(matches),
      firstLine: matches[0].lineNumber,
    });
    records.push(...matches);
  }

  return {
    totalMatches: records.length,
    uniqueFiles: files.length,
    byArea: summarizeByArea(files),
    byKind: summarizeByKind(records),
    topFiles: files
      .slice()
      .sort((left, right) => right.matches - left.matches || left.file.localeCompare(right.file))
      .slice(0, 15),
    records,
  };
}

function scanTsSourceFiles(cwd, filePaths, classifyArea) {
  const files = [];
  const records = [];

  for (const filePath of filePaths) {
    const matches = findTsSourceMatches(cwd, filePath, classifyArea);

    if (matches.length === 0) {
      continue;
    }

    files.push({
      file: matches[0].file,
      area: matches[0].area,
      matches: matches.length,
      kinds: summarizeKinds(matches),
      firstLine: matches[0].lineNumber,
    });
    records.push(...matches);
  }

  return {
    totalMatches: records.length,
    uniqueFiles: files.length,
    byArea: summarizeByArea(files),
    byKind: summarizeByKind(records),
    topFiles: files
      .slice()
      .sort((left, right) => right.matches - left.matches || left.file.localeCompare(right.file))
      .slice(0, 15),
    records,
  };
}

function summarizeKinds(records) {
  const counts = {};
  for (const record of records) {
    counts[record.kind] = (counts[record.kind] || 0) + 1;
  }
  return counts;
}

function summarizeByArea(files) {
  const map = new Map();

  for (const file of files) {
    const current = map.get(file.area) || { area: file.area, files: 0, matches: 0 };
    current.files += 1;
    current.matches += file.matches;
    map.set(file.area, current);
  }

  return Array.from(map.values()).sort(
    (left, right) => right.matches - left.matches || left.area.localeCompare(right.area),
  );
}

function summarizeByKind(records) {
  const map = new Map();

  for (const record of records) {
    map.set(record.kind, (map.get(record.kind) || 0) + 1);
  }

  return Array.from(map.entries())
    .map(([kind, matches]) => ({ kind, matches }))
    .sort((left, right) => right.matches - left.matches || left.kind.localeCompare(right.kind));
}

function buildRuntimeLoaderHotspots(cwd) {
  const hotspots = [
    {
      path: "src/cli/utils/typescript/tsRuntime.ts",
      reason: "Consumer TypeScript loader must keep supporting NodeNext-style local `.js` specifiers.",
    },
    {
      path: "src/cli/utils/ImportResolver.ts",
      reason: "Generator import paths must switch to NodeNext-safe emitted specifiers.",
    },
    {
      path: "src/cli/utils/PathMap.ts",
      reason: "Generated artifacts and templates depend on path routing staying coherent during the migration.",
    },
    {
      path: "src/cli/commands/makeModel.ts",
      reason: "Model scaffolding controls emitted local imports for generated models.",
    },
    {
      path: "src/cli/commands/makeFactory.ts",
      reason: "Factory scaffolding emits local model imports and package imports that must stay dual-compatible.",
    },
    {
      path: "src/cli/commands/makeRegistry.ts",
      reason: "Registry generation must keep working for NodeNext source trees and compiled consumers.",
    },
    {
      path: "src/cli/commands/makeScenario.ts",
      reason: "Scenario generation emits a large graph of related files and import strings.",
    },
    {
      path: "src/cli/commands/makeMigration.ts",
      reason: "Migration generation loads TypeScript models directly and must keep honoring NodeNext consumer code.",
    },
  ];

  return hotspots.map((hotspot) => ({
    ...hotspot,
    exists: fs.existsSync(path.join(cwd, hotspot.path)),
  }));
}

function renderMarkdownReport(inventory) {
  const lines = [
    "# NodeNext Blocker Inventory",
    "",
    "Status: GENERATED SNAPSHOT",
    "",
    `Snapshot date: \`${inventory.snapshotDate}\``,
    "",
    "## Scope",
    `- package: \`${inventory.packageName}\``,
    `- source roots scanned: \`${inventory.source.roots.join("`, `")}\``,
    `- template roots scanned: \`${inventory.generatorTemplates.roots.join("`, `")}\``,
    "",
    "## Direct source migration surface",
    `- local relative import/require matches in \`src\` and \`bin\`: \`${inventory.source.totalMatches}\``,
    `- unique TypeScript files affected: \`${inventory.source.uniqueFiles}\``,
    ...inventory.source.byKind.map((entry) => `- ${entry.kind}: \`${entry.matches}\``),
    "",
    "## Direct source hotspot breakdown",
    ...inventory.source.byArea.map(
      (entry) => `- \`${entry.area}\`: \`${entry.files} files / ${entry.matches} matches\``,
    ),
    "",
    "## Generator and template emission blockers",
    `- relative import/require string matches in generator sources and templates: \`${inventory.generatorTemplates.totalMatches}\``,
    `- unique generator/template files affected: \`${inventory.generatorTemplates.uniqueFiles}\``,
    ...inventory.generatorTemplates.byArea.map(
      (entry) => `- \`${entry.area}\`: \`${entry.files} files / ${entry.matches} matches\``,
    ),
    "",
    "## Test assertion blockers",
    `- exact import-string hotspot matches in \`src/lab_test\`: \`${inventory.testAssertions.totalMatches}\``,
    `- unique test files affected: \`${inventory.testAssertions.uniqueFiles}\``,
    ...inventory.testAssertions.topFiles
      .slice(0, 10)
      .map((entry) => `- \`${entry.file}\`: \`${entry.matches} matches\``),
    "",
    "## Runtime loader hotspots",
    ...inventory.runtimeLoaderHotspots.map(
      (entry) => `- \`${entry.path}\` (${entry.exists ? "exists" : "missing"}): ${entry.reason}`,
    ),
    "",
    "## Top direct-source files",
    ...inventory.source.topFiles
      .slice(0, 15)
      .map((entry) => `- \`${entry.file}\`: \`${entry.matches} matches\``),
    "",
    "## What this inventory is for",
    "- separate direct source imports from generator/template emitters",
    "- distinguish already-runtime-qualified `.js`/`.mjs`/`.cjs`/`.json` local specifiers from unresolved extensionless ones",
    "- separate test assertion churn from runtime code churn",
    "- identify the NodeNext migration hotspots before touching `tsconfig` or mass-rewriting imports",
  ];

  return `${lines.join("\n")}\n`;
}

function buildNodeNextBlockerInventory(options = {}) {
  const cwd = options.cwd || process.cwd();
  const packageJson = JSON.parse(fs.readFileSync(path.join(cwd, "package.json"), "utf8"));
  const sourceRoots = ["src", "bin"];
  const generatorTemplateRoots = ["src/cli", "src/cli/templates"];

  const sourceFiles = [
    ...walkFiles(cwd, path.join(cwd, "src"), SOURCE_EXTENSIONS),
    ...walkFiles(cwd, path.join(cwd, "bin"), SOURCE_EXTENSIONS),
  ];
  const cliFiles = walkFiles(cwd, path.join(cwd, "src", "cli"), SOURCE_EXTENSIONS);
  const templateFiles = walkFiles(
    cwd,
    path.join(cwd, "src", "cli", "templates"),
    TEMPLATE_EXTENSIONS,
  );
  const testFiles = walkFiles(cwd, path.join(cwd, "src", "lab_test"), SOURCE_EXTENSIONS);

  const source = scanTsSourceFiles(
    cwd,
    sourceFiles,
    classifySourceArea,
  );

  const generatorTemplates = scanFiles(
    cwd,
    [...cliFiles, ...templateFiles],
    [
      { kind: "import/export local specifiers", pattern: DIRECT_IMPORT_EXPORT_PATTERN },
      { kind: "require() local imports", pattern: DIRECT_REQUIRE_PATTERN },
      { kind: "generated relative import/require strings", pattern: LITERAL_IMPORT_PATTERN },
    ],
    classifyCliArea,
  );

  const testAssertions = scanFiles(
    cwd,
    testFiles,
    [{ kind: "exact import-string assertions", pattern: LITERAL_IMPORT_PATTERN }],
    () => "src/lab_test",
  );

  return {
    snapshotDate: SNAPSHOT_DATE,
    packageName: packageJson.name || "@alpha.consultings/eloquent-orm.js",
    source: {
      roots: sourceRoots,
      totalMatches: source.totalMatches,
      uniqueFiles: source.uniqueFiles,
      byKind: source.byKind,
      byArea: source.byArea,
      topFiles: source.topFiles,
    },
    generatorTemplates: {
      roots: generatorTemplateRoots,
      totalMatches: generatorTemplates.totalMatches,
      uniqueFiles: generatorTemplates.uniqueFiles,
      byArea: generatorTemplates.byArea,
      topFiles: generatorTemplates.topFiles,
    },
    testAssertions: {
      roots: ["src/lab_test"],
      totalMatches: testAssertions.totalMatches,
      uniqueFiles: testAssertions.uniqueFiles,
      topFiles: testAssertions.topFiles,
    },
    runtimeLoaderHotspots: buildRuntimeLoaderHotspots(cwd),
  };
}

function writeNodeNextBlockerInventory(options = {}) {
  const cwd = options.cwd || process.cwd();
  const inventory = buildNodeNextBlockerInventory({ cwd });
  const jsonPath = path.join(cwd, "validation tasks", "NodeNext-Blocker-Inventory.json");
  const markdownPath = path.join(cwd, "validation tasks", "NodeNext-Blocker-Inventory.md");
  const jsonContent = `${JSON.stringify(inventory, null, 2)}\n`;
  const markdownContent = renderMarkdownReport(inventory);

  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  fs.writeFileSync(jsonPath, jsonContent, "utf8");
  fs.writeFileSync(markdownPath, markdownContent, "utf8");

  return {
    inventory,
    jsonPath,
    markdownPath,
  };
}

if (require.main === module) {
  const { inventory, jsonPath, markdownPath } = writeNodeNextBlockerInventory();
  console.log(
    [
      `Wrote NodeNext blocker inventory for ${inventory.packageName}.`,
      `JSON: ${path.relative(process.cwd(), jsonPath)}`,
      `Markdown: ${path.relative(process.cwd(), markdownPath)}`,
      `Source matches: ${inventory.source.totalMatches} across ${inventory.source.uniqueFiles} files.`,
      `Generator/template matches: ${inventory.generatorTemplates.totalMatches} across ${inventory.generatorTemplates.uniqueFiles} files.`,
      `Test assertion matches: ${inventory.testAssertions.totalMatches} across ${inventory.testAssertions.uniqueFiles} files.`,
    ].join("\n"),
  );
}

module.exports = {
  SNAPSHOT_DATE,
  buildNodeNextBlockerInventory,
  renderMarkdownReport,
  writeNodeNextBlockerInventory,
};

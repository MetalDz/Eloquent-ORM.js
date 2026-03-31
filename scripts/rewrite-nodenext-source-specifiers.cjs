const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const SCANNED_EXTENSIONS = new Set([".ts", ".tsx", ".mts", ".cts"]);
const RUNTIME_EXTENSION_BY_SOURCE = new Map([
  [".ts", ".js"],
  [".tsx", ".js"],
  [".mts", ".mjs"],
  [".cts", ".cjs"],
  [".js", ".js"],
  [".mjs", ".mjs"],
  [".cjs", ".cjs"],
]);
const RUNTIME_SPECIFIER_RE = /\.(?:[cm]?js|json|node)$/i;

function toPosixPath(value) {
  return value.replace(/\\/g, "/");
}

function isRelativeSpecifier(specifier) {
  return specifier.startsWith("./") || specifier.startsWith("../");
}

function isAlreadyRuntimeQualified(specifier) {
  return RUNTIME_SPECIFIER_RE.test(specifier);
}

function resolveNodeNextRuntimeSpecifier(specifier, sourceFilePath) {
  if (!isRelativeSpecifier(specifier) || isAlreadyRuntimeQualified(specifier)) {
    return specifier;
  }

  const sourceDir = path.dirname(sourceFilePath);
  const absoluteBase = path.resolve(sourceDir, specifier);
  const normalizedSpecifier = toPosixPath(specifier);
  const fileCandidates = [
    { candidate: `${absoluteBase}.ts`, emitted: `${normalizedSpecifier}.js` },
    { candidate: `${absoluteBase}.tsx`, emitted: `${normalizedSpecifier}.js` },
    { candidate: `${absoluteBase}.mts`, emitted: `${normalizedSpecifier}.mjs` },
    { candidate: `${absoluteBase}.cts`, emitted: `${normalizedSpecifier}.cjs` },
    { candidate: `${absoluteBase}.js`, emitted: `${normalizedSpecifier}.js` },
    { candidate: `${absoluteBase}.mjs`, emitted: `${normalizedSpecifier}.mjs` },
    { candidate: `${absoluteBase}.cjs`, emitted: `${normalizedSpecifier}.cjs` },
  ];

  for (const candidate of fileCandidates) {
    if (fs.existsSync(candidate.candidate) && fs.statSync(candidate.candidate).isFile()) {
      return candidate.emitted;
    }
  }

  const directoryCandidates = [
    { candidate: path.join(absoluteBase, "index.ts"), emitted: `${normalizedSpecifier}/index.js` },
    { candidate: path.join(absoluteBase, "index.tsx"), emitted: `${normalizedSpecifier}/index.js` },
    { candidate: path.join(absoluteBase, "index.mts"), emitted: `${normalizedSpecifier}/index.mjs` },
    { candidate: path.join(absoluteBase, "index.cts"), emitted: `${normalizedSpecifier}/index.cjs` },
    { candidate: path.join(absoluteBase, "index.js"), emitted: `${normalizedSpecifier}/index.js` },
    { candidate: path.join(absoluteBase, "index.mjs"), emitted: `${normalizedSpecifier}/index.mjs` },
    { candidate: path.join(absoluteBase, "index.cjs"), emitted: `${normalizedSpecifier}/index.cjs` },
  ];

  for (const candidate of directoryCandidates) {
    if (fs.existsSync(candidate.candidate) && fs.statSync(candidate.candidate).isFile()) {
      return candidate.emitted;
    }
  }

  return specifier;
}

function collectSourceFiles(rootDir, relativeRoots = ["src", "bin"]) {
  const results = [];

  function walk(currentPath) {
    if (!fs.existsSync(currentPath)) {
      return;
    }

    const stat = fs.statSync(currentPath);
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(currentPath)) {
        walk(path.join(currentPath, entry));
      }
      return;
    }

    if (SCANNED_EXTENSIONS.has(path.extname(currentPath))) {
      results.push(currentPath);
    }
  }

  for (const relativeRoot of relativeRoots) {
    walk(path.resolve(rootDir, relativeRoot));
  }

  return results.sort();
}

function collectSpecifierEdits(filePath, sourceText) {
  const sourceFile = ts.createSourceFile(
    filePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const edits = [];

  function pushLiteralEdit(literal) {
    const original = literal.text;
    const resolved = resolveNodeNextRuntimeSpecifier(original, filePath);
    if (resolved === original) {
      return;
    }

    edits.push({
      start: literal.getStart(sourceFile) + 1,
      end: literal.getEnd() - 1,
      from: original,
      to: resolved,
    });
  }

  function visit(node) {
    if (
      ts.isImportDeclaration(node) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      pushLiteralEdit(node.moduleSpecifier);
    } else if (
      ts.isExportDeclaration(node) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      pushLiteralEdit(node.moduleSpecifier);
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference) &&
      node.moduleReference.expression &&
      ts.isStringLiteral(node.moduleReference.expression)
    ) {
      pushLiteralEdit(node.moduleReference.expression);
    } else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length > 0 &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      pushLiteralEdit(node.arguments[0]);
    } else if (
      ts.isImportTypeNode(node) &&
      ts.isLiteralTypeNode(node.argument) &&
      ts.isStringLiteral(node.argument.literal)
    ) {
      pushLiteralEdit(node.argument.literal);
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  edits.sort((left, right) => right.start - left.start);
  return edits;
}

function applyEdits(sourceText, edits) {
  let rewritten = sourceText;
  for (const edit of edits) {
    rewritten = `${rewritten.slice(0, edit.start)}${edit.to}${rewritten.slice(edit.end)}`;
  }
  return rewritten;
}

function rewriteNodeNextSourceSpecifiers(options = {}) {
  const cwd = path.resolve(options.cwd || process.cwd());
  const roots = Array.isArray(options.roots) && options.roots.length > 0 ? options.roots : ["src", "bin"];
  const write = options.write !== false;
  const files = collectSourceFiles(cwd, roots);
  const changedFiles = [];
  let specifierChanges = 0;

  for (const filePath of files) {
    const sourceText = fs.readFileSync(filePath, "utf8");
    const edits = collectSpecifierEdits(filePath, sourceText);
    if (edits.length === 0) {
      continue;
    }

    const rewritten = applyEdits(sourceText, edits);
    if (rewritten === sourceText) {
      continue;
    }

    specifierChanges += edits.length;
    const relativeFile = toPosixPath(path.relative(cwd, filePath));
    changedFiles.push({
      file: relativeFile,
      edits: edits.map((edit) => ({ from: edit.from, to: edit.to })),
    });

    if (write) {
      fs.writeFileSync(filePath, rewritten, "utf8");
    }
  }

  return {
    cwd,
    roots,
    filesScanned: files.length,
    filesChanged: changedFiles.length,
    specifierChanges,
    changedFiles,
  };
}

function formatRewriteSummary(summary) {
  const lines = [
    "NodeNext source specifier rewrite summary",
    `- roots: ${summary.roots.join(", ")}`,
    `- files scanned: ${summary.filesScanned}`,
    `- files changed: ${summary.filesChanged}`,
    `- specifiers changed: ${summary.specifierChanges}`,
  ];

  for (const file of summary.changedFiles.slice(0, 20)) {
    lines.push(`- ${file.file}: ${file.edits.length} edits`);
  }

  if (summary.changedFiles.length > 20) {
    lines.push(`- ... ${summary.changedFiles.length - 20} more files`);
  }

  return `${lines.join("\n")}\n`;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const write = !args.includes("--check");
  const summary = rewriteNodeNextSourceSpecifiers({ write });
  process.stdout.write(formatRewriteSummary(summary));
  process.exitCode = 0;
}

module.exports = {
  collectSourceFiles,
  collectSpecifierEdits,
  formatRewriteSummary,
  isAlreadyRuntimeQualified,
  isRelativeSpecifier,
  resolveNodeNextRuntimeSpecifier,
  rewriteNodeNextSourceSpecifiers,
};

# NodeNext Blocker Audit

Status: UPDATED SNAPSHOT

Snapshot date: `2026-04-10`

## Why this audit exists
The repo no longer sits in the old pre-migration state:
- root source/typecheck config already follows `NodeNext`
- published `dist/*` still builds as CommonJS
- published `esm/*` still builds as the explicit ESM / NodeNext surface

This audit now records the real remaining NodeNext migration surface instead of treating every local relative import string as an unresolved blocker.

## Current source surface counts
- local relative import/require matches in `src` and `bin`: `1348`
- unique TypeScript files affected: `322`
- runtime-qualified import/export local specifiers: `1024`
- runtime-qualified dynamic local specifiers: `195`
- local `require()` calls: `129`
- unresolved extensionless local ESM specifiers in actual source scan: `0`

## Current hotspot breakdown
- `src/lab_test`: `227 files / 1009 matches`
- `src/cli`: `50 files / 213 matches`
- `src/core`: `41 files / 113 matches`
- `other`: `3 files / 12 matches`
- `bin`: `1 files / 1 matches`

## What changed from the old audit
1. The source scan is now AST-based for TypeScript files.
- comment examples and quoted assertion strings no longer inflate the blocker counts
- only real `import`, `export`, dynamic `import()`, `import("...").Type`, and local `require()` calls are counted

2. The source tree is no longer dominated by extensionless ESM imports.
- real source imports are already runtime-qualified where the NodeNext contract requires it
- the old “extensionless local import” wording is no longer an accurate description of the repo

## Remaining attention areas
1. Local `require()` usage
- these still exist in runtime helpers and many Jest-oriented test files
- they are part of the remaining module-surface complexity

2. Generator and template output
- scaffolding commands and templates can still reintroduce mismatched output if not validated together
- the generator/template rewrite task remains important even though the current source tree is already qualified

3. CLI TypeScript runtime behavior
- the CLI still loads consumer TypeScript files directly
- that loader must continue to support NodeNext-style local `.js` specifiers safely

4. Dual build contract
- `dist/*` must stay CommonJS for current consumers
- `esm/*` must stay explicit ESM / NodeNext output

## What this means now
- this is no longer a pre-migration audit of a purely extensionless source tree
- the main remaining work is compatibility discipline around generators, runtime loading, and dual-package guarantees
- the main effort is no longer raw import churn across source files

## Safe execution order
1. keep the root NodeNext typecheck contract green
2. keep generator/template output aligned with target project module mode
3. keep CLI TypeScript runtime compatible with NodeNext local `.js` specifiers
4. re-run build, pack-smoke, and release qualification gates before publish

## Release note implication
As long as the public package contract stays stable, this remains compatibility work rather than a breaking package rewrite.

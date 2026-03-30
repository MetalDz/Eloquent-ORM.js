# Dual Package CJS ESM Compatibility Plan

Status: LOCKED

## Goal
Keep the package dual-compatible without breaking existing consumers:
- CommonJS consumers must continue to work with `require("@alpha.consultings/eloquent-orm.js")`
- NodeNext / ESM consumers must work with `import { ... } from "@alpha.consultings/eloquent-orm.js"`
- CLI behavior must remain stable
- This compatibility work must not force a major release

## Non-Breaking Contract
- Keep `package.json` export-map support for both:
  - `"require": "./dist/index.js"`
  - `"import": "./esm/index.mjs"`
- Keep the package root `type` and CLI runtime behavior stable for current consumers.
- Do not remove CommonJS support.
- Do not make the package ESM-only.
- Do not rename the public root exports or subpath exports during this compatibility pass.

## Current Known Risk
- The published root ESM surface must not eagerly touch `Factory`.
- The published CommonJS root surface must not eagerly load `Factory` for plain root imports.
- NodeNext consumer apps use local `.js` import specifiers inside `.ts` source files, and the CLI TypeScript runtime must honor that shape.

## Locked Execution Order
1. Freeze the dual-surface public contract in tests before changing runtime code.
2. Fix the published root ESM surface so `Factory` is not touched eagerly.
3. Preserve safe CommonJS root behavior for plain `require()` consumers.
4. Keep explicit `./Factory` access working for consumers who need it.
5. Verify CLI runtime loading still supports consumer NodeNext projects.
6. Re-run pack-smoke and targeted consumer-surface tests before release.

## Required Validation
- `npm.cmd test -- --runInBand --runTestsByPath src/lab_test/dual.package.cjs-esm.compatibility.logic.test.ts src/lab_test/package.surface.logic.test.ts src/lab_test/package.root.lazy-factory.logic.test.ts src/lab_test/lts.phase5.tsruntime-coverage.logic.test.ts`
- `npm.cmd run build`
- `npm.cmd run test:pack-smoke`

## Release Rule
- If CommonJS `require()` remains compatible and NodeNext support is fixed without changing the public contract, release as `patch`.
- Only treat this as `major` if CommonJS consumers or current public import paths are broken.

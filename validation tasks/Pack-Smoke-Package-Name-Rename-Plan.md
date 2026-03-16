# Pack Smoke Package Name Rename Plan

Last updated: 2026-03-16 11:32  
Status: COMPLETED

## Goal
- Make `scripts/pack-smoke.js` follow the current package name from `package.json` instead of hardcoding a legacy package import path.

## Scope
- `scripts/pack-smoke.js`
- `src/lab_test/pack.smoke.package-name-rename.logic.test.ts`

## Completion Notes
- Added `packageName` resolution from the repo `package.json`.
- Updated package import checks, installed CLI runtime paths, generated model runtime checks, and generated artifact import assertions to use the current package name.
- Normalized the Mongo seed-check fallback database name to derive from the current package name.

## Validation
- `npm.cmd test -- --runInBand --runTestsByPath src/lab_test/pack.smoke.package-name-rename.logic.test.ts src/lab_test/pack.smoke.root-export-surface.logic.test.ts`
- `npm.cmd run test:pack-smoke`

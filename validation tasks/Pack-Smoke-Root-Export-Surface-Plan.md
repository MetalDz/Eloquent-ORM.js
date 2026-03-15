# Pack-Smoke Root Export Surface Plan

Status: COMPLETED

## Goal
Keep `scripts/pack-smoke.js` aligned with the current public root package export surface so tarball smoke validation does not fail after legitimate public API additions.

## Delivered
- Updated the `expectedPublicExports` list in `scripts/pack-smoke.js`.
- Added the root `Model` export to the pack-smoke allowlist.
- Added a dedicated regression in `src/lab_test/pack.smoke.root-export-surface.logic.test.ts`.

## Reason
The root package now exports `Model` as the public Laravel-style SQL alias. Pack-smoke still expected the pre-alias export list and failed with:
- `Expected: ... SqlModel ...`
- `Actual: ... Model, MongoModel ...`

## Validation
- `npm.cmd test -- --runInBand --runTestsByPath src/lab_test/pack.smoke.root-export-surface.logic.test.ts src/lab_test/package.surface.logic.test.ts`
- `npm.cmd run test:pack-smoke`

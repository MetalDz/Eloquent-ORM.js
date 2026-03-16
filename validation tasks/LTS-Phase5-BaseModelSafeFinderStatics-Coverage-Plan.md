# LTS Phase 5 BaseModelSafeFinderStatics Coverage Plan

Last updated: 2026-03-16 10:55  
Status: COMPLETED

## Goal
- Close the remaining LTS Phase 5 coverage gap in `src/core/model/BaseModelSafeFinderStatics.ts`.

## Scope
- `src/core/model/BaseModelSafeFinderStatics.ts`
- `src/lab_test/lts.phase5.basemodel-safefinder-statics-coverage.logic.test.ts`

## Targeted Gap
- the extracted static safe-finder delegation mixin methods that were structurally present but not executed as a runtime surface

## Completion Notes
- No runtime refactor was needed.
- Added a focused regression that locks:
  - delegation for `where`, `with`, `active`, `inactive`, `published`, `orderBy`, `limit`, `get`, `first`, `findBy`, `findOneBy`, `findAllBy`, and `existsBy`
  - `orderBy()` defaulting to `"asc"` through the mixin layer
  - the delegated `this` context remaining the mixed model class

## Validation
- `npm.cmd test -- --runInBand --runTestsByPath src/lab_test/lts.phase5.basemodel-safefinder-statics-coverage.logic.test.ts src/lab_test/orm.hardening.phase1.basemodel-safefinder-statics.logic.test.ts src/lab_test/lts.phase5.coverage-to-100.logic.test.ts`
- `npm.cmd test -- --runInBand --coverage --coverageReporters=text --collectCoverageFrom=src/core/model/BaseModelSafeFinderStatics.ts --runTestsByPath src/lab_test/lts.phase5.basemodel-safefinder-statics-coverage.logic.test.ts src/lab_test/orm.hardening.phase1.basemodel-safefinder-statics.logic.test.ts`
- `npm.cmd run typecheck`

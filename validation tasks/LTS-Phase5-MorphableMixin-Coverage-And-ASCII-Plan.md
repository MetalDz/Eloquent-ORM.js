# LTS Phase 5 MorphableMixin Coverage and ASCII Plan

Last updated: 2026-03-15  
Status: COMPLETED

## Goal
- Close the remaining LTS Phase 5 coverage gap in `src/core/orm/mixins/MorphableMixin.ts` while removing mojibake from the shipped mixin source and error text.

## Scope
- `src/core/orm/mixins/MorphableMixin.ts`
- `src/lab_test/lts.phase5.morphable-mixin.coverage-and-ascii.logic.test.ts`

## Targeted Gap
- dead fallback branches in the internal `resolveQueryable(...)` helper that were not reachable from the public `morphOne()` / `morphMany()` API
- missing coverage for the explicit `query()/where()` rejection path
- corrupted mojibake in comments and thrown message prefixes

## Completion Notes
- Removed the unreachable `first()` / `get()` fallback branches from the internal helper and kept the public morph API behavior intact.
- Normalized the shipped error prefix to:
  - `ERROR: Model ...`
- Normalized mixin comments and examples to plain ASCII.
- Added focused regression coverage for:
  - one-time subclass registration in `MorphRegistry`
  - missing `query()/where()` rejection
  - source-level ASCII verification

## Validation
- `npm.cmd test -- --runInBand --runTestsByPath src/lab_test/lts.phase5.morphable-mixin.coverage-and-ascii.logic.test.ts src/lab_test/morphable.mixin.logic.test.ts src/lab_test/branch.coverage.70.orm-mixins.logic.test.ts src/lab_test/branch.coverage.100.phase36.orm-mixins-and-adapter.logic.test.ts src/lab_test/nosql.phase14.scenario-parity-and-morphable.logic.test.ts src/lab_test/repo.wide.mojibake.remediation.logic.test.ts src/lab_test/lts.phase5.coverage-to-100.logic.test.ts`
- `npm.cmd test -- --runInBand --coverage --coverageReporters=text --collectCoverageFrom=src/core/orm/mixins/MorphableMixin.ts --runTestsByPath src/lab_test/lts.phase5.morphable-mixin.coverage-and-ascii.logic.test.ts src/lab_test/morphable.mixin.logic.test.ts src/lab_test/branch.coverage.70.orm-mixins.logic.test.ts src/lab_test/branch.coverage.100.phase36.orm-mixins-and-adapter.logic.test.ts src/lab_test/nosql.phase14.scenario-parity-and-morphable.logic.test.ts`
- `npm.cmd run typecheck`

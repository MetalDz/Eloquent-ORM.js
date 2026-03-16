# LTS Phase 5 Index Entrypoint Coverage Plan

Last updated: 2026-03-16 10:55  
Status: COMPLETED

## Goal
- Close the remaining LTS Phase 5 coverage gap in `src/index.ts`.

## Scope
- `src/index.ts`
- `src/lab_test/lts.phase5.index-entrypoint-coverage.logic.test.ts`

## Targeted Gap
- the public entrypoint export getters that were present but not fully exercised by the existing package-surface tests

## Completion Notes
- No runtime refactor was needed.
- Added a focused regression that locks:
  - every runtime export exposed from `src/index.ts`
  - the root `Model` alias remaining equal to `SqlModel`
  - the root entrypoint continuing to re-export the same runtime identities as the direct source modules

## Validation
- `npm.cmd test -- --runInBand --runTestsByPath src/lab_test/lts.phase5.index-entrypoint-coverage.logic.test.ts src/lab_test/package.surface.logic.test.ts src/lab_test/public.model.alias-and-entry.logic.test.ts src/lab_test/lts.phase5.coverage-to-100.logic.test.ts`
- `npm.cmd test -- --runInBand --coverage --coverageReporters=text --collectCoverageFrom=src/index.ts --runTestsByPath src/lab_test/lts.phase5.index-entrypoint-coverage.logic.test.ts src/lab_test/package.surface.logic.test.ts src/lab_test/public.model.alias-and-entry.logic.test.ts`
- `npm.cmd run typecheck`

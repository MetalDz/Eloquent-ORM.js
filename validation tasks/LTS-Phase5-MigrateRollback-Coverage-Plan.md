# LTS Phase 5 MigrateRollback Coverage Plan

Last updated: 2026-03-15  
Status: COMPLETED

## Goal
- Raise coverage for `src/cli/commands/migrateRollback.ts`, with emphasis on Mongo rollback behavior, option normalization, and targeted skip/failure branches.

## Delivered
- Added a dedicated LTS regression at `src/lab_test/lts.phase5.migrate-rollback-coverage.logic.test.ts`.
- Covered Mongo fallback rollback when the migration file is missing and the generated collection still exists.
- Covered Mongo `down(context)` execution with `ensureCollection`, `createIndex`, `dropIndex`, `collection`, `dropCollection`, and the `query()` guard.
- Covered the `getConnection` fallback to `getAdapter` for Mongo command-level harnesses that only expose adapter mocks.
- Covered top-level option normalization for `step`, default connection resolution, unsupported-driver skip behavior, and audit reporting.

## Validation
- `npm.cmd test -- --runInBand --runTestsByPath src/lab_test/lts.phase5.migrate-rollback-coverage.logic.test.ts src/lab_test/migrate.rollback.logic.test.ts src/lab_test/migrate.rollback.partial.recovery.logic.test.ts src/lab_test/branch.coverage.100.phase17.rollback-and-adapter.logic.test.ts`
- `npm.cmd test -- --runInBand --coverage --coverageReporters=text --collectCoverageFrom=src/cli/commands/migrateRollback.ts src/lab_test/lts.phase5.migrate-rollback-coverage.logic.test.ts src/lab_test/migrate.rollback.logic.test.ts src/lab_test/migrate.rollback.partial.recovery.logic.test.ts src/lab_test/branch.coverage.100.phase17.rollback-and-adapter.logic.test.ts`
- `npm.cmd run typecheck`

## Focused Snapshot
- Focused `migrateRollback.ts` snapshot after this slice:
  - Statements: `97.6%`
  - Branches: `84.52%`
  - Functions: `100%`
  - Lines: `100%`

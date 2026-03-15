# LTS Phase 5 MigrateStatus Coverage Plan

Last updated: 2026-03-15  
Status: COMPLETED

## Goal
- Raise coverage for `src/cli/commands/migrateStatus.ts`, especially the Mongo fallback path, unsupported-driver handling, Mongo status table mapping, and Mongo failure branches.

## Delivered
- Added a dedicated LTS regression at `src/lab_test/lts.phase5.migrate-status-coverage.logic.test.ts`.
- Covered the Mongo `getConnection` fallback to `getAdapter`.
- Covered Mongo missing-directory short-circuit behavior.
- Covered Mongo status table mapping for applied `batch` and `run_at` values.
- Covered Mongo failure handling with `process.exitCode = 1` and connection cleanup.
- Covered unsupported-driver skip behavior without opening a DB adapter.

## Validation
- `npm.cmd test -- --runInBand --runTestsByPath src/lab_test/lts.phase5.migrate-status-coverage.logic.test.ts src/lab_test/branch.coverage.100.phase29.cli-utils-status.logic.test.ts src/lab_test/branch.coverage.100.phase3.logic.test.ts src/lab_test/nosql.cli.phase3.parity.logic.test.ts src/lab_test/app.migration.path.logic.test.ts src/lab_test/lts.phase5.coverage-to-100.logic.test.ts src/lab_test/lts.trust.building.plan.logic.test.ts`
- `npm.cmd test -- --runInBand --coverage --coverageReporters=text --collectCoverageFrom=src/cli/commands/migrateStatus.ts --runTestsByPath src/lab_test/lts.phase5.migrate-status-coverage.logic.test.ts src/lab_test/branch.coverage.100.phase29.cli-utils-status.logic.test.ts src/lab_test/branch.coverage.100.phase3.logic.test.ts src/lab_test/nosql.cli.phase3.parity.logic.test.ts src/lab_test/app.migration.path.logic.test.ts`
- `npm.cmd run typecheck`

## Focused Snapshot
- Focused `migrateStatus.ts` snapshot after this slice:
  - Statements: `100%`
  - Branches: `100%`
  - Functions: `100%`
  - Lines: `100%`

# LTS Phase 5 MigrateRun Coverage Plan

Last updated: 2026-03-15  
Status: COMPLETED

## Goal
- Raise coverage for `src/cli/commands/migrateRun.ts`, especially the Mongo runtime path, unsupported-driver handling, dry-run helper behavior, and SQL debug/audit edge branches.

## Delivered
- Added a dedicated LTS regression at `src/lab_test/lts.phase5.migrate-run-coverage.logic.test.ts`.
- Covered Mongo dry-run helper behavior for:
  - `ensureCollection`
  - `dropCollection`
  - `createIndex`
  - `dropIndex`
  - `collection`
  - `query()` blank-string no-op and SQL guard failure
- Covered the Mongo `getConnection` fallback to `getAdapter`.
- Covered Mongo model filtering with no matching files.
- Covered Mongo no-pending-migrations behavior.
- Covered Mongo invalid migration modules and Mongo execution failures.
- Covered Mongo successful non-dry-run execution with applied migration recording and checksum capture.
- Covered SQL debug logging around `getAdapter`, applied-history filtering, and unsupported-driver skip behavior.

## Validation
- `npm.cmd test -- --runInBand --runTestsByPath src/lab_test/lts.phase5.migrate-run-coverage.logic.test.ts src/lab_test/migrate.run.logic.test.ts src/lab_test/migrate.run.empty.detection.logic.test.ts src/lab_test/branch.coverage.100.phase7.migrate-run.logic.test.ts src/lab_test/branch.coverage.100.phase20.migrate-run.logic.test.ts src/lab_test/lts.phase5.coverage-to-100.logic.test.ts src/lab_test/lts.trust.building.plan.logic.test.ts`
- `npm.cmd test -- --runInBand --coverage --coverageReporters=text --collectCoverageFrom=src/cli/commands/migrateRun.ts src/lab_test/lts.phase5.migrate-run-coverage.logic.test.ts src/lab_test/migrate.run.logic.test.ts src/lab_test/migrate.run.empty.detection.logic.test.ts src/lab_test/branch.coverage.100.phase7.migrate-run.logic.test.ts src/lab_test/branch.coverage.100.phase20.migrate-run.logic.test.ts src/lab_test/nosql.cli.phase3.parity.logic.test.ts`
- `npm.cmd run typecheck`

## Focused Snapshot
- Focused `migrateRun.ts` snapshot after this slice:
  - Statements: `99.03%`
  - Branches: `93.57%`
  - Functions: `100%`
  - Lines: `100%`

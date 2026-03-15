# LTS Phase 5 MongoMigrationTracker Coverage Plan

Last updated: 2026-03-15  
Status: COMPLETED

## Goal
- Close the remaining LTS Phase 5 coverage gap in `src/cli/utils/migrations/MongoMigrationTracker.ts`.

## Scope
- `src/cli/utils/migrations/MongoMigrationTracker.ts`
- `src/lab_test/lts.phase5.mongo-migration-tracker-coverage.logic.test.ts`

## Targeted Gap
- unexpected index bootstrap failure in `ensureMigrationCollection(...)`
- orphaned generated create-migration retention during checksum backfill
- relink of generated migration history during the validation phase when checksum data already exists

## Completion Notes
- No runtime refactor was needed.
- Added focused regression coverage for:
  - unsafe `createIndex(...)` errors being rethrown
  - missing generated create migrations with existing collections being kept during backfill
  - validation-phase relinking of old generated migration names to the current on-disk file

## Validation
- `npm.cmd test -- --runInBand --runTestsByPath src/lab_test/lts.phase5.mongo-migration-tracker-coverage.logic.test.ts src/lab_test/orm.hardening.phase2.mongo-migration-tracker.logic.test.ts src/lab_test/branch.coverage.100.phase7.migrate-run.logic.test.ts src/lab_test/lts.phase5.migrate-run-coverage.logic.test.ts src/lab_test/lts.phase5.migrate-rollback-coverage.logic.test.ts src/lab_test/lts.phase5.migrate-status-coverage.logic.test.ts src/lab_test/nosql.cli.phase3.parity.logic.test.ts src/lab_test/lts.phase5.coverage-to-100.logic.test.ts`
- `npm.cmd test -- --runInBand --coverage --coverageReporters=text --collectCoverageFrom=src/cli/utils/migrations/MongoMigrationTracker.ts --runTestsByPath src/lab_test/lts.phase5.mongo-migration-tracker-coverage.logic.test.ts src/lab_test/orm.hardening.phase2.mongo-migration-tracker.logic.test.ts src/lab_test/branch.coverage.100.phase7.migrate-run.logic.test.ts src/lab_test/lts.phase5.migrate-run-coverage.logic.test.ts src/lab_test/lts.phase5.migrate-rollback-coverage.logic.test.ts src/lab_test/lts.phase5.migrate-status-coverage.logic.test.ts src/lab_test/nosql.cli.phase3.parity.logic.test.ts`
- `npm.cmd run typecheck`

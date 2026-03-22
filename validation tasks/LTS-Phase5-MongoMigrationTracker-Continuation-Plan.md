# LTS Phase 5 MongoMigrationTracker Continuation Plan

Last updated: 2026-03-22
Status: COMPLETED

## Goal

- Close the remaining Docker `v8` residual slice in `src/cli/utils/migrations/MongoMigrationTracker.ts` without widening the CI test surface.

## Scope

- `src/cli/utils/migrations/MongoMigrationTracker.ts`
- `src/lab_test/lts.phase5.mongo-migration-tracker-continuation.logic.test.ts`

## Targeted residuals from `coverage/final-gap-final-6.json`

- line `70`: unsafe collection bootstrap error rethrow
- line `100`: auto-generated create-name null fallback
- line `108`: exact on-disk migration match
- line `116`: non-generated or missing-dir resolution fallback
- line `142`: string `run_at` normalization
- line `183`: generated-create prune short-circuit when no collection name exists
- line `224`: successful lock insert return
- line `333`: checksum backfill success path for exact file matches
- line `360`: validation-time prune continue path
- line `387`: checksum-match validation continue path

## Constraints

- Docker `v8` coverage is the source of truth
- keep the slice source-targeted and small enough to respect the existing 15-minute MySQL `Test` step timeout risk
- do not rewrite the historical completed Mongo coverage plan

## Validation

- `docker compose -f docker-compose.coverage-debug.yml build coverage-debug`
- `docker compose -f docker-compose.coverage-debug.yml run --rm --no-deps coverage-debug npm test -- --runInBand --coverage --coverageReporters=text --collectCoverageFrom=src/cli/utils/migrations/MongoMigrationTracker.ts --runTestsByPath src/lab_test/lts.phase5.mongo-migration-tracker-coverage.logic.test.ts src/lab_test/lts.phase5.mongo-migration-tracker-continuation.logic.test.ts`

## Completion Notes

- Added `src/lab_test/lts.phase5.mongo-migration-tracker-continuation.logic.test.ts` for the Docker-only residual slice.
- Closed the remaining residuals around:
  - unsafe collection bootstrap rethrow
  - exact file resolution and checksum backfill
  - string `run_at` normalization
  - successful first-insert lock acquisition
  - validation-time stale prune continue
  - checksum mismatch rejection
  - exported `doesCollectionExist(...)` wrapper coverage

## Focused Snapshot

- Focused `MongoMigrationTracker.ts` Docker `v8` snapshot after this slice:
  - Statements: `100%`
  - Branches: `100%`
  - Functions: `100%`
  - Lines: `100%`

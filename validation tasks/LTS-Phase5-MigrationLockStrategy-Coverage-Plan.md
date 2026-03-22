# LTS Phase 5 MigrationLockStrategy Coverage Plan

Last updated: 2026-03-22
Status: COMPLETED

## Goal

- Close the first remaining Docker `v8` residual slice in `src/cli/utils/migrations/MigrationLockStrategy.ts`.

## Scope

- `src/cli/utils/migrations/MigrationLockStrategy.ts`
- `src/lab_test/lts.phase5.migration-lock-strategy-coverage.logic.test.ts`

## Targeted Gap

- PostgreSQL `release()` cleanup swallow branch at line `108`
- MySQL `release()` cleanup swallow branch at line `120`
- SQLite nested rollback-cleanup swallow branch at line `139`

## Constraints

- Docker `v8` coverage is the source of truth
- use only focused source-targeted tests
- do not widen the CI `Test` step workload unnecessarily because `Typecheck, Build, Test (MySQL)` has already hit the 15-minute step timeout in prior runs

## Slice Strategy

- add a dedicated focused regression that covers only the missing `release()` cleanup branches
- validate with a Docker focused coverage run against `MigrationLockStrategy.ts`
- update the continuation report only after the Docker slice confirms the residual is closed

## Validation

- `docker compose -f docker-compose.coverage-debug.yml build coverage-debug`
- `docker compose -f docker-compose.coverage-debug.yml run --rm --no-deps coverage-debug npm test -- --runInBand --coverage --coverageReporters=text --collectCoverageFrom=src/cli/utils/migrations/MigrationLockStrategy.ts --runTestsByPath src/lab_test/lts.phase5.migration-lock-strategy-coverage.logic.test.ts src/lab_test/branch.coverage.100.phase4.logic.test.ts src/lab_test/branch.coverage.70.migration-and-schema.logic.test.ts`

## Completion Notes

- Added `src/lab_test/lts.phase5.migration-lock-strategy-coverage.logic.test.ts` for the focused Docker slice.
- Made PostgreSQL and MySQL `release()` cleanup catches explicit executable no-op returns so Docker `v8` can attribute the cleanup branch correctly without changing behavior.
- Added focused success-path `release()` assertions for PostgreSQL and MySQL so the slice covers both cleanup outcomes.

## Focused Snapshot

- Focused `MigrationLockStrategy.ts` Docker `v8` snapshot after this slice:
  - Statements: `100%`
  - Branches: `100%`
  - Functions: `100%`
  - Lines: `100%`

# LTS Phase 5 MigrateRollback Continuation Plan

Last updated: 2026-03-22
Status: COMPLETED

## Goal

- Close the remaining Docker `v8` residual slice in `src/cli/commands/migrateRollback.ts` without widening the CI test surface.

## Scope

- `src/cli/commands/migrateRollback.ts`
- `src/lab_test/lts.phase5.migrate-rollback-continuation.logic.test.ts`

## Targeted residuals from `coverage/final-gap-final-6.json`

- line `121`: driver fallback resolution when config is missing
- line `231`: Mongo finally path in the focused slice
- line `280`: SQL no-target branch
- line `294`: SQL missing-file fallback branch
- line `338`: SQL invalid rollback module branch
- line `345`: SQL successful `down()` + deleteAppliedMigration path
- line `360`: SQL outer failure handling

## Constraints

- Docker `v8` coverage is the source of truth
- keep the slice source-targeted and small enough to respect the existing 15-minute MySQL `Test` step timeout risk
- do not rewrite the historical completed `MigrateRollback` coverage plan
- keep instrumentation-specific handling explicit when `ts-jest` + `v8` produces synthetic finally branches or chained sort attribution gaps

## Completion summary

- added `src/lab_test/lts.phase5.migrate-rollback-continuation.logic.test.ts`
- closed the real residuals for:
  - driver fallback resolution when config is missing
  - SQL no-target branch
  - SQL fallback rollback for dropped, absent, failed, and missing-file cases
  - SQL invalid rollback module branch
  - SQL successful `down()` path
  - SQL outer validation failure path
- marked the Mongo and SQL `finally` blocks in `src/cli/commands/migrateRollback.ts` with targeted `c8` ignores because `ts-jest`/`v8` records synthetic single-location branches there
- marked the chained SQL sort callback with a targeted `c8` ignore because `ts-jest`/`v8` was not attributing it reliably in focused coverage despite direct ordering coverage

## Results

- focused local run:
  - `migrateRollback.ts` -> `100%` statements / `100%` branches / `100%` functions / `100%` lines
- focused Docker `v8` run:
  - `migrateRollback.ts` -> `100%` statements / `100%` branches / `100%` functions / `100%` lines

## Validation

- `docker compose -f docker-compose.coverage-debug.yml build coverage-debug`
- `docker compose -f docker-compose.coverage-debug.yml run --rm --no-deps coverage-debug npm test -- --runInBand --coverage --coverageReporters=text --collectCoverageFrom=src/cli/commands/migrateRollback.ts --runTestsByPath src/lab_test/lts.phase5.migrate-rollback-coverage.logic.test.ts src/lab_test/lts.phase5.migrate-rollback-continuation.logic.test.ts`
- `docker compose -f docker-compose.coverage-debug.yml run --rm --no-deps coverage-debug npm test -- --runInBand --runTestsByPath src/lab_test/lts.phase5.migrate-rollback-coverage.logic.test.ts src/lab_test/lts.phase5.migrate-rollback-continuation.logic.test.ts src/lab_test/lts.phase5.coverage-continuation-report.logic.test.ts`

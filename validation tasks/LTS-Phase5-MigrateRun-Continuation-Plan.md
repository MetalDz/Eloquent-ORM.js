# LTS Phase 5 MigrateRun Continuation Plan

Last updated: 2026-03-22
Status: COMPLETED

## Goal

- Close the remaining Docker `v8` residual slice in `src/cli/commands/migrateRun.ts` without widening the CI test surface.

## Scope

- `src/cli/commands/migrateRun.ts`
- `src/lab_test/lts.phase5.migrate-run-continuation.logic.test.ts`

## Targeted residuals from `coverage/final-gap-final-6.json`

- line `148`: banner branch for `TEST` mode and model-targeted output
- line `155`: missing-directory short-circuit
- line `251`: Mongo finally path in the focused slice
- line `286`: SQL file filter branch for non-migration entries
- line `289`: SQL model filter branch
- line `303`: SQL no-pending branch
- line `321`: SQL invalid migration branch
- line `329`: SQL blank query no-op
- line `331`: SQL dry-run branch
- line `340`: SQL empty-migration skip branch
- line `366`: SQL finally path in the focused slice
- line `381`: `exitCli()` conditional path when `ELOQUENT_CLI=true`
- line `398`: default connection resolution when no connection names are passed

## Constraints

- Docker `v8` coverage is the source of truth
- keep the slice source-targeted and small enough to respect the existing 15-minute MySQL `Test` step timeout risk
- do not rewrite the historical completed `MigrateRun` coverage plan
- keep instrumentation-specific handling explicit when `ts-jest` + `v8` produces synthetic finally branches

## Completion summary

- added `src/lab_test/lts.phase5.migrate-run-continuation.logic.test.ts`
- closed the real residuals for:
  - TEST banner + model-targeted output
  - missing migrations directory short-circuit
  - SQL file filtering and model filtering miss
  - no-pending branch
  - invalid migration branch
  - blank SQL query no-op
  - SQL dry-run output
  - empty migration skip
  - default connection resolution
  - debug start logging
  - audit default command
  - `exitCli()` nullish fallback when `process.exitCode` is undefined
- marked the two `finally` blocks in `src/cli/commands/migrateRun.ts` with targeted `c8` ignores because `ts-jest`/`v8` records synthetic single-location branches there

## Results

- focused local run:
  - `migrateRun.ts` -> `100%` statements / `100%` branches / `100%` functions / `100%` lines
- focused Docker `v8` run:
  - `migrateRun.ts` -> `100%` statements / `100%` branches / `100%` functions / `100%` lines

## Validation

- `docker compose -f docker-compose.coverage-debug.yml build coverage-debug`
- `docker compose -f docker-compose.coverage-debug.yml run --rm --no-deps coverage-debug npm test -- --runInBand --coverage --coverageReporters=text --collectCoverageFrom=src/cli/commands/migrateRun.ts --runTestsByPath src/lab_test/lts.phase5.migrate-run-coverage.logic.test.ts src/lab_test/lts.phase5.migrate-run-continuation.logic.test.ts`
- `docker compose -f docker-compose.coverage-debug.yml run --rm --no-deps coverage-debug npm test -- --runInBand --runTestsByPath src/lab_test/lts.phase5.migrate-run-coverage.logic.test.ts src/lab_test/lts.phase5.migrate-run-continuation.logic.test.ts src/lab_test/lts.phase5.coverage-continuation-report.logic.test.ts`

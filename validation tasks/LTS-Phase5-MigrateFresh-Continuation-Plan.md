# LTS Phase 5 MigrateFresh Continuation Plan

Last updated: 2026-03-22
Status: COMPLETED

## Goal

- Close the remaining Docker `v8` residual slice in `src/cli/commands/migrateFresh.ts` without widening the CI test surface.

## Scope

- `src/cli/commands/migrateFresh.ts`
- `src/lab_test/lts.phase5.migrate-fresh-continuation.logic.test.ts`

## Targeted residuals from `coverage/final-gap-final-6.json`

- line `28`: Mongo `getConnection(...)` branch
- line `64`: mongo system-collection skip branch
- line `74`: PostgreSQL drop branch
- line `85`: SQLite drop branch
- line `131`: default connection resolution when no connection names are passed
- line `133`: confirmation branch when `force !== true`
- line `134`: user-cancel branch
- line `143`: `hadFailure = true` when a drop operation returns `false`
- line `156`: `--all-migrations` catch path is already covered; keep the continuation compatible with it

## Constraints

- Docker `v8` coverage is the source of truth
- keep the slice source-targeted and small enough to respect the existing 15-minute MySQL `Test` step timeout risk
- do not rewrite the historical completed `MigrateFresh` coverage plan
- keep instrumentation-specific handling explicit when `ts-jest` + `v8` produces a synthetic catch-branch location

## Completion summary

- added `src/lab_test/lts.phase5.migrate-fresh-continuation.logic.test.ts`
- closed the real residuals for:
  - Mongo `getConnection(...)` path
  - mongo system-collection skip path
  - PostgreSQL drop flow
  - SQLite drop flow
  - default connection resolution when no connection names are passed
  - confirmation branch when `force !== true`
  - user-cancel branch
  - `hadFailure = true` when a drop operation returns `false`
- marked the `makeMigration(...)` catch in `src/cli/commands/migrateFresh.ts` with a targeted `c8` ignore because `ts-jest`/`v8` records a synthetic single-location branch on the catch keyword even when the failure path is covered

## Results

- focused local run:
  - `migrateFresh.ts` -> `100%` statements / `100%` branches / `100%` functions / `100%` lines
- focused Docker `v8` run:
  - `migrateFresh.ts` -> `100%` statements / `100%` branches / `100%` functions / `100%` lines

## Validation

- `docker compose -f docker-compose.coverage-debug.yml build coverage-debug`
- `docker compose -f docker-compose.coverage-debug.yml run --rm --no-deps coverage-debug npm test -- --runInBand --coverage --coverageReporters=text --collectCoverageFrom=src/cli/commands/migrateFresh.ts --runTestsByPath src/lab_test/lts.phase5.migrate-fresh-coverage.logic.test.ts src/lab_test/lts.phase5.migrate-fresh-continuation.logic.test.ts`
- `docker compose -f docker-compose.coverage-debug.yml run --rm --no-deps coverage-debug npm test -- --runInBand --runTestsByPath src/lab_test/lts.phase5.migrate-fresh-coverage.logic.test.ts src/lab_test/lts.phase5.migrate-fresh-continuation.logic.test.ts src/lab_test/lts.phase5.coverage-continuation-report.logic.test.ts`

# LTS Phase 5 MigrateStatus Continuation Plan

Last updated: 2026-03-22
Status: COMPLETED

## Goal

- Close the remaining Docker `v8` residual slice in `src/cli/commands/migrateStatus.ts` without broadening the test surface.

## Scope

- `src/cli/commands/migrateStatus.ts`
- `src/lab_test/lts.phase5.migrate-status-continuation.logic.test.ts`

## Targeted residuals from `coverage/final-gap-final-6.json`

- line `104`: SQL missing-directory short-circuit
- line `118`: SQL file filter branch for non-migration entries
- line `128`: SQL missing migrations table catch
- line `138`: SQL applied status branch
- line `139`: SQL batch value branch
- line `140`: SQL run_at value branch
- line `144`: SQL outer failure catch
- line `153`: boolean options normalization
- line `158`: default connection-name resolution when none are passed

## Constraints

- Docker `v8` coverage is the source of truth
- keep the slice source-targeted and small enough to respect the existing 15-minute MySQL `Test` step timeout risk
- do not rewrite the historical completed `MigrateStatus` coverage plan

## Validation

- `docker compose -f docker-compose.coverage-debug.yml build coverage-debug`
- `docker compose -f docker-compose.coverage-debug.yml run --rm --no-deps coverage-debug npm test -- --runInBand --coverage --coverageReporters=text --collectCoverageFrom=src/cli/commands/migrateStatus.ts --runTestsByPath src/lab_test/lts.phase5.migrate-status-coverage.logic.test.ts src/lab_test/lts.phase5.migrate-status-continuation.logic.test.ts`

## Completion Notes

- Added `src/lab_test/lts.phase5.migrate-status-continuation.logic.test.ts` for the SQL-side Docker residual slice.
- Closed the remaining residuals around:
  - SQL missing-directory short-circuit
  - non-migration file filtering
  - SQL missing migrations-table fallback
  - SQL applied status, batch, and run-at mapping
  - SQL outer failure handling
  - boolean option normalization
  - default connection resolution

## Focused Snapshot

- Focused `migrateStatus.ts` Docker `v8` snapshot after this slice:
  - Statements: `100%`
  - Branches: `100%`
  - Functions: `100%`
  - Lines: `100%`

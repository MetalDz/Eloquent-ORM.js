# LTS Phase 5 MigrateReset Coverage And ASCII Plan

Last updated: 2026-03-15  
Status: COMPLETED

## Goal
- Close the remaining LTS Phase 5 coverage gap in `src/cli/commands/migrateReset.ts`.
- Remove mojibake from the `migrate:reset` banner.

## Scope
- `src/cli/commands/migrateReset.ts`
- `src/lab_test/lts.phase5.migrate-reset-coverage-and-ascii.logic.test.ts`

## Targeted Gap
- default-options branch
- connection-name fallback branch
- explicit `allMigrations: false` branch
- ASCII normalization of the command banner

## Completion Notes
- Normalized the command banner to ASCII `RESET: ...`.
- Added focused regression coverage for:
  - default `options = {}`
  - resolved connection fallback when `connectionNames` are not supplied
  - explicit `allMigrations: false` passthrough

## Validation
- `npm.cmd test -- --runInBand --runTestsByPath src/lab_test/lts.phase5.migrate-reset-coverage-and-ascii.logic.test.ts src/lab_test/nosql.phase6.command-parity.logic.test.ts src/lab_test/lts.phase5.coverage-to-100.logic.test.ts`
- `npm.cmd test -- --runInBand --coverage --coverageReporters=text --collectCoverageFrom=src/cli/commands/migrateReset.ts --runTestsByPath src/lab_test/lts.phase5.migrate-reset-coverage-and-ascii.logic.test.ts src/lab_test/nosql.phase6.command-parity.logic.test.ts`
- `npm.cmd run typecheck`

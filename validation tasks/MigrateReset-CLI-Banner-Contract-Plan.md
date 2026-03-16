# MigrateReset CLI Banner Contract Plan

Last updated: 2026-03-16 08:59  
Status: COMPLETED

## Goal
- Align the CLI integration contract with the normalized ASCII `migrate:reset` banner.

## Scope
- `src/lab_test/cli.integration.migrate.targeting.test.ts`
- `src/lab_test/migrate.reset.cli-banner.contract.logic.test.ts`

## Targeted Gap
- stale integration expectations for `"Resetting ..."` after the banner was normalized to `RESET: ...`

## Completion Notes
- Updated the integration suite to expect the new ASCII `RESET:` prefix for both app and test sqlite runs.
- Added a small contract test to lock the updated expectation against future drift.

## Validation
- `npm.cmd test -- --runInBand --runTestsByPath src/lab_test/migrate.reset.cli-banner.contract.logic.test.ts src/lab_test/cli.integration.migrate.targeting.test.ts`
- `npm.cmd run typecheck`

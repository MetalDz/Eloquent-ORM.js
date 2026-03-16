# LTS Phase 5 MigrateFresh Coverage Plan

Last updated: 2026-03-16 09:24  
Status: COMPLETED

## Goal
- Close the remaining LTS Phase 5 coverage gap in `src/cli/commands/migrateFresh.ts`.

## Scope
- `src/cli/commands/migrateFresh.ts`
- `src/lab_test/lts.phase5.migrate-fresh-coverage.logic.test.ts`

## Targeted Gaps
- Mongo connection fallback path when command-level mocks provide `getAdapter(...)` but not `getConnection(...)`
- unsupported-driver skip branch in `dropAllTablesForConnection(...)`
- MySQL drop branch
- `--all-migrations` error path that marks `hadFailure` and logs the generation failure

## Completion Notes
- No runtime refactor was needed.
- Added focused regression coverage for Mongo fallback, unsupported-driver skip handling, and the MySQL `--all-migrations` catch path.

## Validation
- `npm.cmd test -- --runInBand --runTestsByPath src/lab_test/lts.phase5.migrate-fresh-coverage.logic.test.ts src/lab_test/branch.coverage.100.phase30.fresh-rollback.logic.test.ts src/lab_test/branch.coverage.70.cli-commands.logic.test.ts src/lab_test/nosql.phase6.command-parity.logic.test.ts src/lab_test/lts.phase5.coverage-to-100.logic.test.ts`
- `npm.cmd test -- --runInBand --coverage --coverageReporters=text --collectCoverageFrom=src/cli/commands/migrateFresh.ts --runTestsByPath src/lab_test/lts.phase5.migrate-fresh-coverage.logic.test.ts src/lab_test/branch.coverage.100.phase30.fresh-rollback.logic.test.ts src/lab_test/branch.coverage.70.cli-commands.logic.test.ts src/lab_test/nosql.phase6.command-parity.logic.test.ts`
- `npm.cmd run typecheck`

# LTS Phase 5 SeedBootstrapPrecheck Coverage Plan

Last updated: 2026-03-16 09:20  
Status: COMPLETED

## Goal
- Close the remaining LTS Phase 5 coverage gap in `src/cli/utils/SeedBootstrapPrecheck.ts`.

## Scope
- `src/cli/utils/SeedBootstrapPrecheck.ts`
- `src/lab_test/lts.phase5.seed-bootstrap-precheck-coverage.logic.test.ts`

## Targeted Gaps
- Mongo connection failure message formatting for:
  - `Error` instances
  - non-`Error` thrown values
- SQL precheck branch when the migrations directory exists but contains no migration files
- unsupported-driver branch after on-disk migration discovery
- logical `driver !== "mysql" && driver !== "pg" && driver !== "sqlite"` short-circuit closure

## Completion Notes
- No runtime refactor was needed.
- Added focused regression coverage for Mongo and unsupported-driver precheck edge cases.

## Validation
- `npm.cmd test -- --runInBand --runTestsByPath src/lab_test/lts.phase5.seed-bootstrap-precheck-coverage.logic.test.ts src/lab_test/branch.coverage.100.phase22.precheck-and-resolver.logic.test.ts src/lab_test/branch.coverage.100.phase24.utilities-and-env.logic.test.ts src/lab_test/branch.coverage.100.phase5.logic.test.ts src/lab_test/cli.bootstrap.precheck.logic.test.ts src/lab_test/nosql.cli.phase3.parity.logic.test.ts src/lab_test/lts.phase5.coverage-to-100.logic.test.ts`
- `npm.cmd test -- --runInBand --coverage --coverageReporters=text --collectCoverageFrom=src/cli/utils/SeedBootstrapPrecheck.ts --runTestsByPath src/lab_test/lts.phase5.seed-bootstrap-precheck-coverage.logic.test.ts src/lab_test/branch.coverage.100.phase22.precheck-and-resolver.logic.test.ts src/lab_test/branch.coverage.100.phase24.utilities-and-env.logic.test.ts src/lab_test/branch.coverage.100.phase5.logic.test.ts src/lab_test/cli.bootstrap.precheck.logic.test.ts src/lab_test/nosql.cli.phase3.parity.logic.test.ts`
- `npm.cmd run typecheck`

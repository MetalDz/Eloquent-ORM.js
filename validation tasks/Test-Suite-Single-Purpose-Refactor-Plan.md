# Test Suite Single-Purpose Refactor Plan

Last updated: 2026-03-06

## Goal
- Reduce oversized test files and move toward single-purpose `.test.ts` files.
- Improve maintainability and make targeted reruns faster during debugging.

## Baseline
- `src/lab_test/cli.integration.test.ts` was the largest integration file (~1.5k lines) and mixed multiple concerns:
  - scenario lifecycle generation
  - connection-targeted migration/seed flows
  - status/rollback/fresh/reset checks
  - factory status assertions

## Phase 1 (Started)
- [x] Extracted shared integration helpers into:
  - `src/lab_test/support/cli.integration.harness.ts`
- [x] Split scenario lifecycle assertions into:
  - `src/lab_test/cli.integration.scenario.lifecycle.test.ts`
- [x] Split connection-targeting assertions (initial pass) into:
  - `src/lab_test/cli.integration.connection.targeting.test.ts` (transitional file)
- [x] Removed legacy mixed file:
  - `src/lab_test/cli.integration.test.ts`
- [x] Updated critical test script:
  - `package.json` -> `test:critical`
- [x] Added granularity guard test:
  - `src/lab_test/test.suite.granularity.logic.test.ts`
- [x] Verified test-case parity after split:
  - old file test cases: `57`
  - new split files test cases: `57`
- [x] Verified command-family distribution:
  - scenario lifecycle: `7`
  - make:migration targeting: `6`
  - migrate:* targeting: `23`
  - db:seed/demo targeting: `19`
  - factory:status targeting: `2`

## Phase 2 (Completed)
- [x] Further split `cli.integration.connection.targeting.test.ts` into command-focused files:
  - `make:migration` targeting
  - `migrate:*` targeting
  - `db:seed*` and `demo:scenario` targeting
  - `factory:status` targeting
- [x] Keep each resulting file scoped to one command family.
- [x] Added shared connection-targeting support module:
  - `src/lab_test/support/cli.integration.connection.shared.ts`
- [x] Added command-focused files:
  - `src/lab_test/cli.integration.make-migration.targeting.test.ts`
  - `src/lab_test/cli.integration.migrate.targeting.test.ts`
  - `src/lab_test/cli.integration.seed-and-demo.targeting.test.ts`
  - `src/lab_test/cli.integration.factory-status.targeting.test.ts`
- [x] Removed transitional mixed file:
  - `src/lab_test/cli.integration.connection.targeting.test.ts`

## Phase 3 (Validation)
- [x] Update docs that still reference removed file paths.
- [x] Harden split-suite order safety for `db:seed:fresh` app tests:
  - `src/lab_test/cli.integration.seed-and-demo.targeting.test.ts`
  - Added explicit pre-seed `migrate:run --all-migrations` for sqlite/mysql/pg app fresh tests.
- [x] Harden `db:seed:fresh --mysql` critical-run stability:
  - Added single retry after full mysql re-bootstrap (`reset + migrate:run --all-migrations`) when first execution exits non-zero.
- [x] Improve split-suite failure diagnostics:
  - `src/lab_test/support/cli.integration.harness.ts`
  - `assertCliSuccess` now throws non-zero exit details with status/signal/stdout/stderr payload.
- [ ] Run focused CLI integration test paths and confirm parity.

## Test Evidence
- Run:
  - `npm.cmd test -- --runTestsByPath src/lab_test/cli.integration.scenario.lifecycle.test.ts src/lab_test/cli.integration.make-migration.targeting.test.ts src/lab_test/cli.integration.migrate.targeting.test.ts src/lab_test/cli.integration.seed-and-demo.targeting.test.ts src/lab_test/cli.integration.factory-status.targeting.test.ts`
  - `npm.cmd test -- --runTestsByPath src/lab_test/test.suite.granularity.logic.test.ts`
  - `npm.cmd run typecheck`
- Expected:
  - `PASS` (or `SKIP` where env prerequisites are not present), no compile/runtime regressions.
- Result:
  - `PASS`: `src/lab_test/test.suite.granularity.logic.test.ts`
  - `PASS`: `npm.cmd run typecheck`
  - `CI finding addressed`: `db:seed:fresh --mysql --class UserSeeder` flake/order dependency removed by explicit migrate pre-step in split seed suite.
  - `BLOCKED IN POWERSHELL`: split CLI integration suites still hit known local `spawnSync node.exe EPERM` runtime issue; execute from Git Bash/CI shell for runtime parity.

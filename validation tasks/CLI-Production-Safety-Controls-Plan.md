# CLI Production Safety Controls Plan

Last updated: 2026-03-06

## Goal
- Add production guardrails for destructive CLI operations.
- Enforce explicit operator intent contract in production:
  - `ELOQUENT_ALLOW_PROD_DESTRUCTIVE=true`
  - `--force`
  - `--yes`
- Add preflight bootstrap validation before `db:seed --all-connections`.

## Scope
- Destructive production guards for:
  - `make:*`
  - `migrate:fresh`
  - `migrate:reset`
  - `db:seed:fresh`
- New preflight command:
  - `db:seed:precheck`
- Automatic preflight gate for:
  - `db:seed --all-connections`

## Implementation Checklist
- [x] Added shared production safety utility:
  - `src/cli/utils/ProductionSafety.ts`
- [x] Added seed bootstrap precheck utility:
  - `src/cli/utils/SeedBootstrapPrecheck.ts`
- [x] Added `db:seed:precheck` command wiring:
  - `src/cli/commands/dbSeedBootstrapPrecheck.ts`
  - `src/cli/eloquent.ts`
- [x] Enforced production guard contract on target commands in `src/cli/eloquent.ts`.
- [x] Added auto-precheck before `db:seed --all-connections`.
- [x] Added/updated tests:
  - `src/lab_test/cli.production.safety.logic.test.ts`
  - `src/lab_test/cli.bootstrap.precheck.logic.test.ts`
  - `src/lab_test/eloquent.cli.commands.testing.logic.test.ts`
  - `src/lab_test/production.readiness.gates.logic.test.ts`

## Test Evidence
- Run:
  - `npm.cmd test -- --runTestsByPath src/lab_test/cli.production.safety.logic.test.ts src/lab_test/cli.bootstrap.precheck.logic.test.ts src/lab_test/eloquent.cli.commands.testing.logic.test.ts src/lab_test/production.readiness.gates.logic.test.ts`
- Expected:
  - `PASS` for all listed suites.
- Result:
  - `PASS` (4/4 suites, 35/35 tests).

# DB Connection Test-Mode Routing Fix Plan

## Goal
Ensure test-mode CLI flows use `DB_TEST_CONNECTION` as source of truth while keeping `DB_CONNECTION` synchronized at runtime for model code paths that read `DB_CONNECTION`.

## Problem Summary
- In test mode, `db:seed --test --pg` could still write to `mysql_test`.
- Root cause: many model paths read `DB_CONNECTION`, while seed commands only switched `DB_TEST_CONNECTION` per selected test connection.

## Scope
- `src/cli/commands/dbSeed.ts`
- `src/cli/commands/dbSeedFresh.ts`
- Regression test coverage in `src/lab_test/`

## Work Plan

### Phase 1: Runtime Fix
- [x] In `dbSeed`, when `test=true`, sync `DB_CONNECTION` to the active test connection for each loop item.
- [x] In `dbSeedFresh`, when `test=true`, sync `DB_CONNECTION` to the active test connection for each loop item.
- [x] Restore original env values after command completion.

### Phase 2: Regression Tests
- [x] Add test ensuring `dbSeed` sets `DB_CONNECTION` and `DB_TEST_CONNECTION` to the same active test connection.
- [x] Add test ensuring `dbSeedFresh` preserves the same sync during fresh+seed cycles.

### Phase 3: Validation
- [x] Run targeted test file.
- [x] Run real CLI check: `db:seed --test --pg --class BlogScenarioSeeder` routes to `pg_test`.

## Evidence
- Test file: `src/lab_test/db.seed.connection.env.logic.test.ts`
- Command:
  - `npm.cmd test -- --runTestsByPath src/lab_test/db.seed.connection.env.logic.test.ts`
  - Result: `PASS` (`2 passed`)
- Runtime check:
  - `npm.cmd run cli -- db:seed --test --pg --class BlogScenarioSeeder`
  - Output includes:
    - `Seeding connection: pg_test`
    - `Creating new pg_test connection...`

## Outcome
- Production/app still follows `DB_CONNECTION`.
- Test mode now correctly tracks selected test connection and keeps `DB_CONNECTION` aligned to prevent cross-driver writes.

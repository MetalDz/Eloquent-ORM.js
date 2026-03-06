# Migration Fixture Baseline Integrity Recovery Plan

## Goal
Repair legacy migration fixture trees where `update_*` exists without matching `create_*` baseline, and lock this invariant with a regression test.

## Problem Summary
- Phase 5 validation exposed MySQL failures during fresh flows:
  - `Table '...posts' doesn't exist` while applying `update_posts_table`.
- Root cause: legacy deleted `create_posts_table` files existed for:
  - `src/app/database/migrations/mysql`
  - `src/test/database/migrations/mysql_test`

## Scope
- `src/app/database/migrations/mysql/20260306084302003_create_posts_table.ts`
- `src/test/database/migrations/mysql_test/20260306075446003_create_posts_table.ts`
- `src/lab_test/migration.files.integrity.logic.test.ts`
- `validation tasks/ORM-Real-Scenario-CLI-Validation-Plan.md`

## Work Plan

### Phase 1: Recover Missing Baselines
- [x] Restore missing app MySQL `create_posts_table` baseline migration.
- [x] Restore missing test MySQL `create_posts_table` baseline migration.

### Phase 2: Add Guard Test
- [x] Add migration-tree integrity test:
  - every connection directory with `update_<table>` must also include `create_<table>`.

### Phase 3: Re-run Phase 5
- [x] Execute Phase 5 commands again with valid seeder class (`BlogScenarioSeeder`).
- [x] Record final pass/fail evidence.

## Progress Log
- `2026-03-06`: Plan created.
- `2026-03-06`: Recovered missing MySQL/MySQL-test `create_posts_table` baseline migration files.
- `2026-03-06`: Added migration baseline integrity regression test.
- `2026-03-06`: Confirmed Phase 5 passes after recovery + clean bootstrap for all-connections seed checks.

## Evidence
- Regression tests:
  - `npm.cmd test -- --runTestsByPath src/lab_test/make.migration.append.only.logic.test.ts src/lab_test/migration.files.integrity.logic.test.ts src/lab_test/make.migration.fk.logic.test.ts`
  - Result: `PASS` (3 suites, 6 tests).
- Bootstrap checks for all-connections seeding:
  - `migrate:fresh --all-connections --all-migrations --force` -> exit `0`
  - `db:seed --all-connections --class BlogScenarioSeeder` -> exit `0`
  - `migrate:fresh --test --all-connections --all-migrations --force` -> exit `0`
  - `db:seed --test --all-connections --class BlogScenarioSeeder` -> exit `0`

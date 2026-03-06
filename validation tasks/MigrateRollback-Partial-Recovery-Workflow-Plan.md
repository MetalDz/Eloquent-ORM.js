# MigrateRollback Partial Recovery Workflow Plan

Last updated: 2026-03-06

## Goal
- Close Production Readiness Step 2 remaining items:
  - partial rollback recovery runbook
  - integration test for partial rollback recovery workflow

## Implementation Checklist
- [x] Add operator runbook with concrete commands/steps:
  - `src/documentation/migration-rollback-recovery-runbook.md`
- [x] Add integration-style workflow test:
  - `src/lab_test/migrate.rollback.partial.recovery.logic.test.ts`

## Test Evidence
- Run:
  - `npm.cmd test -- --runTestsByPath src/lab_test/migrate.rollback.logic.test.ts src/lab_test/migrate.rollback.partial.recovery.logic.test.ts`
- Expected:
  - `PASS`
- Result:
  - `PASS` (2/2 suites).

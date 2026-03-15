# LTS Phase 5 DemoScenario Coverage Plan

Last updated: 2026-03-15  
Status: COMPLETED

## Goal
- Raise coverage for `src/cli/commands/demoScenario.ts`, especially the remaining SQL-only branches around count normalization, explicit `user` selection, and post comment lookup through `inClause(...)`.

## Delivered
- Added a dedicated LTS regression at `src/lab_test/lts.phase5.demo-scenario-coverage.logic.test.ts`.
- Covered SQL count normalization where `toNumber(...)` receives:
  - a string count
  - an undefined count
- Covered the explicit `options.user` branch.
- Covered SQL post filtering where:
  - mixed post ids are reduced to numeric ids only
  - `adapter.inClause(...)` is used
  - post comment counts are logged from the query result

## Validation
- `npm.cmd test -- --runInBand --runTestsByPath src/lab_test/lts.phase5.demo-scenario-coverage.logic.test.ts src/lab_test/orm.hardening.phase5.demo-scenario-operations.logic.test.ts src/lab_test/nosql.phase15.cli-scenario-runtime.logic.test.ts src/lab_test/nosql.phase4.validation-and-gates.logic.test.ts src/lab_test/nosql.phase8.demo-and-factory-status.logic.test.ts src/lab_test/nosql.cli.phase3.parity.logic.test.ts src/lab_test/lts.phase5.coverage-to-100.logic.test.ts`
- `npm.cmd test -- --runInBand --coverage --coverageReporters=text --collectCoverageFrom=src/cli/commands/demoScenario.ts --runTestsByPath src/lab_test/lts.phase5.demo-scenario-coverage.logic.test.ts src/lab_test/orm.hardening.phase5.demo-scenario-operations.logic.test.ts src/lab_test/nosql.phase15.cli-scenario-runtime.logic.test.ts src/lab_test/nosql.phase4.validation-and-gates.logic.test.ts src/lab_test/nosql.phase8.demo-and-factory-status.logic.test.ts src/lab_test/nosql.cli.phase3.parity.logic.test.ts`
- `npm.cmd run typecheck`

## Focused Snapshot
- Focused `demoScenario.ts` snapshot after this slice:
  - Statements: `100%`
  - Branches: `100%`
  - Functions: `100%`
  - Lines: `100%`

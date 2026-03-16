# LTS Phase 5 MakeModel Coverage Plan

Last updated: 2026-03-16 10:07  
Status: COMPLETED

## Goal
- Close the remaining LTS Phase 5 coverage gap in `src/cli/commands/makeModel.ts`.

## Scope
- `src/cli/commands/makeModel.ts`
- `src/lab_test/lts.phase5.make-model-coverage.logic.test.ts`

## Targeted Gap
- the Mongo `--with-migration` handoff path that delegates directly to `makeMigration(...)`
- non-empty `extraTables` and `rollbackExtraTables` callback paths in generated SQL migration content

## Completion Notes
- No runtime refactor was needed.
- Added a focused regression that locks:
  - Mongo model generation still writes the model scaffold
  - `resolveConnectionName(...)` drives the migration target
  - Mongo `withMigration` delegates to `makeMigration(...)`
  - SQL `SchemaBuilder.toCreateSQL(...)` is skipped on the Mongo path
  - SQL migration content includes extra `up` and `down` statements when helper arrays are present

## Validation
- `npm.cmd test -- --runInBand --runTestsByPath src/lab_test/lts.phase5.make-model-coverage.logic.test.ts src/lab_test/branch.coverage.100.phase7.make-model.logic.test.ts src/lab_test/branch.coverage.100.phase16.make-model-extra.logic.test.ts src/lab_test/branch.coverage.100.phase31.make-model-migration.helpers.logic.test.ts src/lab_test/branch.coverage.70.cli-commands.logic.test.ts src/lab_test/nosql.cli.phase3.parity.logic.test.ts src/lab_test/lts.phase5.coverage-to-100.logic.test.ts`
- `npm.cmd test -- --runInBand --coverage --coverageReporters=text --collectCoverageFrom=src/cli/commands/makeModel.ts --runTestsByPath src/lab_test/lts.phase5.make-model-coverage.logic.test.ts src/lab_test/branch.coverage.100.phase7.make-model.logic.test.ts src/lab_test/branch.coverage.100.phase16.make-model-extra.logic.test.ts src/lab_test/branch.coverage.100.phase31.make-model-migration.helpers.logic.test.ts src/lab_test/branch.coverage.70.cli-commands.logic.test.ts src/lab_test/nosql.cli.phase3.parity.logic.test.ts`
- `npm.cmd run typecheck`

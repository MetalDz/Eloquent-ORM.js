# LTS Phase 5 MakeMigration Coverage Plan

Last updated: 2026-03-15  
Status: COMPLETED

## Goal
- Raise coverage for `src/cli/commands/makeMigration.ts`, especially the Mongo generation branches, no-op/unsupported-driver paths, unchanged-body detection, and dead branch cleanup.

## Delivered
- Added a dedicated LTS regression at `src/lab_test/lts.phase5.make-migration-coverage.logic.test.ts`.
- Removed two dead `Baseline CREATE already exists ...` branches that could not execute because `prefix` is derived from `needsBaselineCreate`.
- Simplified Mongo index emission so generated index definitions always carry explicit options, removing an unreachable `createIndex(...)` no-options branch.
- Covered Mongo generation for:
  - duplicate `deleted_at_idx` dedupe
  - primary / unique / index column index synthesis
  - belongsTo foreign-key index synthesis
  - embedded pivot collection creation and rollback
  - separate pivot migration generation
  - soft-delete normalization through `softDeletes: true`
  - no-work skip when an existing baseline create is already present
  - unchanged update migration detection
- Covered unsupported-driver skip behavior.
- Covered SQL unchanged update migration detection.

## Validation
- `npm.cmd test -- --runInBand --runTestsByPath src/lab_test/lts.phase5.make-migration-coverage.logic.test.ts src/lab_test/migration.schema.ascii-normalization.logic.test.ts src/lab_test/branch.coverage.100.phase11.make-migration.logic.test.ts src/lab_test/branch.coverage.100.phase15.make-migration-extra.logic.test.ts src/lab_test/branch.coverage.100.phase3.logic.test.ts src/lab_test/branch.coverage.100.phase7.make-migration.logic.test.ts src/lab_test/branch.coverage.70.cli-commands.logic.test.ts src/lab_test/nosql.cli.phase3.parity.logic.test.ts src/lab_test/lts.phase5.coverage-to-100.logic.test.ts`
- `npm.cmd test -- --runInBand --coverage --coverageReporters=text --collectCoverageFrom=src/cli/commands/makeMigration.ts --runTestsByPath src/lab_test/lts.phase5.make-migration-coverage.logic.test.ts src/lab_test/migration.schema.ascii-normalization.logic.test.ts src/lab_test/branch.coverage.100.phase11.make-migration.logic.test.ts src/lab_test/branch.coverage.100.phase15.make-migration-extra.logic.test.ts src/lab_test/branch.coverage.100.phase3.logic.test.ts src/lab_test/branch.coverage.100.phase7.make-migration.logic.test.ts src/lab_test/branch.coverage.70.cli-commands.logic.test.ts src/lab_test/nosql.cli.phase3.parity.logic.test.ts`
- `npm.cmd run typecheck`

## Focused Snapshot
- Focused `makeMigration.ts` snapshot after this slice:
  - Statements: `100%`
  - Branches: `100%`
  - Functions: `100%`
  - Lines: `100%`

# LTS Phase 5 Coverage Continuation Report

Status: IN PROGRESS
Last updated: 2026-03-22

## Goal

Track the remaining real source work required to reach `100%` coverage under the Docker `v8` coverage provider without excluding files, lowering thresholds, or inflating the denominator.

## Current source of truth

- Focused Docker `v8` report:
  - `coverage/final-gap-summary-6.json`
  - `coverage/final-gap-final-6.json`

## Current focused baseline

- Statements: `90.9% (1958/2154)`
- Branches: `88.15% (387/439)`
- Functions: `90.32% (84/93)`
- Lines: `90.9% (1958/2154)`

## Completed in the current continuation

- `src/cli/eloquent.ts` reached `100%`
- `src/core/cache/CacheFallbackManager.ts` reached `100%` branch coverage
- `src/cli/utils/migrations/MigrationLockStrategy.ts` was reduced to 3 remaining branches
- targeted Docker coverage environment contract was stabilized
- focused Docker `v8` reruns are now reproducible

## Remaining files in ordered execution sequence

1. `src/cli/utils/migrations/MigrationLockStrategy.ts`
2. `src/cli/utils/migrations/MongoMigrationTracker.ts`
3. `src/cli/commands/migrateStatus.ts`
4. `src/cli/commands/migrateRun.ts`
5. `src/cli/commands/migrateRollback.ts`
6. `src/cli/commands/migrateFresh.ts`

## Exact remaining branch hotspots

### `src/cli/utils/migrations/MigrationLockStrategy.ts`

- remaining branch lines: `108`, `120`, `139`
- current focused file status:
  - statements `98.15%`
  - branches `94.44%`
  - functions `90%`
  - lines `98.15%`

### `src/cli/utils/migrations/MongoMigrationTracker.ts`

- remaining branch lines: `70`, `100`, `108`, `116`, `142`, `183`, `224`, `333`, `360`, `387`
- current focused file status:
  - statements `87.65%`
  - branches `86.84%`
  - functions `91.66%`
  - lines `87.65%`

### `src/cli/commands/migrateStatus.ts`

- remaining branch lines: `104`, `118`, `128`, `138`, `139`, `140`, `144`, `153`, `158`
- current focused file status:
  - statements `95.8%`
  - branches `80.43%`
  - functions `100%`
  - lines `95.8%`

### `src/cli/commands/migrateRun.ts`

- remaining branch lines: `148`, `155`, `251`, `286`, `289`, `303`, `321`, `329`, `331`, `340`, `366`, `381`, `398`
- current focused file status:
  - statements `93.93%`
  - branches `82.92%`
  - functions `100%`
  - lines `93.93%`

### `src/cli/commands/migrateRollback.ts`

- remaining branch lines: `121`, `231`, `280`, `294`, `338`, `345`, `360`
- current focused file status:
  - statements `86.45%`
  - branches `90.78%`
  - functions `91.66%`
  - lines `86.45%`

### `src/cli/commands/migrateFresh.ts`

- remaining branch lines: `28`, `64`, `74`, `85`, `131`, `133`, `134`, `143`, `156`
- current focused file status:
  - statements `75.77%`
  - branches `64%`
  - functions `80%`
  - lines `75.77%`

## To-do list

- [ ] close the 3 remaining `MigrationLockStrategy.ts` branches first
- [ ] take `MongoMigrationTracker.ts` to `100%` next
- [ ] close `migrateStatus.ts` cleanup and unsupported-path branches
- [ ] close `migrateRun.ts` model-filter, no-dir, no-op, dry-run, audit, and exit branches
- [ ] close `migrateRollback.ts` remaining Mongo/SQL rollback branches
- [ ] close `migrateFresh.ts` remaining cleanup and unsupported-driver branches
- [ ] rebuild `coverage-debug` before each Docker verification pass after source edits
- [ ] rerun the focused Docker `v8` subset after each slice
- [ ] rerun full Docker `v8` coverage only after the focused subset reaches `100%`
- [ ] do not update historical completed plans to represent this new residual phase

## Validation artifact

- `src/lab_test/lts.phase5.coverage-continuation-report.logic.test.ts`

## Rules

- use only source-targeted tests
- keep Docker `v8` as the source of truth
- do not lower thresholds
- do not exclude files from collection
- do not mark complete until the focused residual subset is `100%`

# Branch Coverage 100% Execution Plan

Last updated: 2026-03-08
Status: IN PROGRESS (Phases 1-3 completed)

## Goal
- Raise global branch coverage from `70.36%` to `100%`.
- Keep this as real behavioral coverage (no fake assertions).
- Track progress with explicit task docs and paired test files.

## Baseline
- Source of truth: `coverage/coverage-summary.json`
- Current global branches:
  - Covered: `1522`
  - Total: `2163`
  - Percent: `70.36%`
- Gap to 100%:
  - Remaining uncovered branches: `641`

## Constraints
- Local PowerShell/host policy can cause `spawnSync ... node.exe EPERM` in CLI integration tests.
- Coverage must be validated in the same execution mode used by CI.
- Prefer deterministic unit/logic branch closures first, then heavy integration branches.

## Ordered Phases

### Phase 1: Low-Hanging Deterministic Branches
- [x] Close easy branch gaps in utility/core modules with focused tests:
  - `src/core/cache/CacheManager.ts`
  - `src/core/schema/SQLDialect.ts`
  - `src/core/orm/mixins/utils/ModelRegistry.ts`
  - `src/cli/utils/StructuredLogger.ts` (remaining branches)
- [x] Add:
  - `src/lab_test/branch.coverage.100.phase1.logic.test.ts`
- Evidence (`2026-03-08`):
  - `npm.cmd test -- --runInBand --runTestsByPath src/lab_test/branch.coverage.100.plan.logic.test.ts src/lab_test/branch.coverage.100.phase1.logic.test.ts src/lab_test/cli.audit.trail.logic.test.ts`
  - Result: PASS (`11/11`)
  - Latest all-green coverage summary: Branches `70.36%` (`1522/2163`)
  - All-green validation run:
    - Test Suites: `67 passed`, `67 total`
    - Tests: `391 passed`, `23 skipped`, `414 total`

### Phase 2: Mid-Complexity Core Branch Trees
- [x] Increase coverage for:
  - `src/core/connection/DriverAdapter.ts`
  - `src/core/connection/ConnectionFactory.ts`
  - `src/core/orm/Relation.ts`
  - relation classes (`BelongsTo`, `HasOne`, `HasMany`, `BelongsToMany`, `Morph*`)
- [x] Add:
  - `src/lab_test/branch.coverage.100.phase2.logic.test.ts`
- Evidence (`2026-03-08`):
  - `npm.cmd test -- --runInBand --runTestsByPath src/lab_test/branch.coverage.100.phase2.logic.test.ts`
  - Result: PASS (`11/11`)
  - Focused module validation:
    - `npm.cmd test -- --runInBand --coverage --coverageReporters=text --collectCoverageFrom=src/core/connection/DriverAdapter.ts --collectCoverageFrom=src/core/connection/ConnectionFactory.ts --collectCoverageFrom=src/core/orm/Relation.ts --collectCoverageFrom=src/core/orm/relations/BelongsTo.ts --collectCoverageFrom=src/core/orm/relations/HasOne.ts --collectCoverageFrom=src/core/orm/relations/HasMany.ts --collectCoverageFrom=src/core/orm/relations/BelongsToMany.ts --collectCoverageFrom=src/core/orm/relations/MorphTo.ts --collectCoverageFrom=src/core/orm/relations/MorphOne.ts --collectCoverageFrom=src/core/orm/relations/MorphMany.ts src/lab_test/branch.coverage.100.phase2.logic.test.ts src/lab_test/driver.adapter.logic.test.ts src/lab_test/connection.factory.race.logic.test.ts src/lab_test/connection.factory.alias.lifecycle.logic.test.ts src/lab_test/relations.logic.test.ts`
  - Focused branch result (Phase 2 module subset): `81%`
  - Full-suite snapshot in this shell:
    - `npm.cmd run test:coverage` -> global branches `72.39%` (`1566/2163`)
    - Run status: non-green in this environment due known `spawnSync ... node.exe EPERM` on CLI spawn tests.

### Phase 3: CLI Command Branch Closure
- [x] Deep branch tests for low-covered command files:
  - `src/cli/commands/makeModel.ts`
  - `src/cli/commands/makeMigration.ts`
  - `src/cli/commands/migrateStatus.ts`
  - `src/cli/commands/migrateRollback.ts`
- [x] Add:
  - `src/lab_test/branch.coverage.100.phase3.logic.test.ts`
- Evidence (`2026-03-08`):
  - `npm.cmd test -- --runInBand --runTestsByPath src/lab_test/branch.coverage.100.phase3.logic.test.ts`
  - Result: PASS (`8/8`)
  - Focused command-module validation:
    - `npm.cmd test -- --runInBand --coverage --coverageReporters=text --collectCoverageFrom=src/cli/commands/makeModel.ts --collectCoverageFrom=src/cli/commands/makeMigration.ts --collectCoverageFrom=src/cli/commands/migrateStatus.ts --collectCoverageFrom=src/cli/commands/migrateRollback.ts src/lab_test/branch.coverage.70.cli-commands.logic.test.ts src/lab_test/make.model.rollback.logic.test.ts src/lab_test/make.migration.append.only.logic.test.ts src/lab_test/make.migration.fk.logic.test.ts src/lab_test/migrate.rollback.logic.test.ts src/lab_test/migrate.rollback.partial.recovery.logic.test.ts src/lab_test/app.migration.path.logic.test.ts src/lab_test/branch.coverage.100.phase3.logic.test.ts`
  - Focused command subset branch result: `68.62%` (up from `44.77%` baseline in the same subset).

### Phase 4: Migration Tracker and Locking Edge Branches
- [ ] Close remaining branch paths in:
  - `src/cli/utils/migrations/MigrationLockStrategy.ts`
  - `src/cli/utils/migrations/MigrationTracker.ts`
- [ ] Add:
  - `src/lab_test/branch.coverage.100.phase4.logic.test.ts`

### Phase 5: Hard-to-Reach/Environment Branches
- [ ] Address residual branches requiring:
  - spawn/permission fallback behavior
  - explicit error-path simulation
  - potentially small runtime refactors for testability
- [ ] Add:
  - `src/lab_test/branch.coverage.100.phase5.logic.test.ts`

## Quality Gates
- Per phase:
  - `npm run typecheck`
  - `npm run build`
  - `npm run test:coverage`
- Track both:
  - global branch percentage
  - absolute remaining uncovered branches

## Done Criteria
- [ ] Global branches: `100.00%`
- [ ] No skipped branch suites used to fake closure
- [ ] CI path and local path both reproduce 100% result
- [ ] Plan + phase test files are all present and active

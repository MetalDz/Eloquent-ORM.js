# Branch Coverage 100% Execution Plan

Last updated: 2026-03-08
Status: IN PROGRESS (Phase 1 started)

## Goal
- Raise global branch coverage from `70.45%` to `100%`.
- Keep this as real behavioral coverage (no fake assertions).
- Track progress with explicit task docs and paired test files.

## Baseline
- Source of truth: `coverage/coverage-summary.json`
- Current global branches:
  - Covered: `1524`
  - Total: `2163`
  - Percent: `70.45%`
- Gap to 100%:
  - Remaining uncovered branches: `639`

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
  - Latest coverage summary: Branches `70.64%` (`1528/2163`)

### Phase 2: Mid-Complexity Core Branch Trees
- [ ] Increase coverage for:
  - `src/core/connection/DriverAdapter.ts`
  - `src/core/connection/ConnectionFactory.ts`
  - `src/core/orm/Relation.ts`
  - relation classes (`BelongsTo`, `HasOne`, `HasMany`, `BelongsToMany`, `Morph*`)
- [ ] Add:
  - `src/lab_test/branch.coverage.100.phase2.logic.test.ts`

### Phase 3: CLI Command Branch Closure
- [ ] Deep branch tests for low-covered command files:
  - `src/cli/commands/makeModel.ts`
  - `src/cli/commands/makeMigration.ts`
  - `src/cli/commands/migrateStatus.ts`
  - `src/cli/commands/migrateRollback.ts`
- [ ] Add:
  - `src/lab_test/branch.coverage.100.phase3.logic.test.ts`

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

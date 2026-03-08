# Branch Coverage 70% Execution Plan

Branch coverage measures test thoroughness, not full code quality.

It tells you how many decision paths (if/else, switch cases, error paths) your tests execute.
Higher branch coverage usually means better bug resistance.
But it does not guarantee:
good architecture
readable code
performance
security by itself
So: branch coverage is a strong quality signal, but not the whole definition of code quality.

Last updated: 2026-03-08
Status: OPEN

## Goal
- Raise global branch coverage for all core logic from `46.41%` to `70%`.
- Keep this as real logic coverage, not synthetic assertions.
- Execute in ordered phases to avoid regressions and rework.

## Baseline
- Source of truth: `coverage/coverage-summary.json`
- Current branch coverage:
  - Covered: `1004`
  - Total: `2163`
  - Percent: `46.41%`
- Branch gap to close:
  - Target covered at 70%: `1515`
  - Additional covered branches needed: `511`

## Constraints
- Run coverage in CI/Git Bash style shell when local PowerShell causes `spawnSync ... node.exe EPERM`.
- Prioritize deterministic branch points first:
  - pure utilities
  - cache and connection branch trees with mocks
  - CLI command decision trees
  - ORM mixins and migration safety paths

## Ordered Phases

### Phase 0: Stable Measurement
- [ ] Keep a single baseline run command:
  - `npm run test:coverage`
- [ ] Record branch total/covered before each phase.
- [ ] Update this plan with observed delta after each phase.
- Target after phase: keep baseline stable and reproducible.

### Phase 1: Utility Branch Closures (High ROI)
- [x] Add branch tests for:
  - `src/cli/utils/TemplateEngine.ts`
  - `src/cli/utils/PathMap.ts`
  - `src/cli/utils/ImportResolver.ts`
  - `src/cli/utils/typescript/TypeScriptCompiler.ts`
  - `src/cli/utils/typescript/tsRuntime.ts`
- [x] Cover error and fallback branches (missing files, disabled TS runtime, invalid paths).
- [ ] Confirm global target after phase: `>= 52%` branches.
  - Phase-1 focused run evidence:
    - `npm.cmd test -- --runInBand --coverage --runTestsByPath src/lab_test/branch.coverage.70.utilities.logic.test.ts`
    - Focused summary: Branches `60.31%` (`76/126`)
  - Global confirmation remains pending full `test:coverage` run in a shell without local `spawnSync ... node.exe EPERM` constraints.

### Phase 2: Cache + Connection Logic
- [ ] Add branch tests for:
  - `src/core/cache/CacheFallbackManager.ts`
  - `src/core/cache/CacheRegistry.ts`
  - `src/core/cache/CacheAnalytics.ts`
  - `src/core/cache/setupCache.ts`
  - `src/core/cache/drivers/FileCacheDriver.ts`
  - `src/core/cache/drivers/MemoryCacheDriver.ts`
  - `src/core/cache/drivers/MemcachedCacheDriver.ts` (mocked, no daemon requirement)
  - `src/core/connection/DatabaseConnection.ts`
- [ ] Cover all fallback, unavailable driver, miss/hit, and error branches.
- Target after phase: `>= 58%` branches.

### Phase 3: CLI Command Branch Trees
- [ ] Add branch tests for:
  - `src/cli/commands/makeModel.ts`
  - `src/cli/commands/makeMigration.ts`
  - `src/cli/commands/migrateFresh.ts`
  - `src/cli/commands/dbSeed.ts`
  - `src/cli/commands/cacheClear.ts`
  - `src/cli/commands/cacheStats.ts`
- [ ] Cover connection flag conflicts, force/non-force, no-op paths, and failure exits.
- Target after phase: `>= 63%` branches.

### Phase 4: ORM Runtime/Mixin Branches
- [ ] Add branch tests for:
  - `src/core/orm/mixins/QueryCacheMixin.ts`
  - `src/core/orm/mixins/CastsMixin.ts`
  - `src/core/orm/mixins/EagerLoadingMixin.ts`
  - `src/core/orm/mixins/MorphableMixin.ts`
  - `src/core/orm/mixins/ScopeMixin.ts`
  - `src/core/model/BaseModel.ts`
- [ ] Cover null/undefined inputs, invalid cast paths, eager relation edge cases, and cache bypass paths.
- Target after phase: `>= 67%` branches.

### Phase 5: Migration/Schema Safety Branches
- [ ] Add branch tests for:
  - `src/cli/utils/migrations/MigrationLockStrategy.ts`
  - `src/cli/utils/migrations/MigrationTracker.ts`
  - `src/core/schema/SchemaValidator.ts`
- [ ] Cover lock acquire/release failures, stale migration relink/prune branches, schema validation edge paths.
- Target after phase: `>= 70%` branches.

## Required Test Files (Execution Backlog)
- `src/lab_test/branch.coverage.70.utilities.logic.test.ts`
- `src/lab_test/branch.coverage.70.cache-and-connection.logic.test.ts`
- `src/lab_test/branch.coverage.70.cli-commands.logic.test.ts`
- `src/lab_test/branch.coverage.70.orm-mixins.logic.test.ts`
- `src/lab_test/branch.coverage.70.migration-and-schema.logic.test.ts`

## Quality Gates
- Phase completion gate:
  - `npm run typecheck`
  - `npm run build`
  - `npm run test:coverage`
- Coverage threshold ratchet (global branches):
  - Step 1: 50
  - Step 2: 55
  - Step 3: 60
  - Step 4: 65
  - Step 5: 70

## Done Criteria
- [ ] Global branch coverage reaches `>= 70%`.
- [ ] No reduction in statements/lines/functions trends.
- [ ] CI gate is green with deterministic coverage runs.
- [ ] All five phase test files exist and are active (not only TODO markers).

# LTS Phase 5 Cache Runtime Coverage Plan

Last updated: 2026-03-15  
Status: COMPLETED

## Goal
- Close the remaining LTS Phase 5 cache runtime coverage gaps in:
  - `src/core/cache/CacheFallbackManager.ts`
  - `src/core/cache/drivers/FileCacheDriver.ts`

## Scope
- `src/core/cache/CacheFallbackManager.ts`
- `src/core/cache/drivers/FileCacheDriver.ts`
- `src/lab_test/lts.phase5.cache-runtime-coverage.logic.test.ts`

## Targeted Gaps
- `CacheFallbackManager.delete(...)` and `clear(...)` wrapper paths
- `FileCacheDriver` constructor mkdir failure swallow path
- `FileCacheDriver` expired-entry unlink failure swallow path
- `FileCacheDriver.clear()` unlink failure swallow path

## Completion Notes
- No runtime refactor was required.
- Added focused regressions for the remaining wrapper/callback counters instead of expanding the broader cache suites.
- The slice keeps cache runtime behavior unchanged while making the failure-swallow semantics explicit.

## Validation
- `npm.cmd test -- --runInBand --runTestsByPath src/lab_test/lts.phase5.cache-runtime-coverage.logic.test.ts src/lab_test/branch.coverage.70.cache-and-connection.logic.test.ts src/lab_test/branch.coverage.100.phase5.cache-hooks.logic.test.ts src/lab_test/branch.coverage.100.phase32.cache-query-morph-redactor.logic.test.ts src/lab_test/branch.coverage.100.phase34.cache-edge.logic.test.ts src/lab_test/cache.commands.logic.test.ts src/lab_test/branch.coverage.70.cli-commands.logic.test.ts src/lab_test/lts.phase5.coverage-to-100.logic.test.ts`
- `npm.cmd test -- --runInBand --coverage --coverageReporters=text --collectCoverageFrom=src/core/cache/CacheFallbackManager.ts --collectCoverageFrom=src/core/cache/drivers/FileCacheDriver.ts --runTestsByPath src/lab_test/lts.phase5.cache-runtime-coverage.logic.test.ts src/lab_test/branch.coverage.70.cache-and-connection.logic.test.ts src/lab_test/branch.coverage.100.phase5.cache-hooks.logic.test.ts src/lab_test/branch.coverage.100.phase32.cache-query-morph-redactor.logic.test.ts src/lab_test/branch.coverage.100.phase34.cache-edge.logic.test.ts src/lab_test/cache.commands.logic.test.ts src/lab_test/branch.coverage.70.cli-commands.logic.test.ts`
- `npm.cmd run typecheck`

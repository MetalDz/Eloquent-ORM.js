# LTS Phase 5 tsRuntime Coverage Plan

Last updated: 2026-03-16 09:51  
Status: COMPLETED

## Goal
- Close the remaining LTS Phase 5 coverage gap in `src/cli/utils/typescript/tsRuntime.ts`.

## Scope
- `src/cli/utils/typescript/tsRuntime.ts`
- `src/lab_test/lts.phase5.tsruntime-coverage.logic.test.ts`

## Targeted Gaps
- bare-module fallback through `fallbackRequire(...)`
- missing local import fallback when no `.ts` / `.js` candidate exists
- workspace `.ts` direct-require branch when runtime registration is available
- local `.js` resolution through `resolveExistingModulePath(...)`
- cached transpiled module reload path

## Completion Notes
- Added an explicit in-memory cache for transpiled TypeScript modules so repeated manual loads behave predictably.
- Added a focused regression that locks:
  - non-local requests falling back to Node's normal module resolver
  - missing local requests falling back to Node's normal module error
  - workspace `.ts` imports being required directly when ts-node is active
  - extensionless local `.js` imports resolving through the local override
  - repeated temp-module loads returning the cached transpiled exports

## Validation
- `npm.cmd test -- --runInBand --runTestsByPath src/lab_test/lts.phase5.tsruntime-coverage.logic.test.ts src/lab_test/orm.hardening.phase3.tsruntime-transpile-fallback.logic.test.ts src/lab_test/tsruntime.absolute-temp-load.logic.test.ts src/lab_test/branch.coverage.100.phase33.relations-tsruntime.logic.test.ts src/lab_test/lts.phase5.coverage-to-100.logic.test.ts`
- `npm.cmd test -- --runInBand --coverage --coverageReporters=text --collectCoverageFrom=src/cli/utils/typescript/tsRuntime.ts --runTestsByPath src/lab_test/lts.phase5.tsruntime-coverage.logic.test.ts src/lab_test/orm.hardening.phase3.tsruntime-transpile-fallback.logic.test.ts src/lab_test/tsruntime.absolute-temp-load.logic.test.ts src/lab_test/branch.coverage.100.phase33.relations-tsruntime.logic.test.ts`
- `npm.cmd run typecheck`

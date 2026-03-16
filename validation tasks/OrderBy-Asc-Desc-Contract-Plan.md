# OrderBy Asc Desc Contract Plan

Last updated: 2026-03-16 11:07  
Status: COMPLETED

## Goal
- Lock the safe-finder `orderBy(...)` contract so the ORM explicitly supports both `asc` and `desc`.

## Scope
- `src/core/model/SafeFinder.ts`
- `src/lab_test/orderby.asc-desc.contract.logic.test.ts`

## Completion Notes
- No runtime fix was required because `SafeFinder.orderBy(...)` already supports:
  - default `asc`
  - explicit `desc`
  - invalid-direction rejection
- Added a focused regression that exercises the public model API path instead of only indirect coverage.

## Validation
- `npm.cmd test -- --runInBand --runTestsByPath src/lab_test/orderby.asc-desc.contract.logic.test.ts src/lab_test/safe.finder.api.runtime.logic.test.ts`
- `npm.cmd run typecheck`

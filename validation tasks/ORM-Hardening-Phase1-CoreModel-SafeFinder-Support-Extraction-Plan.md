# ORM Hardening Phase 1: CoreModel Safe Finder Support Extraction Plan

Last updated: 2026-03-14  
Status: COMPLETED

## Goal
- Extract the remaining `CoreModel` safe-finder factory/setup logic into an explicit helper seam.

## Scope
- Move safe-finder query construction out of `src/core/model/CoreModel.ts`.
- Move repeated safe-finder filter-application loops out of `src/core/model/CoreModel.ts`.
- Keep the public `CoreModel` safe-finder API unchanged.

## Files
- `src/core/model/CoreModelSafeFinderSupport.ts`
- `src/core/model/CoreModel.ts`
- `src/lab_test/orm.hardening.phase1.coremodel-safefinder-support.logic.test.ts`

## Acceptance Criteria
- `CoreModel` no longer constructs `new SafeFinderQuery(...)` inline.
- Repeated safe-finder filter loops no longer live in `CoreModel`.
- Existing `where/get/first/findAllBy/existsBy` behavior stays unchanged.

## Validation
- Focused Jest coverage for the extracted helper seam and Phase 1 boundary tests.
- `npm run typecheck`

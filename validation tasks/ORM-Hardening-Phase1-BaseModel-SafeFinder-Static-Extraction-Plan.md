# ORM Hardening Phase 1: BaseModel Safe Finder Static Extraction Plan

Last updated: 2026-03-14  
Status: COMPLETED

## Goal
- Extract the `BaseModel` static safe-finder delegation block into an explicit model-layer seam.

## Scope
- Move the static `where/with/active/inactive/published/orderBy/limit/get/first/findBy/findOneBy/findAllBy/existsBy` delegation block out of `src/core/model/BaseModel.ts`.
- Keep the public `BaseModel`, `SqlModel`, and `MongoModel` runtime surface unchanged.
- Preserve existing generated-model inheritance behavior.

## Files
- `src/core/model/BaseModelSafeFinderStatics.ts`
- `src/core/model/BaseModel.ts`
- `src/lab_test/orm.hardening.phase1.basemodel-safefinder-statics.logic.test.ts`

## Acceptance Criteria
- `BaseModel` no longer owns the full static safe-finder delegation block inline.
- The extracted seam is explicit and reusable.
- Existing runtime inheritance tests for generated SQL/Mongo models continue to pass.

## Validation
- Focused Jest coverage for the extracted seam and existing Phase 1 runtime locks.
- `npm run typecheck`

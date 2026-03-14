# ORM Hardening Phase 5: ModelIntrospector Operations Plan

Last updated: 2026-03-14  
Status: COMPLETED

## Goal
- Harden `src/cli/utils/ModelIntrospector.ts` so generator-side model analysis is deterministic and directly covered.

## Scope
- Cover missing model-file failure.
- Cover missing exported model-class failure.
- Cover field, relation, feature, and mixin extraction from a loaded schema.
- Tolerate module-cache misses before `loadModule()` executes.

## Implemented
- Added a small cache-clearing guard so `analyze()` does not fail when `require.resolve()` misses before dynamic loading.
- Added a dedicated runtime suite for missing-file, missing-export, and full schema analysis behavior.

## Acceptance Criteria
- `analyze()` throws a clear error when the model file is missing.
- `analyze()` throws a clear error when the expected class export is missing.
- `analyze()` extracts non-system fields, relations, and feature flags correctly from a valid schema.
- Cache invalidation does not become the reason analysis fails when the model file exists.

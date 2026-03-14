# ORM Hardening Phase 4: Read Path and Persistence Plan

Last updated: 2026-03-14  
Status: COMPLETED

## Goal
- Stabilize the public read/write model surface so filtering, eager loading, serialization, and instance persistence are reliable across SQL and `mongo`.

## Scope
- Harden:
  - `SafeFinder`
  - eager loading on finder results
  - default serialization on `BaseModel`
  - `fill()`
  - `save()`
  - `patch()`
  - `delete()` / `restore()` consistency
- Keep schema validation and parameter safety intact on the read path.

## Current Hotspots
- `src/core/model/SafeFinder.ts` (`321` lines)
- `src/core/model/CoreModel.ts` still owns a large share of persistence behavior.
- Read-path maturity now depends on alignment between safe finder, relation loading, and instance state.

## Non-Goals
- No open-ended raw query builder.
- No weakening of schema validation or SQL placeholder safety.
- No split API where SQL gets a richer public read path than `mongo`.

## Proposed Work Slices
- [x] Keep safe finder restricted to schema-validated fields.
- [x] Ensure eager-loaded results serialize correctly through `toObject()` / `toJSON()`.
- [x] Keep instance persistence dirty-tracking explicit and testable.
- [x] Keep soft-delete and restore flows compatible with persisted instance state.
- [x] Extend real-model integration tests across SQL and `mongo`.

## Acceptance Criteria
- `where`, `first`, `get`, `limit`, `orderBy`, `with`, `active`, `inactive`, and `published` remain safe and deterministic.
- `toObject()` / `toJSON()` are available on normal `BaseModel` descendants.
- `fill()`, `save()`, and `patch()` work on real SQL and Mongo-backed models.
- Soft-delete and restore flows remain compatible with the newer instance-persistence path.
- Read-path changes are covered by both contract and runtime tests.

## Validation Strategy
- Contract test for this plan file.
- Focused safe-finder/runtime tests.
- Real-model SQL and Mongo integration tests.
- `npm run typecheck`

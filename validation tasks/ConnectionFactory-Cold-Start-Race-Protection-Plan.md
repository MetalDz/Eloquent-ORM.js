# ConnectionFactory Cold-Start Race Protection Plan

## Goal
Prevent duplicate connection creation and adapter creation when multiple callers hit `getConnection()` / `getAdapter()` concurrently on cold start.

## Problem Summary
Cold-start calls could race before cache assignment, causing multiple `connectDB()` calls for the same connection name and potential leaked/overwritten instances.

## Scope
- `src/core/connection/ConnectionFactory.ts`
- Dedicated race-condition tests for connection and adapter initialization

## Work Plan

### Phase 1: Reproduce and Lock with Tests
- [x] Add dedicated test for concurrent `getConnection()` deduplication.
- [x] Add dedicated test for retry behavior after failed init.
- [x] Add dedicated test for concurrent `getAdapter()` deduplication.

### Phase 2: Implement Race Protection
- [x] Add per-connection in-flight promise cache for `getConnection()`.
- [x] Add per-connection in-flight promise cache for `getAdapter()`.
- [x] Ensure failed initialization clears in-flight state for safe retry.
- [x] Ensure close lifecycle handles in-flight initialization safely.

### Phase 3: Validation
- [x] Run targeted connection factory tests.
- [x] Run `npm.cmd run typecheck`.
- [x] Run full `npm.cmd test`.

### Phase 4: Tracking and Notes
- [x] Update `Assumptions.md` status.
- [x] Add release note in `CHANGELOG.md`.

## Progress Log
- `2026-03-06`: Plan created.
- `2026-03-06`: Runtime race-protection implemented in `ConnectionFactory` using in-flight promise caches.
- `2026-03-06`: Dedicated race test file added (`connection.factory.race.logic.test.ts`).
- `2026-03-06`: Targeted connection-factory suites passed (`connection.factory.race`, `connection.factory.alias.lifecycle`, `mongo.connection.lifecycle`).
- `2026-03-06`: `npm.cmd run typecheck` passed.
- `2026-03-06`: Full suite passed (`28 passed`, `3 skipped` suites).

## Exit Criteria
- Only one `connectDB()` call is made for concurrent cold-start requests per connection name.
- `getConnection()` can recover cleanly after failed initialization.
- `getAdapter()` does not duplicate adapter creation under concurrency.
- Typecheck and full test suite pass.

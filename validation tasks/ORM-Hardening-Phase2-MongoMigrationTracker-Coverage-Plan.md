# ORM Hardening Phase 2: MongoMigrationTracker Coverage Plan

Last updated: 2026-03-14  
Status: COMPLETED

## Goal
- Add dedicated runtime coverage for `MongoMigrationTracker` so Mongo migration history, locking, and relink/prune behavior are explicitly pinned.

## Scope
- Cover the exported `MongoMigrationTracker` behavior for:
  - collection/index bootstrap
  - migration lock acquisition/release
  - applied-history reads and batch lookup
  - applied-history writes/deletes
  - checksum hydration
  - relinked generated migrations
  - stale generated create-migration pruning
  - orphaned generated create-migration retention
  - missing/mismatched migration validation failures
- Keep runtime behavior unchanged.

## Files
- `src/cli/utils/migrations/MongoMigrationTracker.ts`
- `src/lab_test/orm.hardening.phase2.mongo-migration-tracker.logic.test.ts`

## Acceptance Criteria
- `MongoMigrationTracker` has dedicated focused tests instead of relying only on command-level mocks.
- Mongo migration history rules are explicit for relink, prune, orphan-keep, and checksum mismatch paths.
- Mongo lock acquisition behavior is pinned for success, same-owner recovery, and contention failure paths.

## Validation
- Focused Jest coverage for the Mongo migration tracker runtime.
- `npm run typecheck`

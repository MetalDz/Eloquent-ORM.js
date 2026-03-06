# Migration Tracker Single-Table Contract Plan

Last updated: 2026-03-06

## Goal
- Refactor migration tracking so the consumer database persists only the `migrations` table for migration history.
- Remove the need for the extra persistent `migration_locks` table in consumer databases.
- Make the tracker intent clearer so generated `create_*_table` migration files are not confused with tracker-owned metadata tables.

## Problem Statement
- Current migration history already lives in the `migrations` table.
- The confusing part is the extra persistent lock table:
  - `migration_locks`
- This makes the tracker look heavier than necessary for package consumers.
- It also makes it easier to misread generated migration names such as:
  - `20260304130722001_create_cligeneratortestartifacts_table.ts`
  as tracker-owned metadata instead of normal schema migration artifacts.

## Current State
- History ledger:
  - `migrations`
- Extra persistent coordination table:
  - `migration_locks`
- File checksums and relink/prune logic still depend on migration files on disk.
- Generated `create_*_table.ts` files are schema source artifacts, not tracker tables.

## Target End State
- Persistent migration metadata in consumer databases:
  - `migrations` only
- Concurrency protection:
  - no persistent `migration_locks` table
- Clear contract:
  - migration files remain the source of schema intent and checksum validation
  - the `migrations` table remains the applied-history ledger

## Ordered Implementation Plan

### Phase 1: Contract and Baseline
- [x] Create this tracking task.
- [x] Add a focused test file:
  - `src/lab_test/migration.tracker.single-table.contract.logic.test.ts`
- [ ] Document the exact current responsibilities of:
  - `migrations`
  - `migration_locks`
  - migration files on disk

### Phase 2: Lock Strategy Abstraction
- [ ] Extract migration locking behind a driver-aware strategy interface.
- [ ] Keep behavior compatible while the abstraction is introduced.

### Phase 3: Replace Persistent Lock Table
- [ ] PostgreSQL:
  - use advisory locks such as `pg_advisory_lock` / `pg_try_advisory_lock`
- [ ] MySQL:
  - use named locks such as `GET_LOCK` / `RELEASE_LOCK`
- [ ] SQLite:
  - use transaction/file locking semantics such as `BEGIN IMMEDIATE`
- [ ] Remove persistent `migration_locks` table creation from tracker bootstrap.

### Phase 4: Compatibility and Cleanup
- [ ] Ensure old installs with an existing `migration_locks` table still work during upgrade.
- [ ] Decide whether the old table is:
  - ignored
  - optionally cleaned up
  - explicitly documented as legacy-only

### Phase 5: Validation and Docs
- [ ] Add active regression tests for the single-table contract.
- [ ] Update migration docs so users understand:
  - `migrations` is the only persistent tracker table
  - migration files remain required for checksum/history validation

## Acceptance Criteria
- `ensureMigrationTables()` creates only the `migrations` table.
- No new consumer-facing persistent lock table is created.
- Migration concurrency protection still works across supported SQL drivers.
- Checksum validation and stale-history pruning still work.
- Existing migration history remains compatible after the refactor.

## Risks
- Locking is driver-specific, so the abstraction must not weaken safety.
- SQLite needs special care because its locking model is not advisory-lock based.
- Removing `migration_locks` too early without a replacement would reintroduce concurrent migration races.

## Validation Strategy
- Keep this task tracked until active tests replace the current TODO contract markers.
- Final validation should cover:
  - bootstrap path
  - concurrent migration protection
  - history checksum validation
  - compatibility with existing `migrations` rows

## Notes
- This task is about removing the extra persistent tracker table, not removing the `migrations` history table.
- The file `20260304130722001_create_cligeneratortestartifacts_table.ts` is a migration artifact example, not a tracker-owned metadata table.

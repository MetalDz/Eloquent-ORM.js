# Migration Tracker Single-Table Contract Plan

Last updated: 2026-03-07
Status: DONE (Closed)

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

## Current State (Post-Refactor)
- History ledger:
  - `migrations`
- Persistent coordination table:
  - none (native locking is used instead)
- Legacy compatibility:
  - existing `migration_locks` tables from older installs may remain on disk and are ignored by runtime
- File checksums and relink/prune logic still depend on migration files on disk.
- Generated `create_*_table.ts` files are schema source artifacts, not tracker tables.

### Historical Baseline Responsibilities (Before Refactor)
- `migrations`:
  - stores applied migration name, batch, run timestamp, and checksum.
  - powers pending detection, rollback ordering, checksum validation, and stale/relinked history handling.
- `migration_locks`:
  - stores a single lock row used for process-level migration concurrency control today.
  - exists only to coordinate migrate run/rollback safety, not migration history.
- migration files on disk:
  - remain source artifacts for schema intent.
  - are used for checksum validation and relink/prune decisions for generated `create_*` / `update_*` files.

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
- [x] Document the exact current responsibilities of:
  - `migrations`
  - `migration_locks`
  - migration files on disk

### Phase 2: Lock Strategy Abstraction
- [x] Extract migration locking behind a driver-aware strategy interface.
- [x] Keep behavior compatible while the abstraction is introduced.

### Phase 3: Replace Persistent Lock Table
- [x] PostgreSQL:
  - use advisory locks such as `pg_advisory_lock` / `pg_try_advisory_lock`
- [x] MySQL:
  - use named locks such as `GET_LOCK` / `RELEASE_LOCK`
- [x] SQLite:
  - use transaction/file locking semantics such as `BEGIN IMMEDIATE`
- [x] Remove persistent `migration_locks` table creation from tracker bootstrap.

### Phase 4: Compatibility and Cleanup
- [x] Ensure old installs with an existing `migration_locks` table still work during upgrade.
- [x] Decide whether the old table is:
  - ignored
  - optionally cleaned up
  - explicitly documented as legacy-only

### Phase 4 Decision (Implemented)
- Runtime policy: **ignore legacy `migration_locks`** table by default.
  - New tracker bootstrap does not create `migration_locks`.
  - Native lock paths (`pg_try_advisory_lock`, `GET_LOCK`, `BEGIN IMMEDIATE`) do not depend on that table.
- Cleanup policy: **optional/manual** (non-breaking).
  - Consumers may drop `migration_locks` after upgrade if they want a clean schema.
  - No automatic destructive cleanup is performed.
- Documentation policy: **legacy-only**.
  - `migration_locks` is documented as a previous implementation artifact, not required by current tracker contract.

### Phase 5: Validation and Docs
- [x] Add active regression tests for the single-table contract.
- [x] Update migration docs so users understand:
  - `migrations` is the only persistent tracker table
  - migration files remain required for checksum/history validation

## Acceptance Criteria
- [x] `ensureMigrationTables()` creates only the `migrations` table.
- [x] No new consumer-facing persistent lock table is created.
- [x] Migration concurrency protection still works across supported SQL drivers.
- [x] Checksum validation and stale-history pruning still work.
- [x] Existing migration history remains compatible after the refactor.

## Risks
- Locking is driver-specific, so the abstraction must not weaken safety.
- SQLite needs special care because its locking model is not advisory-lock based.
- Removing `migration_locks` too early without a replacement would reintroduce concurrent migration races.

## Validation Strategy
- Active regression tests now cover the contract directly.
- Final validation coverage in place:
  - bootstrap path
  - concurrent migration protection
  - history checksum validation
  - compatibility with existing `migrations` rows

## Notes
- This task is about removing the extra persistent tracker table, not removing the `migrations` history table.
- The file `20260304130722001_create_cligeneratortestartifacts_table.ts` is a migration artifact example, not a tracker-owned metadata table.

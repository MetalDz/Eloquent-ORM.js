# ORM Hardening Phase 4: Soft Delete Instance State Plan

Last updated: 2026-03-14  
Status: COMPLETED

## Goal
- Keep soft-delete and restore flows compatible with the newer instance-persistence state used by `fill()`, `save()`, `patch()`, and serialization.

## Scope
- Cover persisted SQL model instances.
- Cover persisted Mongo model instances.
- Ensure soft delete and restore update the in-memory model state and persisted snapshot when the operation targets the current instance.

## Implemented
- Synced `deleted_at` on the current instance after `delete()` and `restore()`.
- Synced the persisted snapshot after soft delete and restore so a follow-up `save()` does not re-issue the same write.
- Marked the current instance as removed after `forceDelete()` when it targets the persisted instance.
- Added runtime coverage for SQL and Mongo persisted instances.

## Acceptance Criteria
- `delete()` updates the current persisted instance state when it targets that instance.
- `restore()` updates the current persisted instance state when it targets that instance.
- A follow-up `save()` after `delete()` or `restore()` does not emit a duplicate write when nothing else changed.

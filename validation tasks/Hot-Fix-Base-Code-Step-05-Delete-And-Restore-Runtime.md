# Hot Fix Base Code Step 05 - Delete And Restore Runtime

Last updated: 2026-03-19
Owner: ORM core maintainers
Status: IN PROGRESS

## Purpose

Land additive loaded-instance delete and soft-delete restore behavior without breaking the existing by-id runtime paths.

## Scope

- add loaded-instance `await model.delete()`
- add loaded soft-delete `await model.restore()`
- keep `delete(id, pk?)` compatibility
- keep `restore(id, pk?)` compatibility
- preserve soft-delete state synchronization on persisted instances

## Out of scope

- `withTrashed().find(...)` chaining
- `deleteById` and `restoreById`
- bulk delete or restore APIs
- docs rewrite for the new public recommendation

## Exit criteria

- persisted SQL and Mongo soft-delete instances support `delete()` and `restore()` with no explicit id
- by-id delete/restore compatibility remains intact
- no soft-delete state tracking regression is introduced

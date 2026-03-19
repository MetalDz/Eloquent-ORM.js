# Hot Fix Base Code Step 05 - Delete And Restore Coverage

Last updated: 2026-03-19
Owner: ORM core maintainers
Status: IN PROGRESS

## Coverage targets

- loaded-instance SQL `delete()`
- loaded-instance Mongo `delete()`
- loaded-instance SQL `restore()`
- loaded-instance Mongo `restore()`
- by-id SQL `delete(id, pk?)`
- by-id Mongo `delete(id, pk?)`
- by-id SQL `restore(id, pk?)`
- by-id Mongo `restore(id, pk?)`
- persisted instance soft-delete state synchronization after delete and restore

## Guard rules

- keep 100% statements, branches, functions, and lines
- keep soft-delete filters and force-delete behavior unchanged
- no regression in `save()` no-op behavior after delete/restore state sync
